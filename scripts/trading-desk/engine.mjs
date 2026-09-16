import {nyParts,shiftSession,isMarketOpen} from './calendar.mjs';
const avg=xs=>xs.reduce((s,x)=>s+x,0)/xs.length;
const highest=xs=>Math.max(...xs.map(x=>x.high));
const lowest=xs=>Math.min(...xs.map(x=>x.low));
const finite=Number.isFinite;
const round=x=>Math.round(x*100)/100;

export function dailyMetrics(chart,session) {
  const q=chart.indicators?.quote?.[0],adjusted=chart.indicators?.adjclose?.[0]?.adjclose;
  if(!q || !chart.timestamp) return {valid:false,reason:'Historial ausente'};
  const bars=chart.timestamp.map((t,i)=>({date:nyParts(new Date(t*1000)).date,
    ...Object.fromEntries(['open','high','low','close','volume'].map(k=>[k,q[k]?.[i]])),adjClose:adjusted?.[i]})).filter(b=>b.date<=session);
  if(bars.length<50 || bars.at(-1).date!==session || bars.some((b,i)=>
    !['open','high','low','close','volume'].every(k=>finite(b[k])) || b.low<=0 || b.volume<0 || b.high<Math.max(b.open,b.close) || b.low>Math.min(b.open,b.close) || (i>0 && bars[i-1].date>=b.date)))
    return {valid:false,reason:'Historial incompleto, inválido o desactualizado'};
  const last=bars.at(-1),sma=n=>bars.length>=n?avg(bars.slice(-n).map(x=>x.close)):null;
  const ranges=[bars.slice(-30,-20),bars.slice(-20,-10),bars.slice(-10)].map(a=>(highest(a)-lowest(a))/highest(a)*100);
  const volume50=avg(bars.slice(-50).map(x=>x.volume));
  const pivot=highest(bars.slice(-20)),stop=lowest(bars.slice(-5));
  const dollars=bars.slice(-20).map(x=>x.close*x.volume).sort((a,b)=>a-b);
  const trend=bars.length>=252 && last.close>sma(50) && sma(50)>sma(150) && sma(150)>sma(200) &&
    sma(200)>avg(bars.slice(-220,-20).map(x=>x.close)) && last.close>=1.25*lowest(bars.slice(-252)) && last.close>=.75*highest(bars.slice(-252));
  return {valid:true,session,close:last.close,changePct:100*(last.close/bars.at(-2).close-1),
    sma20:sma(20),sma50:sma(50),sma200:sma(200),trend,
    medianDollarVolume20:(dollars[9]+dollars[10])/2,
    totalReturn126:bars.length>=127 && finite(last.adjClose) && bars.at(-127).adjClose>0?last.adjClose/bars.at(-127).adjClose-1:null,
    return63:bars.length>=64?last.close/bars.at(-64).close-1:null,
    ranges,contraction:ranges[0]>ranges[1] && ranges[1]>ranges[2] && ranges[2]<=8,
    dryVolumeRatio:volume50>0?avg(bars.slice(-5).map(x=>x.volume))/volume50:null,
    pivot:round(pivot),stop:round(stop),avgVolume50:volume50,distanceToPivotPct:100*(pivot/last.close-1),
    firstTradeDate:finite(chart.meta.firstTradeDate)?new Date(chart.meta.firstTradeDate*1000).toISOString().slice(0,10):null,
    historyLength:bars.length};
}

export function rankUniverse(rows) {
  const ranked=rows.filter(r=>r.metrics.valid && finite(r.metrics.totalReturn126)).sort((a,b)=>a.metrics.totalReturn126-b.metrics.totalReturn126);
  const result=new Map();
  for(let i=0;i<ranked.length;i++) {
    let j=i;
    while(j+1<ranked.length && ranked[j+1].metrics.totalReturn126===ranked[i].metrics.totalReturn126) j++;
    // Conservative percentile: unknown histories count above this stock, never below it.
    const percentile=rows.length>1?100*((i+j)/2)/(rows.length-1):null;
    for(let k=i;k<=j;k++) result.set(ranked[k].symbol,percentile);
    i=j;
  }
  return result;
}

export function classify(row,context,cfg) {
  const m=row.metrics,rs=context.rs.get(row.symbol)??null;
  const eps=row.vendor.earnings_per_share_diluted_yoy_growth_fq,sales=row.vendor.total_revenue_yoy_growth_fq;
  const growth=[eps,sales,row.vendor.operating_margin,row.vendor.net_margin].every(finite) &&
    eps>=cfg.minGrowthPct && sales>=cfg.minGrowthPct && row.vendor.operating_margin>0 && row.vendor.net_margin>0;
  const ipoDate=row.ipoDate??null;
  const anniversary=new Date(context.session+'T12:00:00Z');anniversary.setUTCFullYear(anniversary.getUTCFullYear()-cfg.maxIpoYears);
  const isIpo=ipoDate!==null && ipoDate<=context.session && ipoDate>=anniversary.toISOString().slice(0,10);
  const promising=m.valid && growth && m.close>=cfg.minPrice && m.medianDollarVolume20>=cfg.minDollarVolume && m.close>m.sma50 && (m.trend || isIpo);
  const sector=context.sectors[row.vendor.sector];
  const sectorGood=!!sector && sector.count>=5 && sector.breadth>=50 && sector.return63>context.spyReturn63;
  const earnings=finite(row.vendor.earnings_release_next_date)?new Date(row.vendor.earnings_release_next_date*1000).toISOString().slice(0,10):null;
  const earningsDays=earnings?(Date.parse(earnings)-Date.parse(context.nextSession))/86400000:null;
  const near=promising && m.trend && rs!==null && rs>=cfg.minRsPercentile && m.contraction && m.dryVolumeRatio!==null && m.dryVolumeRatio<.7 && m.distanceToPivotPct<=cfg.nearPivotPct;
  const trigger=m.valid?round(m.pivot+.01):null;
  const maxEntry=trigger?round(Math.min(m.pivot*(1+cfg.maxChasePct/100),m.stop/(1-cfg.maxStopPct/100))):null;
  const stopPct=trigger?100*(trigger-m.stop)/trigger:null;
  const perShare=trigger?trigger-m.stop+(trigger+m.stop)*cfg.oneWayCostBps/10000:null;
  const shares=perShare>0?Math.max(0,Math.floor(Math.min(cfg.initialCapital*cfg.riskPerTradePct/100/perShare,cfg.initialCapital*cfg.maxPositionPct/100/(trigger*(1+cfg.oneWayCostBps/10000))))):0;
  const blockers=[];
  if(!context.complete) blockers.push(context.preview?'Esperar el análisis al cierre':'Cobertura incompleta del universo');
  if(!m.valid) blockers.push(m.reason);
  if(!growth) blockers.push('Fundamentales insuficientes o fuera del filtro');
  if(!m.trend) blockers.push('No cumple tendencia completa');
  if(rs===null || rs<cfg.minRsPercentile) blockers.push('RS por debajo de 90 o sin cobertura');
  if(!m.contraction || !finite(m.dryVolumeRatio) || !(m.dryVolumeRatio<.7)) blockers.push('Falta contracción de precio/volumen');
  if(m.distanceToPivotPct>cfg.nearPivotPct) blockers.push('Lejos del punto de compra');
  if(!context.marketGood) blockers.push('Contexto general defensivo');
  if(!sectorGood) blockers.push('Sector sin liderazgo confirmado');
  if(earningsDays===null || earningsDays<=cfg.earningsBufferDays) blockers.push('Resultados próximos o fecha sin confirmar');
  if(stopPct===null || stopPct<cfg.minStopPct || stopPct>cfg.maxStopPct || maxEntry<trigger) blockers.push('Stop fuera del rango permitido');
  if(!shares) blockers.push('No cabe una acción entera en el riesgo piloto');
  const bucket=near?'buy-alert':promising?(isIpo?'ipo':'watchlist'):'removed';
  const setupReasons=blockers.filter(b=>b.startsWith('RS ') || b.startsWith('Falta contracción') || b.startsWith('Lejos del') || b.startsWith('No cumple tendencia'));
  return {symbol:row.symbol,name:row.vendor.description,sector:row.vendor.sector,bucket,rs,
    metrics:m,epsGrowth:finite(eps)?eps:null,salesGrowth:finite(sales)?sales:null,
    ipoDate,ipoSource:row.ipoSource??null,firstTradeDate:m.firstTradeDate??null,isIpo,
    earningsDate:earnings,sectorGood,blockers,
    plan:near?{id:`${context.session}:${row.symbol}`,setupDate:context.session,validDate:context.nextSession,
      trigger,maxEntry,stop:m.stop,shares,plannedRisk:round(shares*perShare),avgVolume50:m.avgVolume50,
      armed:blockers.length===0,requiresVolume:1.5,status:blockers.length?'blocked':'armed'}:null,
    reason:bucket==='buy-alert'?'Cerca del pivot con contracción; revisar condiciones de activación':
      promising?(setupReasons.slice(0,2).join('. ')||'Patrón en desarrollo; revisar condiciones de activación'):blockers.filter(b=>!b.startsWith('Esperar el')).slice(0,2).join('. ')};
}

export function evaluateAlert(plan,quote,now,cfg) {
  if(!plan.armed || plan.status!=='armed') return {status:'blocked'};
  if(!isMarketOpen(now)) return {status:'outside-session'};
  const today=nyParts(now).date;
  if(today!==plan.validDate) return {status:today>plan.validDate?'expired':'waiting'};
  if(!quote || ![quote.price,quote.time,quote.volume,quote.low].every(finite)) return {status:'missing-data'};
  const age=now.getTime()/1000-quote.time;
  if(age<0 || age>cfg.maxQuoteAgeSeconds || nyParts(new Date(quote.time*1000)).date!==today) return {status:'stale-quote'};
  if(quote.low<=plan.stop) return {status:'invalidated',reason:'El precio perforó el stop antes de activar la alerta'};
  if(quote.price>plan.maxEntry) return {status:'extended',reason:'Precio por encima del máximo; no perseguir'};
  if(quote.price<plan.trigger || quote.volume<plan.avgVolume50*plan.requiresVolume) return {status:'waiting'};
  const riskPerShare=quote.price-plan.stop+(quote.price+plan.stop)*cfg.oneWayCostBps/10000;
  const shares=Math.min(plan.shares,Math.floor(cfg.initialCapital*cfg.riskPerTradePct/100/riskPerShare));
  if(shares<1) return {status:'size-blocked'};
  return {status:'triggered',price:quote.price,quoteTime:new Date(quote.time*1000).toISOString(),shares,
    plannedRisk:round(shares*riskPerShare)};
}

export function listChanges(previous,current,session) {
  const prior=new Map((previous??[]).map(x=>[x.symbol,x])),next=new Map(current.map(x=>[x.symbol,x]));
  return [...new Set([...prior.keys(),...next.keys()])].flatMap(symbol=>{
    const a=prior.get(symbol),b=next.get(symbol),from=a?.bucket??'removed',to=b?.bucket??'removed';
    return from===to?[]:[{id:`${session}:${symbol}:${from}:${to}`,date:session,symbol,from,to,
      reason:b?.reason??'Ya no supera el universo elegible o faltan datos'}];
  });
}
