import path from 'node:path';
import {isMarketOpen,nyParts} from './calendar.mjs';
import {evaluateAlert} from './engine.mjs';
import {quote} from './providers.mjs';
import {sendAlert} from './mailer.mjs';
import {readJson,writeJson,stateDir,loadConfig,publish} from './io.mjs';
try{process.loadEnvFile('.env');}catch(error){if(error.code!=='ENOENT')throw error;}
const cfg=await loadConfig(),now=new Date(),state=await readJson(path.join(stateDir,'state.json'),null);
if(!state?.report){console.log('Esperando primer screening');process.exit(0);}
if(!isMarketOpen(now)){console.log('Mercado cerrado');process.exit(0);}
const dryRun=process.argv.includes('--dry-run');
state.alerts??=[];
const checks=[];
for(const row of state.report.candidates.filter(r=>r.plan?.armed)) {
  const plan=row.plan,id=plan.id;
  const existing=state.alerts.find(a=>a.id===id);
  if(existing?.emailStatus==='accepted' || existing?.emailStatus==='uncertain')continue;
  let result;
  try{result=evaluateAlert(plan,await quote(row.symbol),now,cfg);}catch(error){checks.push({symbol:row.symbol,status:'source-error',reason:error.message});continue;}
  checks.push({symbol:row.symbol,...result});
  if(['invalidated','expired','extended'].includes(result.status)) {
    plan.status=result.status;plan.armed=false;row.bucket='watchlist';row.reason=result.reason??'Plan vencido';
    state.movements.push({id:`${id}:${result.status}`,date:nyParts(now).date,symbol:row.symbol,from:'buy-alert',to:'watchlist',reason:row.reason});
  }
  if(result.status!=='triggered' || dryRun)continue;
  const event=existing??{id,symbol:row.symbol,observedAt:now.toISOString(),...result,emailStatus:'pending'};
  if(existing && existing.emailStatus==='not-configured')Object.assign(event,{observedAt:now.toISOString(),...result});
  if(!existing)state.alerts.push(event);
  // Persist before sending. If execution stops mid-send, require reconciliation rather than duplicate mail.
  event.emailStatus='uncertain';
  await writeJson(path.join(stateDir,'state.json'),state);
  try{
    const sent=await sendAlert(event,plan,cfg);
    event.emailStatus=sent.status;event.deliveryId=sent.deliveryId??null;
    if(sent.status==='accepted')state.report.email.lastAcceptedAt=now.toISOString();
  }catch(error){event.emailError=error.message;}
}
state.monitorStatus={checkedAt:now.toISOString(),dryRun,checks};
state.report.email.configured=!!(process.env.RESEND_API_KEY&&process.env.ALERT_EMAIL_TO&&process.env.ALERT_EMAIL_FROM);
if(!dryRun){await writeJson(path.join(stateDir,'state.json'),state);await publish(state);}
console.log(JSON.stringify({checkedAt:now.toISOString(),dryRun,checked:checks.length,states:checks.map(x=>({symbol:x.symbol,status:x.status}))}));
