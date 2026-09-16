import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';
import {dailyMetrics,rankUniverse,classify,evaluateAlert,listChanges} from '../scripts/trading-desk/engine.mjs';
import {lastClosedSession,isMarketOpen,shiftSession} from '../scripts/trading-desk/calendar.mjs';
import {sendAlert} from '../scripts/trading-desk/mailer.mjs';
const cfg=JSON.parse(await readFile('config/trading-desk.json','utf8'));
const compiled=await build({entryPoints:['src/services/tradeJournal.ts'],bundle:true,format:'esm',platform:'node',write:false});
const {emptyJournal,addTrade,replayJournal,visibleBucket}=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
const plan={id:'2026-09-15:TEST',setupDate:'2026-09-15',validDate:'2026-09-16',trigger:50,maxEntry:51,stop:48,shares:1,avgVolume50:1000,requiresVolume:1.5,armed:true,status:'armed'};
const now=new Date('2026-09-16T15:00:00Z');
const q={price:50.3,time:now.getTime()/1000-30,volume:2000,low:49};
test('market calendar handles DST, holidays and early closes',()=>{
  assert.equal(isMarketOpen(new Date('2026-09-16T13:29:00Z')),false);
  assert.equal(isMarketOpen(new Date('2026-09-16T13:30:00Z')),true);
  assert.equal(isMarketOpen(new Date('2026-11-27T18:01:00Z')),false);
  assert.equal(isMarketOpen(new Date('2026-12-25T16:00:00Z')),false);
  assert.equal(shiftSession('2026-12-24'),'2026-12-28');
  assert.equal(lastClosedSession(new Date('2026-09-16T19:59:00Z')),'2026-09-15');
  assert.equal(lastClosedSession(new Date('2026-09-16T20:31:00Z')),'2026-09-16');
});
test('alert requires fresh data, current plan, price, volume and intact stop',()=>{
  assert.equal(evaluateAlert(plan,q,now,cfg).status,'triggered');
  assert.equal(evaluateAlert(plan,{...q,price:50.5},now,cfg).status,'size-blocked');
  assert.equal(evaluateAlert(plan,{...q,volume:1000},now,cfg).status,'waiting');
  assert.equal(evaluateAlert(plan,{...q,time:q.time-900},now,cfg).status,'stale-quote');
  assert.equal(evaluateAlert(plan,{...q,low:47},now,cfg).status,'invalidated');
  assert.equal(evaluateAlert(plan,{...q,price:52},now,cfg).status,'extended');
  assert.equal(evaluateAlert({...plan,validDate:'2026-09-15'},q,now,cfg).status,'expired');
  assert.equal(evaluateAlert({...plan,armed:false},q,now,cfg).status,'blocked');
});
test('missing histories cannot inflate a relative-strength rank',()=>{
  const rows=[{symbol:'A',metrics:{valid:true,totalReturn126:.1}},{symbol:'B',metrics:{valid:true,totalReturn126:.2}},{symbol:'MISSING',metrics:{valid:false}}];
  assert.equal(rankUniverse(rows).get('B'),50);
  assert.equal(rankUniverse(rows).has('MISSING'),false);
});
test('near pivot is a buy-list candidate; deterioration removes it',()=>{
  const context={session:'2026-09-15',nextSession:'2026-09-16',rs:new Map([['TEST',99]]),complete:true,marketGood:true,spyReturn63:.02,sectors:{Tech:{count:100,breadth:70,return63:.1}}};
  const row={symbol:'TEST',vendor:{description:'Test',sector:'Tech',earnings_per_share_diluted_yoy_growth_fq:30,total_revenue_yoy_growth_fq:30,operating_margin:20,net_margin:15,earnings_release_next_date:Date.parse('2026-11-01')/1000},metrics:{valid:true,close:49,sma50:45,trend:true,medianDollarVolume20:20e6,contraction:true,dryVolumeRatio:.5,distanceToPivotPct:2,pivot:50,stop:48,avgVolume50:1000}};
  const ready=classify(row,context,cfg);assert.equal(ready.bucket,'buy-alert');assert.equal(ready.plan.armed,true);
  const bad=classify({...row,metrics:{...row.metrics,close:40,trend:false}},context,cfg);assert.equal(bad.bucket,'removed');
  assert.equal(listChanges([ready],[],context.session)[0].to,'removed');
  const ipo=classify({...row,ipoDate:'2019-09-15',metrics:{...row.metrics,contraction:false}},context,cfg);assert.equal(ipo.bucket,'ipo');
  assert.equal(classify({...row,ipoDate:'2019-09-14',metrics:{...row.metrics,contraction:false}},context,cfg).bucket,'watchlist');
});
test('future and partial bars cannot change frozen daily metrics',()=>{
  const timestamps=Array.from({length:270},(_,i)=>Date.parse('2025-12-20T14:30:00Z')/1000+i*86400);
  const prices=timestamps.map((_,i)=>50+i*.1),chart={meta:{firstTradeDate:timestamps[0]},timestamp:timestamps,indicators:{quote:[{open:prices,close:prices,high:prices.map(p=>p+1),low:prices.map(p=>p-1),volume:prices.map(()=>1000)}],adjclose:[{adjclose:prices}]}};
  const session=new Date(timestamps[260]*1000).toISOString().slice(0,10),before=dailyMetrics(chart,session);
  chart.indicators.quote[0].close[269]=99999;
  assert.deepEqual(dailyMetrics(chart,session),before);
});
test('manual trades move holdings and partial sales correctly, including fees',()=>{
  let journal=emptyJournal();
  journal=addTrade(journal,{id:'b1',symbol:'TEST',side:'buy',quantity:4,price:50,fees:1,at:'2026-09-14T15:00:00Z',note:''});
  journal=addTrade(journal,{id:'s1',symbol:'TEST',side:'sell',quantity:2,price:55,fees:1,at:'2026-09-15T15:00:00Z',note:''});
  let book=replayJournal(journal);assert.equal(book.cash,908);assert.equal(book.realized,8.5);assert.equal(visibleBucket('TEST','buy-alert',book,now),'portfolio');
  journal=addTrade(journal,{id:'s2',symbol:'TEST',side:'sell',quantity:2,price:60,fees:1,at:'2026-09-15T16:00:00Z',note:''});
  book=replayJournal(journal);assert.equal(book.cash,1027);assert.equal(book.realized,27);assert.equal(visibleBucket('TEST','watchlist',book,now),'recent-sold');
  assert.throws(()=>addTrade(journal,{id:'s3',symbol:'TEST',side:'sell',quantity:1,price:60,fees:0,at:'2026-09-15T17:00:00Z',note:''}));
  assert.throws(()=>addTrade(emptyJournal(),{id:'b2',symbol:'TEST',side:'buy',quantity:30,price:50,fees:0,at:'2026-09-15T17:00:00Z',note:''}));
});
test('email never claims successful delivery without a provider acknowledgment',async()=>{
  const event={id:'event',symbol:'TEST',price:50.5,quoteTime:now.toISOString(),shares:1,plannedRisk:2.1};
  assert.equal((await sendAlert(event,plan,cfg,()=>{throw new Error('Must not call network');},{})).status,'not-configured');
  const bodies=[];
  const mock=async(url,options)=>{bodies.push(options);return {ok:true,json:async()=>({id:'message-id'})};};
  const env={RESEND_API_KEY:'test-only',ALERT_EMAIL_FROM:'test@example.com',ALERT_EMAIL_TO:'recipient@example.com'};
  await sendAlert(event,plan,cfg,mock,env);await sendAlert(event,plan,cfg,mock,env);
  assert.equal(bodies[0].headers['Idempotency-Key'],bodies[1].headers['Idempotency-Key']);
  assert.equal(bodies[0].body,bodies[1].body);
  await assert.rejects(()=>sendAlert(event,plan,cfg,async()=>({ok:false,status:503}),env));
});
