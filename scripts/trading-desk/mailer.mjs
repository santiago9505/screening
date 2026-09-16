import {createHash} from 'node:crypto';
export function emailPayload(event,plan,cfg,to,from) {
  return {from,to:[to],subject:`Northstar: ${event.symbol} cumple la alerta de entrada`,text:
    `${event.symbol} cumple el plan ${plan.setupDate}.\n\nCotización observada: USD ${event.price.toFixed(2)} (${event.quoteTime}).\nZona: USD ${plan.trigger.toFixed(2)}–${plan.maxEntry.toFixed(2)}.\nStop de referencia: USD ${plan.stop.toFixed(2)}.\nTamaño piloto máximo: ${event.shares} acciones; riesgo planificado USD ${event.plannedRisk.toFixed(2)}.\n\nSe confirmó precio dentro de zona y volumen acumulado de al menos 1,5 veces el promedio diario de 50 sesiones. Señal experimental, sin compra ejecutada. Comprueba el precio actual, tu capital y la exposición total en IBKR antes de decidir. No persigas el precio si supera el máximo. Un gap puede superar el stop.\n\n${cfg.siteUrl}\nID: ${event.id}`};
}
export async function sendAlert(event,plan,cfg,fetcher=fetch,env=process.env) {
  if(!env.RESEND_API_KEY || !env.ALERT_EMAIL_TO || !env.ALERT_EMAIL_FROM) return {status:'not-configured'};
  const body=emailPayload(event,plan,cfg,env.ALERT_EMAIL_TO,env.ALERT_EMAIL_FROM);
  const key=createHash('sha256').update(event.id).digest('hex');
  const response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,
    'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
  if(!response.ok) throw new Error(`Email provider HTTP ${response.status}`);
  const result=await response.json();
  if(!result.id)throw new Error('Email provider did not return a message id');
  return {status:'accepted',deliveryId:result.id};
}
