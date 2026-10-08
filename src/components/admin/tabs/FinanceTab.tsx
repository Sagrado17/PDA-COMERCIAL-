import React from 'react';
import { motion } from 'motion/react';
import { DollarSign, ArrowDownLeft, ArrowUpRight, FileText } from 'lucide-react';
import { Debt, Sale, Customer } from '../../../types';

interface FinanceTabProps {
  debts: Debt[];
  sales: Sale[];
  customers: Customer[];
  exportToPDF: (type: 'sales' | 'debts') => void;
  setEditingDebt: (debt: Debt | null) => void;
  setDebtForm: (form: any) => void;
  setIsDebtModalOpen: (open: boolean) => void;
  handleDeleteDebt: (id: string) => void;
}

const money=(n:number)=>`KZ ${Math.round(n||0).toLocaleString('pt-AO')}`;

export const FinanceTab: React.FC<FinanceTabProps>=({debts,sales,exportToPDF})=>{
 const received=sales.filter(s=>s.status==='paid').reduce((a,s)=>a+(s.paidAmount||0),0)+debts.filter(d=>d.status==='paid').reduce((a,d)=>a+(d.amount||0),0);
 const pendingSales=sales.filter(s=>s.type==='sale'&&s.status==='pending').reduce((a,s)=>a+Math.max(0,(s.totalAmount||0)-(s.paidAmount||0)),0);
 const pendingDebt=debts.filter(d=>d.status==='active').reduce((a,d)=>a+(d.remainingAmount||0),0);
 const movements=[...sales.filter(s=>s.status==='paid').map(s=>({id:s.id,date:new Date(s.paidAt||s.createdAt),label:`Venda ${s.id.slice(-5)}`,value:s.paidAmount||s.totalAmount,type:'in'})),...debts.filter(d=>d.status==='paid').map(d=>({id:d.id,date:new Date(d.paidAt||d.createdAt),label:'Pagamento de dívida',value:d.amount,type:'in'}))].sort((a,b)=>b.date.getTime()-a.date.getTime()).slice(0,8);
 return <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="space-y-6">
   <div className="flex flex-col md:flex-row md:items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-orange-600">Gestão financeira</p><h2 className="text-2xl md:text-3xl font-black">Financeiro</h2><p className="text-sm text-zinc-500 mt-1">Saldo, recebido, pendente e movimentos.</p></div><button onClick={()=>exportToPDF('sales')} className="px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-bold flex items-center gap-2"><FileText className="w-4 h-4"/> Relatório</button></div>
   <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
     {[['Saldo operacional',money(received),'↗','text-emerald-600'],['Recebido',money(received),'✓','text-emerald-600'],['Pendente',money(pendingSales+pendingDebt),'◷','text-orange-600'],['Despesas','Sem registos','—','text-zinc-500']].map(([l,v,i,c])=><div key={l} className="bg-white rounded-2xl border border-zinc-200 p-4 md:p-5 shadow-sm"><div className={`w-9 h-9 rounded-xl bg-zinc-50 grid place-items-center font-black ${c}`}>{i}</div><b className="block mt-4 text-lg md:text-xl">{v}</b><span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">{l}</span></div>)}
   </div>
   <div className="grid lg:grid-cols-[1.2fr_.8fr] gap-5">
     <div className="bg-[#062b5c] rounded-3xl p-6 md:p-7 text-white min-h-[180px] flex flex-col justify-between"><div><span className="text-xs text-blue-200 font-bold">Saldo com base nos recebimentos registados</span><div className="text-3xl md:text-4xl font-black mt-2">{money(received)}</div></div><div className="grid grid-cols-2 gap-3 text-xs"><div className="rounded-xl bg-white/10 p-3"><span className="text-blue-200 block">Vendas pagas</span><b>{money(sales.filter(s=>s.status==='paid').reduce((a,s)=>a+(s.paidAmount||0),0))}</b></div><div className="rounded-xl bg-white/10 p-3"><span className="text-blue-200 block">Dívidas pagas</span><b>{money(debts.filter(d=>d.status==='paid').reduce((a,d)=>a+(d.amount||0),0))}</b></div></div></div>
     <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-6"><h3 className="font-black">A receber</h3><div className="mt-5 text-3xl font-black text-orange-600">{money(pendingSales+pendingDebt)}</div><p className="text-xs text-zinc-500 mt-2">Vendas pendentes + dívidas ativas.</p><div className="mt-5 h-2 rounded-full bg-zinc-100 overflow-hidden"><div className="h-full bg-orange-500" style={{width:`${Math.min(100,(pendingSales+pendingDebt)/Math.max(1,received+pendingSales+pendingDebt)*100)}%`}}/></div></div>
   </div>
   <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden"><div className="p-5 border-b border-zinc-100"><h3 className="font-black">Movimentos recentes</h3><p className="text-xs text-zinc-500 mt-1">Gerados a partir das vendas e pagamentos existentes.</p></div>
    <div className="divide-y divide-zinc-100">{movements.length?movements.map(m=><div key={m.id} className="p-4 flex items-center justify-between gap-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 grid place-items-center"><ArrowDownLeft className="w-4 h-4"/></div><div><b className="text-sm">{m.label}</b><span className="block text-xs text-zinc-500">{m.date.toLocaleDateString('pt-AO')}</span></div></div><b className="text-emerald-600">+{money(m.value)}</b></div>):<div className="p-10 text-center text-sm text-zinc-400">Nenhum movimento registado.</div>}</div>
   </div>
 </motion.div>
};
export default FinanceTab;
