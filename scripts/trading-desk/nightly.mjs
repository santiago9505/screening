import path from 'node:path';
import {createHash} from 'node:crypto';
import {universe,chart,pooled,requestJson} from './providers.mjs';
import {dailyMetrics,rankUniverse,classify,listChanges} from './engine.mjs';
import {lastClosedSession,shiftSession,nyParts,closeMinutes,isSession} from './calendar.mjs';
import {readJson,writeJson,stateDir,cacheDir,loadConfig,publish} from './io.mjs';
try{process.loadEnvFile('.env');}catch(error){if(error.code!=='ENOENT')throw error;}
const cfg=await loadConfig(),now=new Date(),session=lastClosedSession(now),nextSession=shiftSession(session);
const previous=await readJson(path.join(stateDir,'state.json'),{days:[],movements:[],alerts:[]});
if(!isSession(nyParts(now).date) && previous.report){await publish(previous);console.log('Festivo o fin de semana; se conserva el último cierre.');process.exit(0);}
if(previous.report?.session===session && previous.report.complete && !previous.report.preview && !process.argv.includes('--force')) {
  await publish(previous);console.log('Sesión ya procesada; publicación reproducida.');process.exit(0);
}
const parts=nyParts(now),preview=parts.date!==session || parts.minutes<closeMinutes(session)+30;
if(preview && previous.report?.session===session && !previous.report.preview){await publish(previous);console.log('Se conserva el análisis ya cerrado.');process.exit(0);}
const scan=await universe();
await writeJson(path.join(cacheDir,session,'universe.json'),{retrievedAt:now.toISOString(),...scan});
const common=scan.rows.filter(r=>['NYSE','NASDAQ','AMEX'].includes(r.exchange) && r.typespecs?.includes('common'));
const eligible=common.filter(r=>Number.isFinite(r.close) && Number.isFinite(r.average_volume_30d_calc) && r.close*r.average_volume_30d_calc>=cfg.minDollarVolume);
console.log(JSON.stringify({session,preview,sourceRows:scan.received,common:common.length,historyRequests:eligible.length}));
const rows=await pooled(eligible,async(v,i)=>{
  try {
    const c=await chart(v.name,cacheDir,session),metrics=dailyMetrics(c,session);
    if(i%200===0) console.log(`Historial ${i+1}/${eligible.length}`);
    return {symbol:v.name,vendor:v,metrics};
  }catch(error){return {symbol:v.name,vendor:v,metrics:{valid:false,reason:error.message}};}
},5);
const benchmarks=await pooled(['SPY','QQQ','IWM','XLE','XLV','XLK','UUP','USO'],async(symbol)=>{
  try{return {symbol,...dailyMetrics(await chart(symbol,cacheDir,session),session)};}catch(error){return {symbol,valid:false,reason:error.message};}
});
const spy=benchmarks.find(r=>r.symbol==='SPY'),qqq=benchmarks.find(r=>r.symbol==='QQQ');
const sectors={};
for(const r of rows.filter(r=>r.metrics.valid)) {
  const name=r.vendor.sector||'Sin sector',s=sectors[name]??={count:0,above50:0,returns:[]};
  s.count++;s.above50+=r.metrics.close>r.metrics.sma50?1:0;
  if(Number.isFinite(r.metrics.return63))s.returns.push(r.metrics.return63);
}
for(const s of Object.values(sectors)){s.breadth=100*s.above50/s.count;s.return63=s.returns.length?s.returns.reduce((a,b)=>a+b,0)/s.returns.length:null;delete s.returns;}
const profiles=await readJson(path.join(stateDir,'ipo-profiles.json'),{});
// Verify potential recent listings with the profile IPO field; firstTradeDate alone is not an IPO date.
for(const r of rows) {
  const m=r.metrics;
  if(!m.valid || !m.firstTradeDate || m.firstTradeDate<`${Number(session.slice(0,4))-8}${session.slice(4)}` ||
    !(r.vendor.total_revenue_yoy_growth_fq>=cfg.minGrowthPct && r.vendor.earnings_per_share_diluted_yoy_growth_fq>=cfg.minGrowthPct)) continue;
  if(!profiles[r.symbol] && process.env.FINNHUB_API_KEY) {
    try {
      const p=await requestJson(`https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(r.symbol)}&token=${encodeURIComponent(process.env.FINNHUB_API_KEY)}`);
      if(/^\d{4}-\d{2}-\d{2}$/.test(p.ipo??''))profiles[r.symbol]={date:p.ipo,source:'Finnhub company profile',checkedAt:now.toISOString()};
    }catch{/* IPO remains unknown; it is never inferred as fact. */}
    await new Promise(resolve=>setTimeout(resolve,1100));
  }
  if(profiles[r.symbol]){r.ipoDate=profiles[r.symbol].date;r.ipoSource=profiles[r.symbol].source;}
}
await writeJson(path.join(stateDir,'ipo-profiles.json'),profiles);
const valid=rows.filter(r=>r.metrics.valid).length;
const complete=scan.complete && valid===rows.length && !!spy?.valid && !!qqq?.valid;
const context={session,nextSession,rs:rankUniverse(rows),sectors,complete:scan.complete&&!!spy?.valid&&!!qqq?.valid&&!preview,
  spyReturn63:spy?.return63??Infinity,marketGood:!!(spy?.valid&&qqq?.valid&&spy.close>spy.sma50&&qqq.close>qqq.sma50)};
const assessed=rows.map(r=>classify(r,context,cfg));
const candidates=assessed.filter(r=>r.bucket!=='removed').sort((a,b)=>(b.rs??-1)-(a.rs??-1));
const movements=listChanges(previous.report?.candidates,candidates,session);
const report={schemaVersion:1,ruleVersion:cfg.version,generatedAt:now.toISOString(),session,nextSession,preview,complete,
  sources:['TradingView Scanner','Yahoo Finance daily OHLCV and adjusted close','Finnhub IPO profile when available'],
  coverage:{sourceTotal:scan.total,sourceReceived:scan.received,common:common.length,liquid:eligible.length,validHistory:valid,failedHistory:rows.length-valid,rsRanked:context.rs.size},
  market:{favorable:context.marketGood,benchmarks,sectors},candidates,
  prices:Object.fromEntries(rows.filter(r=>r.metrics.valid).map(r=>[r.symbol,{close:r.metrics.close,date:session}])),
  risk:{initialCapital:cfg.initialCapital,riskPerTradePct:cfg.riskPerTradePct,annualLossBudgetPct:cfg.annualLossBudgetPct},
  schedule:{nightly:'17:37 America/Bogota, lunes a viernes',monitor:'Cada 5 minutos durante la sesión; puede retrasarse',engine:'GitHub Actions'},
  email:{configured:!!(process.env.RESEND_API_KEY&&process.env.ALERT_EMAIL_FROM&&process.env.ALERT_EMAIL_TO),lastAcceptedAt:previous.report?.email?.lastAcceptedAt??null},
  integrity:createHash('sha256').update(JSON.stringify(rows)).digest('hex')};
const day={date:session,observedAt:report.generatedAt,preview,complete,analyzed:eligible.length,
  buyAlert:candidates.filter(r=>r.bucket==='buy-alert').length,watchlist:candidates.filter(r=>r.bucket==='watchlist').length,
  ipo:candidates.filter(r=>r.bucket==='ipo').length,armed:candidates.filter(r=>r.plan?.armed).length};
const state={...previous,report,days:[...(previous.days??[]).filter(d=>d.date!==session),day].slice(-260),
  movements:[...(previous.movements??[]).filter(m=>!movements.some(n=>n.id===m.id)),...movements].slice(-2000)};
await writeJson(path.join(stateDir,'observations',`${session}-${now.toISOString().replaceAll(':','-')}.json`),{observedAt:now.toISOString(),assessed});
await writeJson(path.join(stateDir,'state.json'),state);
await publish(state);
console.log(JSON.stringify({session,complete,preview,day,failures:rows.filter(r=>!r.metrics.valid).slice(0,10).map(r=>({symbol:r.symbol,reason:r.metrics.reason}))},null,2));
