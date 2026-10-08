import React from 'react';
import { motion } from 'motion/react';
import { Filter, History, Archive, Eye, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import { Sale } from '../../../types';
import { safeFormatDate } from '../../SafeImage';

interface SalesTabProps {
  sales: Sale[];
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  showArchived: boolean;
  setShowArchived: (show: boolean) => void;
  exportToPDF: (type: 'sales' | 'debts') => void;
  handleArchiveMonth: () => void;
}

const money=(n:number)=>`KZ ${Math.round(n||0).toLocaleString('pt-AO')}`;

export const SalesTab: React.FC<SalesTabProps>=({sales,selectedMonth,setSelectedMonth,showArchived,setShowArchived,exportToPDF,handleArchiveMonth})=>{
  const filtered=sales.filter(s=>{
    const d=new Date(s.createdAt); const [y,m]=selectedMonth.split('-').map(Number);
    return s.type==='sale' && d.getFullYear()===y && d.getMonth()+1===m && (showArchived ? true : !s.archived);
  });
  const total=filtered.reduce((a,s)=>a+(s.totalAmount||0),0);
  const received=filtered.reduce((a,s)=>a+(s.paidAmount||0),0);
  const pending=Math.max(0,total-received);
  return <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="space-y-6">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-widest text-orange-600">Gestão comercial</p><h2 className="text-2xl md:text-3xl font-black">Vendas</h2><p className="text-sm text-zinc-500 mt-1">Resumo do mês, vendas recentes e ações.</p></div>
      <div className="flex flex-wrap gap-2">
        <label className="h-10 px-3 bg-white border border-zinc-200 rounded-xl flex items-center gap-2 text-xs font-bold"><Filter className="w-4 h-4 text-zinc-400"/><input type="month" value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)} className="outline-none bg-transparent"/></label>
        <button onClick={()=>exportToPDF('sales')} className="h-10 px-3 rounded-xl bg-zinc-900 text-white text-xs font-bold flex items-center gap-2"><History className="w-4 h-4"/> PDF</button>
        <button onClick={handleArchiveMonth} className="h-10 px-3 rounded-xl bg-orange-50 text-orange-700 text-xs font-bold flex items-center gap-2"><Archive className="w-4 h-4"/> Arquivar mês</button>
      </div>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[
        ['Vendas do mês',money(total),'↗','text-orange-600'],
        ['Recebido',money(received),'✓','text-emerald-600'],
        ['Pendente',money(pending),'◷','text-orange-600'],
        ['Nº de vendas',String(filtered.length),'#','text-blue-600']
      ].map(([label,value,icon,color])=><div key={label} className="bg-white rounded-2xl border border-zinc-200 p-4 md:p-5 shadow-sm"><div className={`w-9 h-9 rounded-xl bg-zinc-50 grid place-items-center font-black ${color}`}>{icon}</div><b className="block mt-4 text-xl">{value}</b><span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">{label}</span></div>)}
    </div>

    <div className="flex flex-wrap gap-2">
      <button onClick={()=>setShowArchived(false)} className={`px-3 py-2 rounded-xl text-xs font-bold ${!showArchived?'bg-[#062b5c] text-white':'bg-white border border-zinc-200 text-zinc-600'}`}>Ativas</button>
      <button onClick={()=>setShowArchived(true)} className={`px-3 py-2 rounded-xl text-xs font-bold ${showArchived?'bg-[#062b5c] text-white':'bg-white border border-zinc-200 text-zinc-600'}`}><Eye className="w-3 h-3 inline mr-1"/>Arquivadas</button>
    </div>

    <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-zinc-100 flex items-center justify-between"><div><h3 className="font-black">Vendas recentes</h3><p className="text-xs text-zinc-500 mt-1">Filtradas pelo mês selecionado.</p></div><span className="text-xs font-bold text-zinc-400">{filtered.length} registo(s)</span></div>
      <div className="divide-y divide-zinc-100">
        {filtered.length ? filtered.map(s=><div key={s.id} className="p-4 md:p-5 flex flex-col lg:flex-row lg:items-center gap-4 hover:bg-zinc-50/70">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-orange-50 text-orange-600 grid place-items-center font-black shrink-0">#{s.id.slice(-3)}</div>
            <div className="min-w-0"><b className="block truncate">{s.customerName||'Cliente sem nome'}</b><span className="text-xs text-zinc-500">{safeFormatDate(s.createdAt,'dd/MM/yyyy')} · {s.customerPhone||'Sem contacto'}</span></div>
          </div>
          <div className="flex flex-wrap gap-2 lg:max-w-[360px]">{s.items.map((item,i)=><span key={i} className="text-[11px] font-bold bg-zinc-100 rounded-lg px-2 py-1">{item.productName} ×{item.quantity}</span>)}</div>
          <div className="lg:w-36"><b>{money(s.totalAmount)}</b><div className="text-[10px] text-zinc-500 mt-1">Recebido: {money(s.paidAmount)}</div></div>
          <span className={`w-fit text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg ${s.status==='paid'?'bg-emerald-50 text-emerald-700':'bg-orange-50 text-orange-700'}`}>{s.status==='paid'?'Pago':'Pendente'}</span>
        </div>) : <div className="p-12 text-center text-sm text-zinc-400">Não existem vendas neste período.</div>}
      </div>
    </div>
  </motion.div>
};
export default SalesTab;
