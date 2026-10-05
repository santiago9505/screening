import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ArrowDownRight, ArrowUpRight, BarChart3, Bell, Check, ChevronLeft, ChevronRight, Download, History, Plus, RefreshCw, Upload, X } from 'lucide-react';
import { DeskBucket, DeskCandidate, DeskReport, Journal } from '../types/tradingDesk';
import { addTrade, emptyJournal, JOURNAL_KEY, replayJournal, visibleBucket } from '../services/tradeJournal';
import { deskActivity, deskNavigationIndex, loadDeskReport, newestDeskReport } from '../services/deskActivity';
import TradingViewChart from './TradingViewChart';
import './TradingDesk.css';

const names:Record<string,string>={'buy-alert':'Buy Alert',watchlist:'Watchlist','recent-sold':'Recent Sold',ipo:'IPO',portfolio:'Portafolio',removed:'Fuera de listas'};
const descriptions:Record<DeskBucket,string>={'buy-alert':'Cerca del punto de compra. La alerta exige que se cumplan todas las condiciones.',watchlist:'Empresas prometedoras que todavía necesitan desarrollar su patrón.','recent-sold':'Ventas completas registradas en los últimos 30 días. Una venta parcial conserva la posición.',ipo:'Salidas a bolsa de siete años o menos, con fecha de IPO disponible y calidad suficiente.',portfolio:'Tus compras registradas. Ningún cambio de lista ejecuta una orden en IBKR.'};
const money=(n:number|undefined|null)=>typeof n==='number'&&Number.isFinite(n)?n.toLocaleString('en-US',{style:'currency',currency:'USD'}):'—';
const pct=(n:number|undefined|null)=>typeof n==='number'&&Number.isFinite(n)?`${n.toFixed(1)}%`:'—';
const date=(d:string)=>new Date(d.length===10?d+'T12:00:00Z':d).toLocaleDateString('es-CO',{day:'numeric',month:'short'});
const localDateTime=()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);
const stamp=(d:string)=>new Date(d).toLocaleString('es-CO',{timeZone:'America/Bogota',dateStyle:'short',timeStyle:'short'});
const emptyRow=(symbol:string):DeskCandidate=>({symbol,name:'Operación registrada',sector:'Sin sector',bucket:'removed',rs:null,metrics:{valid:false},epsGrowth:null,salesGrowth:null,ipoDate:null,ipoSource:null,firstTradeDate:null,isIpo:false,earningsDate:null,sectorGood:false,blockers:['Sin cotización en el último screening'],plan:null,reason:'Conservada por tu registro de operaciones'});

export default function TradingDesk() {
  const [report,setReport]=useState<DeskReport|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  const [bucket,setBucket]=useState<DeskBucket>('buy-alert'),[selected,setSelected]=useState<string|null>(null),[query,setQuery]=useState('');
  const [journal,setJournal]=useState<Journal>(emptyJournal),[journalError,setJournalError]=useState(''),[journalReady,setJournalReady]=useState(false);
  const [formOpen,setFormOpen]=useState(false),[notice,setNotice]=useState(''),[historyOpen,setHistoryOpen]=useState(false);
  const [now,setNow]=useState(()=>new Date()),[remoteAvailable,setRemoteAvailable]=useState(true);
  const importRef=useRef<HTMLInputElement>(null);
  const deskRef=useRef<HTMLElement>(null),listRef=useRef<HTMLDivElement>(null);
  const refreshing=useRef(false),mounted=useRef(false),keyboardSelection=useRef(false);
  const [draft,setDraft]=useState({symbol:'',side:'buy' as 'buy'|'sell',quantity:'',price:'',fees:'0',at:localDateTime(),note:''});
  async function refresh() {
    if(refreshing.current)return;
    refreshing.current=true;
    setLoading(true);
    setNow(new Date());
    const base=import.meta.env.BASE_URL;
    const urls=[`https://raw.githubusercontent.com/santiago9505/screening/trading-data/public.json?t=${Math.floor(Date.now()/60000)}`,`${base}data/trading-desk.json`];
    try{
      const next=await loadDeskReport(urls);
      if(mounted.current){setReport(previous=>newestDeskReport(previous,next.report));setRemoteAvailable(next.remoteAvailable);setError('');}
    }catch(e){if(mounted.current)setError((e as Error).message);}finally{refreshing.current=false;if(mounted.current)setLoading(false);}
  }
  useEffect(()=>{mounted.current=true;void refresh();const timer=window.setInterval(()=>void refresh(),60000);return()=>{mounted.current=false;window.clearInterval(timer);};},[]);
  useEffect(()=>{try{const raw=localStorage.getItem(JOURNAL_KEY);if(raw){const parsed=JSON.parse(raw);replayJournal(parsed);setJournal(parsed);}setJournalReady(true);}catch{setJournalError('No se pudo leer el registro local. No se sobrescribió. Recupera una copia válida antes de registrar operaciones.');}},[]);
  const book=useMemo(()=>replayJournal(journal),[journal]);
  const rows=useMemo(()=>{
    const map=new Map((report?.candidates??[]).map(r=>[r.symbol,r]));
    for(const p of [...book.positions,...book.sold])if(!map.has(p.symbol))map.set(p.symbol,emptyRow(p.symbol));
    return [...map.values()].map(r=>({...r,bucket:visibleBucket(r.symbol,r.bucket,book)}));
  },[report,book]);
  const visible=useMemo(()=>rows.filter(r=>r.bucket===bucket&&`${r.symbol} ${r.name}`.toLowerCase().includes(query.toLowerCase())),[rows,bucket,query]);
  const active=visible.find(r=>r.symbol===selected)??visible[0];
  const activeIndex=visible.findIndex(r=>r.symbol===active?.symbol);
  const activity=report?deskActivity(report,now):null;
  const selectAdjacent=(direction:number)=>{const row=visible[activeIndex+direction];if(row){keyboardSelection.current=true;setSelected(row.symbol);}};
  useEffect(()=>{
    const onKeyDown=(event:KeyboardEvent)=>{
      if(formOpen||event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.isComposing)return;
      const target=event.target;
      if(target instanceof Element){
        if(target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="dialog"],.desk-chart-surface'))return;
        if(target.closest('button,a,summary,[role="button"]')&&!target.closest('.desk-stock'))return;
        if(target!==document.body&&!deskRef.current?.contains(target))return;
      }
      const index=deskNavigationIndex(activeIndex,visible.length,event.code,event.shiftKey);
      if(index<0)return;
      event.preventDefault();keyboardSelection.current=true;setSelected(visible[index].symbol);
    };
    window.addEventListener('keydown',onKeyDown);
    return()=>window.removeEventListener('keydown',onKeyDown);
  },[activeIndex,visible,formOpen]);
  useEffect(()=>{
    const row=listRef.current?.querySelector<HTMLButtonElement>('[aria-current="true"]');
    if(keyboardSelection.current){row?.focus({preventScroll:true});row?.scrollIntoView({block:'nearest'});keyboardSelection.current=false;}
  },[active?.symbol]);
  const marks=book.positions.map(p=>({...p,mark:report?.prices[p.symbol]?.close??null}));
  const missingMarks=marks.some(p=>p.mark===null);
  const equity=book.cash+marks.reduce((s,p)=>s+(p.mark??p.averagePrice)*p.quantity,0);
  const save=(next:Journal)=>{replayJournal(next);localStorage.setItem(JOURNAL_KEY,JSON.stringify(next));setJournal(next);setJournalReady(true);setJournalError('');};
  const exportJournal=()=>{const blob=new Blob([JSON.stringify(journal,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`northstar-operaciones-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);};
  return <section ref={deskRef} className="trading-desk" aria-label="Seguimiento de acciones">
    <div className="desk-heading"><div><h2>Tu mesa de seguimiento</h2><p>{report?`Sesión ${date(report.session)} · Próxima sesión ${date(report.nextSession)}`:'Preparando el seguimiento diario'}</p></div>
      <div className="desk-actions"><button onClick={()=>{setFormOpen(true);setDraft({...draft,symbol:active?.symbol??'',at:localDateTime()});}} disabled={!journalReady}><Plus size={15}/> Registrar operación</button><button onClick={()=>void refresh()} disabled={loading} aria-label="Actualizar seguimiento"><RefreshCw size={15} className={loading?'animate-spin':''}/></button></div></div>
    {error&&<p className="desk-warning" role="alert">{error}</p>}
    {journalError&&<p className="desk-warning" role="alert">{journalError}</p>}
    <div className="desk-status-strip">
      <span className={report?.market.favorable?'good':'caution'}><span className="desk-dot"/>{report?.market.favorable?'Contexto favorable':'Contexto defensivo'}</span>
      <span>{report?.coverage.validHistory.toLocaleString('es-CO')??'—'} historiales / {report?.coverage.liquid.toLocaleString('es-CO')??'—'} elegibles</span>
      <span className={report?.email.configured?'good':'caution'}><Bell size={13}/>{report?.email.configured?'Correo configurado':'Correo pendiente de configuración'}</span>
    </div>
    {report&&activity&&<div className="desk-activity" aria-label="Actividad del seguimiento">
      <div><small>Último screening</small><b>{stamp(report.generatedAt)}</b><span className={activity.outdated||report.preview?'caution':'good'}>{activity.outdated?'Falta un cierre reciente':report.preview?'Captura preliminar':`Cierre del ${date(report.session)}`}</span></div>
      <div><small>Última revisión del monitor</small><b>{report.monitorStatus?stamp(report.monitorStatus.checkedAt):'Sin comprobaciones'}</b><span className={!activity.calendarKnown||activity.marketOpen&&!activity.monitorRecent?'caution':''}>{!activity.calendarKnown?'Calendario por actualizar':activity.marketOpen?activity.monitorRecent?'Revisión reciente':'Sin señal reciente; revisar ejecuciones':'Fuera de sesión regular'}</span></div>
      <div><small>Movimientos del último cierre</small><b>{activity.changes} cambios de lista</b><span>{activity.changes?'Entradas, salidas y cambios guardados abajo':'Las listas conservaron sus integrantes'}</span></div>
      <div><small>Planes con alerta preparada</small><b>{activity.armed}</b><span>{activity.armed?`${report.monitorStatus?.checks.length??0} comprobaciones en la última revisión`:'Ninguna candidata cumple todas las condiciones'}</span></div>
    </div>}
    {!remoteAvailable&&<p className="desk-warning">No se pudo consultar la publicación de GitHub. Se conserva la información más reciente disponible; revisa sus fechas.</p>}
    {(report?.preview||activity?.outdated||report&&!report.complete)&&<p className="desk-warning"><AlertCircle size={15}/>{activity?.outdated?'Falta un análisis reciente: revisa la fecha antes de usar un nivel.':report?.preview?'Captura preliminar: los planes no están activos hasta el análisis al cierre.':`Cobertura parcial: ${report?.coverage.failedHistory} acciones sin historial válido; no generan alertas y reducen el percentil RS.`}</p>}
    <details className="desk-account-summary"><summary>Cuenta registrada <b>{money(equity)}</b><span>Ver desempeño y riesgo</span></summary>
    <div className="desk-account"><div><small>Patrimonio {missingMarks?'estimado':''}</small><strong>{money(equity)}</strong></div><div><small>Efectivo registrado</small><b>{money(book.cash)}</b></div><div><small>Resultado total</small><b className={equity>=1000?'good':'bad'}>{money(equity-1000)}</b></div><div><small>Realizado</small><b>{money(book.realized)}</b></div><div><small>Riesgo piloto / operación</small><b>$2.50</b></div><div><small>Presupuesto de pérdida anual</small><b>$50.00</b></div></div>
    <p className="desk-account-note">Registro manual en este navegador; sin sincronización con IBKR ni con el monitor de correo. {missingMarks?'Posiciones sin precio valoradas al costo. ':''}El presupuesto de pérdida no garantiza un límite ante gaps.</p>
    </details>
    <nav className="desk-tabs" aria-label="Listas de seguimiento">{(Object.keys(descriptions) as DeskBucket[]).map(key=><button key={key} aria-pressed={bucket===key} onClick={()=>{setBucket(key);setSelected(null);setQuery('');}} className={bucket===key?'active':''}>{names[key]}<span>{rows.filter(r=>r.bucket===key).length}</span></button>)}</nav>
    <div className="desk-list-heading"><p>{descriptions[bucket]}</p><input aria-label="Buscar acción" placeholder="Buscar símbolo o empresa" value={query} onChange={e=>setQuery(e.target.value)}/></div>
    <div className="desk-workspace">
      <div className="desk-symbols"><div className="desk-symbols-heading"><span>Acción / precio al cierre</span><span>RS mínimo</span></div>
        <div ref={listRef} className="desk-stock-list" aria-label={`Acciones en ${names[bucket]}`}>
          {visible.map(row=><button key={row.symbol} className="desk-stock" aria-current={active?.symbol===row.symbol?'true':undefined} onClick={()=>setSelected(row.symbol)}>
            <span className="desk-stock-name"><strong>{row.symbol}</strong><small>{row.name}</small></span>
            <span className="desk-stock-price">{money(report?.prices[row.symbol]?.close??row.metrics.close)}<small className={(row.metrics.changePct??0)>=0?'good':'bad'}>{pct(row.metrics.changePct)}</small></span>
            <span className="desk-stock-rank">{row.rs?.toFixed(1)??'—'}</span>
            <span className="desk-stock-state"><span className={`desk-label ${row.plan?.armed?'ready':''}`}>{bucket==='portfolio'?!row.metrics.valid?'Sin cobertura':row.metrics.trend?'En seguimiento':'Revisar deterioro':bucket==='recent-sold'?'Venta registrada':row.plan?.armed?'Alerta preparada':row.plan?'Condiciones pendientes':row.isIpo?'IPO ≤7 años':'En formación'}</span><small>Al pivot {pct(row.metrics.distanceToPivotPct)}</small></span>
          </button>)}
          {!visible.length&&<div className="desk-empty"><Bell size={25}/><h3>{loading?'Cargando listas…':query?'Sin coincidencias':`Sin acciones en ${names[bucket]}`}</h3><p>{query?'Prueba otro símbolo o nombre.':bucket==='portfolio'?'Registra una compra ejecutada para empezar a medir el desempeño.':bucket==='recent-sold'?'Las ventas completas que registres aparecerán aquí.':'Las acciones aparecerán cuando cumplan los criterios. No se fuerzan candidatas.'}</p>{bucket==='buy-alert'&&rows.some(r=>r.bucket==='watchlist')&&<button className="desk-browse" onClick={()=>{setBucket('watchlist');setQuery('');setSelected(null);}}>Explorar Watchlist</button>}</div>}
        </div>
        <p className="desk-keyboard-hint"><kbd>Espacio</kbd> siguiente <kbd>↑</kbd><kbd>↓</kbd> navegar</p>
      </div>
      <section className="desk-chart" aria-label="Gráfico integrado">
        <div className="desk-chart-heading"><div><strong>{active?`${active.symbol} · ${active.name}`:'Gráfico de seguimiento'}</strong><small>{active?`${active.sector} · ${activeIndex+1} de ${visible.length}`:'Selecciona una acción de tus listas'}</small></div><div className="desk-chart-navigation"><button aria-label="Acción anterior" disabled={activeIndex<=0} onClick={()=>selectAdjacent(-1)}><ChevronLeft size={16}/></button><button aria-label="Acción siguiente" disabled={activeIndex<0||activeIndex>=visible.length-1} onClick={()=>selectAdjacent(1)}><ChevronRight size={16}/></button></div></div>
        <div className="desk-chart-surface">{active?<TradingViewChart symbol={active.symbol} theme="dark"/>:<div className="desk-empty"><BarChart3 size={34}/><h3>Revisa cada patrón aquí</h3><p>Elige una lista con acciones para ver su gráfico de TradingView, sin salir de Seguimiento.</p></div>}</div>
        <p className="desk-chart-caption">Gráfico de TradingView · Niveles y listas calculados al cierre. Para navegar con el teclado después de usar el gráfico, vuelve a seleccionar una acción de la lista.</p>
      </section>
    </div>
    {active&&<aside className="desk-detail" aria-label={`Análisis de ${active.symbol}`}><div className="desk-detail-title"><div><h3>{active.symbol}</h3><p>{active.sector}</p></div></div><p>{active.reason}</p>
      <div className="desk-levels"><div><small>Entrada desde</small><b>{money(active.plan?.trigger??(active.metrics.pivot?active.metrics.pivot+.01:null))}</b></div><div><small>Máximo de entrada</small><b>{money(active.plan?.maxEntry)}</b></div><div><small>Stop de referencia</small><b>{money(active.plan?.stop??active.metrics.stop)}</b></div><div><small>Acciones piloto</small><b>{active.plan?.shares??'—'}</b></div></div>
      <p className="desk-caption">{active.plan?`Plan válido únicamente el ${date(active.plan.validDate)}. Confirmación de precio y volumen; no es una orden.`:'Niveles de estudio; todavía no existe un plan activo.'}</p>
      <dl><div><dt>Ventas trimestrales interanuales</dt><dd>{pct(active.salesGrowth)}</dd></div><div><dt>EPS trimestral interanual</dt><dd>{pct(active.epsGrowth)}</dd></div><div><dt>Sector con fuerza</dt><dd>{active.sectorGood?'Sí':'Pendiente'}</dd></div><div><dt>Próximos resultados</dt><dd>{active.earningsDate?date(active.earningsDate):'Sin confirmar'}</dd></div><div><dt>Fecha IPO</dt><dd>{active.ipoDate?date(active.ipoDate)+' '+active.ipoDate.slice(0,4):'Sin verificar'}</dd></div></dl>
      {active.blockers.length>0&&<div className="desk-blockers"><h4>Qué falta / qué cambió</h4>{active.blockers.map(b=><p key={b}><AlertCircle size={12}/>{b}</p>)}</div>}
      {bucket==='portfolio'&&marks.filter(p=>p.symbol===active.symbol).map(p=><p key={p.symbol} className="desk-caption">{p.quantity} acciones · costo medio {money(p.averagePrice)} · resultado abierto {p.mark===null?'Sin precio':money((p.mark-p.averagePrice)*p.quantity)}</p>)}
    </aside>}
    <div className="desk-bottom"><section><h3><History size={16}/> Movimientos de las listas</h3>{(report?.movements??[]).slice(-12).reverse().map(m=><div className="desk-movement" key={m.id}><span>{date(m.date)}</span><b>{m.symbol}</b><span>{names[m.from]??m.from} <ChevronRight size={11}/> {names[m.to]??m.to}</span><p>{m.reason}</p></div>)}{!report?.movements.length&&<p className="desk-caption">Cada cambio de lista dejará su fecha y motivo.</p>}</section>
      <section><h3>Registro diario</h3><div className="desk-days">{report?.days.slice(-8).reverse().map(d=><div key={d.date}><b>{date(d.date)}</b><span>{d.analyzed} analizadas</span><span>{d.buyAlert} Buy Alert</span><small>{d.preview?'Captura inicial':d.complete?'Cierre completo':'Revisar cobertura'}</small></div>)}</div><h3>Alertas observadas</h3>{report?.alerts.slice(-5).reverse().map(a=><p key={a.id} className="desk-caption">{a.symbol} · {money(a.price)} · {stamp(a.observedAt)} · {a.emailStatus==='accepted'?'Aceptada por proveedor de correo':a.emailStatus==='uncertain'?'Envío por verificar':'Correo pendiente'}</p>)}{!report?.alerts.length&&<p className="desk-caption">Todavía no se ha registrado una activación.</p>}</section></div>
    <div className="desk-journal-toolbar"><button onClick={()=>setHistoryOpen(!historyOpen)}><History size={14}/> {historyOpen?'Ocultar':'Ver'} operaciones ({journal.trades.length})</button><button onClick={exportJournal} disabled={!journalReady}><Download size={14}/> Exportar respaldo</button><button onClick={()=>importRef.current?.click()}><Upload size={14}/> Importar respaldo</button><input ref={importRef} type="file" accept="application/json" hidden onChange={async e=>{try{const file=e.target.files?.[0];if(!file)return;const imported=JSON.parse(await file.text()) as Journal;replayJournal(imported);if(journal.trades.length)throw new Error('Para proteger el registro existente, importa en un navegador sin operaciones.');save(imported);setNotice('Respaldo importado.');}catch(err){setJournalError((err as Error).message);}e.target.value='';}}/></div>
    {historyOpen&&<div className="desk-trades">{journal.trades.map(t=><p key={t.id}>{t.side==='buy'?<ArrowUpRight size={14}/>:<ArrowDownRight size={14}/>} {stamp(t.at)} · {t.side==='buy'?'Compra':'Venta'} {t.quantity} {t.symbol} a {money(t.price)} · comisión {money(t.fees)}</p>)}{!journal.trades.length&&<p>No has registrado operaciones.</p>}</div>}
    {notice&&<p className="desk-notice" role="status"><Check size={14}/>{notice}</p>}
    <footer>Datos gratuitos; cotizaciones y ejecuciones programadas pueden retrasarse. Screening programado a las 17:37 de Colombia; monitor solicitado cada 5 minutos en sesión, sujeto a demoras de GitHub. Fechas de actividad en hora de Colombia. <a href="https://github.com/santiago9505/screening/actions/workflows/trading-desk.yml" target="_blank" rel="noreferrer">Ver ejecuciones</a></footer>
    {formOpen&&<div className="desk-modal-backdrop"><section className="desk-modal" role="dialog" aria-modal="true" aria-labelledby="trade-title"><button className="desk-close" onClick={()=>setFormOpen(false)} aria-label="Cerrar registro"><X size={18}/></button><h3 id="trade-title">Registrar operación ejecutada</h3><p>Introduce el precio real y la comisión de IBKR. Este formulario no envía órdenes.</p><form onSubmit={e=>{e.preventDefault();try{const next=addTrade(journal,{id:crypto.randomUUID(),symbol:draft.symbol.trim().toUpperCase(),side:draft.side,quantity:Number(draft.quantity),price:Number(draft.price),fees:Number(draft.fees),at:new Date(draft.at).toISOString(),note:draft.note});save(next);setFormOpen(false);setNotice('Operación registrada. Las listas y el desempeño se actualizaron.');setBucket(draft.side==='buy'?'portfolio':'recent-sold');}catch(err){setJournalError((err as Error).message);}}}>
      <label>Símbolo<input autoFocus required value={draft.symbol} onChange={e=>setDraft({...draft,symbol:e.target.value.toUpperCase()})}/></label><label>Operación<select value={draft.side} onChange={e=>setDraft({...draft,side:e.target.value as 'buy'|'sell'})}><option value="buy">Compra ejecutada</option><option value="sell">Venta ejecutada</option></select></label><label>Acciones<input required type="number" min="0.000001" step="any" value={draft.quantity} onChange={e=>setDraft({...draft,quantity:e.target.value})}/></label><label>Precio real USD<input required type="number" min="0.000001" step="any" value={draft.price} onChange={e=>setDraft({...draft,price:e.target.value})}/></label><label>Comisión USD<input required type="number" min="0" step="any" value={draft.fees} onChange={e=>setDraft({...draft,fees:e.target.value})}/></label><label>Fecha y hora local<input required type="datetime-local" value={draft.at} onChange={e=>setDraft({...draft,at:e.target.value})}/></label><label className="wide">Nota<input value={draft.note} onChange={e=>setDraft({...draft,note:e.target.value})}/></label>{journalError&&<p role="alert" className="wide desk-warning">{journalError}</p>}<button type="submit" className="wide desk-submit">Registrar {draft.side==='buy'?'compra':'venta'}</button></form></section></div>}
  </section>;
}
