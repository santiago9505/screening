import { Journal, Position, TradeRecord } from '../types/tradingDesk';
export const JOURNAL_KEY='northstar.trade-journal.v1';
export const emptyJournal=():Journal=>({version:1,initialCapital:1000,trades:[]});
export function replayJournal(journal:Journal) {
  if(journal.version!==1 || !Number.isFinite(journal.initialCapital) || journal.initialCapital!==1000 || !Array.isArray(journal.trades))throw new Error('Formato de registro no válido.');
  let cash=journal.initialCapital,realized=0;
  const positions=new Map<string,Position>(),sold:{symbol:string;at:string;realized:number}[]=[],ids=new Set<string>();
  for(const trade of [...journal.trades].sort((a,b)=>a.at.localeCompare(b.at))) {
    if(!trade.id || ids.has(trade.id) || !/^[A-Z0-9][A-Z0-9.\-]{0,14}$/.test(trade.symbol) ||
      !['buy','sell'].includes(trade.side) || !Number.isFinite(Date.parse(trade.at)) || Date.parse(trade.at)>Date.now()+60000 ||
      ![trade.quantity,trade.price,trade.fees].every(Number.isFinite) || trade.quantity<=0 || trade.price<=0 || trade.fees<0)throw new Error('Operación inválida o duplicada.');
    ids.add(trade.id);
    const position=positions.get(trade.symbol);
    if(trade.side==='buy') {
      const cost=trade.quantity*trade.price+trade.fees;
      if(cost>cash+1e-7)throw new Error('La compra supera el efectivo registrado.');
      cash-=cost;
      const quantity=(position?.quantity??0)+trade.quantity,totalCost=(position?.cost??0)+cost;
      positions.set(trade.symbol,{symbol:trade.symbol,quantity,cost:totalCost,averagePrice:totalCost/quantity,openedAt:position?.openedAt??trade.at});
    }else{
      if(!position || trade.quantity>position.quantity+1e-7)throw new Error('No hay suficientes acciones registradas para vender.');
      const removedCost=position.averagePrice*trade.quantity,proceeds=trade.quantity*trade.price-trade.fees;
      cash+=proceeds;realized+=proceeds-removedCost;
      if(position.quantity-trade.quantity<1e-7){positions.delete(trade.symbol);sold.push({symbol:trade.symbol,at:trade.at,realized:proceeds-removedCost});}
      else positions.set(trade.symbol,{...position,quantity:position.quantity-trade.quantity,cost:position.cost-removedCost});
    }
  }
  return {cash,realized,positions:[...positions.values()],sold};
}
export function addTrade(journal:Journal,trade:TradeRecord):Journal {
  const next={...journal,trades:[...journal.trades,trade]};replayJournal(next);return next;
}
export function visibleBucket(symbol:string,researchBucket:string,book:ReturnType<typeof replayJournal>,now=new Date()):string {
  if(book.positions.some(p=>p.symbol===symbol))return 'portfolio';
  if(book.sold.some(s=>s.symbol===symbol && now.getTime()-Date.parse(s.at)<=30*86400000))return 'recent-sold';
  return researchBucket;
}
