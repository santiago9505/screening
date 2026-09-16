// NYSE calendar verified 2026-09-16: https://www.nyse.com/trade/hours-calendars
const holidays = new Set([
  '2026-01-01','2026-01-19','2026-02-16','2026-04-03','2026-05-25','2026-06-19','2026-07-03','2026-09-07','2026-11-26','2026-12-25',
  '2027-01-01','2027-01-18','2027-02-15','2027-03-26','2027-05-31','2027-06-18','2027-07-05','2027-09-06','2027-11-25','2027-12-24',
]);
const early = new Set(['2026-11-27','2026-12-24','2027-11-26']);
export function nyParts(now = new Date()) {
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(x=>[x.type,x.value]));
  return {date:`${p.year}-${p.month}-${p.day}`,minutes:Number(p.hour)*60+Number(p.minute)};
}
export function isSession(date) {
  if(!/^202[67]-\d{2}-\d{2}$/.test(date)) throw new Error('Actualizar calendario NYSE: año sin cobertura');
  const day=new Date(date+'T12:00:00Z').getUTCDay();
  return day!==0 && day!==6 && !holidays.has(date);
}
export const closeMinutes=date=>early.has(date)?780:960;
export function shiftSession(date,direction=1) {
  let d=new Date(date+'T12:00:00Z');
  do {d.setUTCDate(d.getUTCDate()+direction);} while(!isSession(d.toISOString().slice(0,10)));
  return d.toISOString().slice(0,10);
}
export function lastClosedSession(now=new Date()) {
  const p=nyParts(now);
  return isSession(p.date) && p.minutes>=closeMinutes(p.date)+30 ? p.date : shiftSession(p.date,-1);
}
export function isMarketOpen(now=new Date()) {
  const p=nyParts(now);
  return isSession(p.date) && p.minutes>=570 && p.minutes<closeMinutes(p.date);
}
