import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
export const columns=['name','description','exchange','typespecs','sector','industry','close','average_volume_30d_calc','SMA50',
  'earnings_per_share_diluted_yoy_growth_fq','total_revenue_yoy_growth_fq','operating_margin','net_margin','earnings_release_next_date','first_bar_time'];
export async function requestJson(url,options={}) {
  for(let attempt=0;attempt<3;attempt++) {
    const response=await fetch(url,{...options,headers:{'User-Agent':'Northstar-Research/1.0',...options.headers},signal:AbortSignal.timeout(30000)});
    if(response.ok) return response.json();
    if(![429,500,502,503,504].includes(response.status) || attempt===2) throw new Error(`HTTP ${response.status} (${new URL(url).hostname})`);
    await new Promise(resolve=>setTimeout(resolve,2000*(attempt+1)));
  }
}
export async function universe() {
  const rows=[];let total=0;
  for(let start=0;start<15000;start+=1000) {
    const body=await requestJson('https://scanner.tradingview.com/america/scan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({columns,
      filter:[{left:'type',operation:'equal',right:'stock'},{left:'close',operation:'greater',right:10}],
      markets:['america'],symbols:{query:{types:[]},tickers:[]},sort:{sortBy:'name',sortOrder:'asc'},range:[start,start+1000]})});
    if(!Array.isArray(body.data)) throw new Error('Invalid scanner response');
    total=body.totalCount;
    rows.push(...body.data.map(r=>({id:r.s,...Object.fromEntries(columns.map((k,i)=>[k,r.d[i]]))})));
    if(rows.length>=total || body.data.length===0) break;
  }
  const unique=[...new Map(rows.map(r=>[r.id,r])).values()];
  return {total,received:unique.length,complete:unique.length===total,rows:unique};
}
export async function chart(symbol,cacheDir,session,{fresh=false}={}) {
  const providerSymbol=symbol.replace(/\.([AB])$/,'-$1');
  const file=path.join(cacheDir,`${symbol.replace(/[^A-Za-z0-9._-]/g,'_')}.json`);
  if(!fresh) {try{const c=JSON.parse(await readFile(file,'utf8'));if(c.session===session && c.chart.meta.symbol===providerSymbol)return c.chart;}catch{}}
  const b=await requestJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(providerSymbol)}?range=2y&interval=1d&events=div%2Csplits`);
  const c=b.chart?.result?.[0];
  if(!c?.timestamp || c.meta.currency!=='USD' || c.meta.symbol!==providerSymbol) throw new Error('Invalid chart or currency');
  await mkdir(cacheDir,{recursive:true});
  await writeFile(file,JSON.stringify({session,retrievedAt:new Date().toISOString(),chart:c}));
  return c;
}
export async function quote(symbol) {
  const providerSymbol=symbol.replace(/\.([AB])$/,'-$1');
  const b=await requestJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(providerSymbol)}?range=1d&interval=1m`);
  const c=b.chart?.result?.[0],m=c?.meta;
  if(!m || m.symbol!==providerSymbol || m.currency!=='USD') throw new Error('Invalid quote');
  return {price:m.regularMarketPrice,time:m.regularMarketTime,volume:m.regularMarketVolume,low:m.regularMarketDayLow};
}
export async function pooled(items,fn,concurrency=5) {
  const out=new Array(items.length);let cursor=0;
  await Promise.all(Array.from({length:concurrency},async()=>{while(cursor<items.length){const i=cursor++;out[i]=await fn(items[i],i);}}));
  return out;
}
