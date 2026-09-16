import path from 'node:path';
import {createHash} from 'node:crypto';
import {readJson,writeJson,stateDir,loadConfig,publish} from './io.mjs';
const cfg=await loadConfig();
if(!process.env.RESEND_API_KEY || !process.env.ALERT_EMAIL_TO || !process.env.ALERT_EMAIL_FROM)throw new Error('Faltan RESEND_API_KEY, ALERT_EMAIL_FROM o ALERT_EMAIL_TO');
const id=`northstar-email-setup-${new Date().toISOString().slice(0,10)}`;
const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':createHash('sha256').update(id).digest('hex')},
  body:JSON.stringify({from:process.env.ALERT_EMAIL_FROM,to:[process.env.ALERT_EMAIL_TO],subject:'Northstar: prueba de alertas de acciones',text:`Este es un correo de configuración, no una señal de compra.\n\nLas alertas se enviarán cuando un plan vigente cumpla precio, volumen y controles de calidad. Las órdenes las ejecutas tú en IBKR.\n\n${cfg.siteUrl}`}),signal:AbortSignal.timeout(20000)});
if(!response.ok)throw new Error(`Email provider HTTP ${response.status}`);
const result=await response.json();if(!result.id)throw new Error('Proveedor sin identificador de envío');
const state=await readJson(path.join(stateDir,'state.json'),null);
if(state?.report){state.report.email={...state.report.email,configured:true,lastTestAcceptedAt:new Date().toISOString()};await writeJson(path.join(stateDir,'state.json'),state);await publish(state);}
console.log('Correo de prueba aceptado por el proveedor. La recepción debe confirmarse en el buzón.');
