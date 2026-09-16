import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import path from 'node:path';
export async function readJson(file,fallback) {
  try{return JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code==='ENOENT')return fallback;throw error;}
}
export async function writeJson(file,value) {
  await mkdir(path.dirname(file),{recursive:true});
  const temporary=file+'.tmp';
  await writeFile(temporary,JSON.stringify(value,null,2));
  await rename(temporary,file);
}
export const stateDir=path.resolve(process.env.TRADING_STATE_DIR||'.cache/trading-desk-state');
export const cacheDir=path.resolve('.cache/trading-desk-history');
export const loadConfig=()=>readJson('config/trading-desk.json');
export async function publish(state) {
  // Only market research is published. No address, credential or personal trade ledger.
  const {report,days=[],movements=[],alerts=[],monitorStatus}=state;
  if(!report) throw new Error('No report to publish');
  await writeJson('public/data/trading-desk.json',{...report,days,movements,
    alerts:alerts.map(({deliveryId,...alert})=>alert),monitorStatus:monitorStatus??null});
}
