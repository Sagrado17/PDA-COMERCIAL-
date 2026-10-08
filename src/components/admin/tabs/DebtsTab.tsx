import React from 'react';
import { motion } from 'motion/react';
import { DollarSign, Plus, Edit, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../../firebase';
import { Debt, Customer } from '../../../types';
import { safeFormatDate } from '../../SafeImage';

interface DebtsTabProps {
 debts: Debt[];
 customers: Customer[];
 exportToPDF:(type:'sales'|'debts')=>void;
 setEditingDebt:(debt:Debt|null)=>void;
 setDebtForm:(form:any)=>void;
 setIsDebtModalOpen:(open:boolean)=>void;
 handleDeleteDebt:(id:string)=>void;
}
const money=(n:number)=>`KZ ${Math.round(n||0).toLocaleString('pt-AO')}`;

export const DebtsTab:React.FC<DebtsTabProps>=({debts,customers,exportToPDF,setEditingDebt,setDebtForm,setIsDebtModalOpen,handleDeleteDebt})=>{
 const active=debts.filter(d=>d.status==='active');
 const overdue=active.filter(d=>d.dueDate&&new Date(d.dueDate)<new Date());
 const total=active.reduce((a,d)=>a+(d.remainingAmount||0),0);
 return <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="space-y-6">
  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-red-600">Controlo de cobranças</p><h2 className="text-2xl md:text-3xl font-black">Dívidas</h2><p className="text-sm text-zinc-500 mt-1">Clientes devedores, vencimentos e pagamentos.</p></div><div className="flex gap-2"><button onClick={()=>exportToPDF('debts')} className="px-3 py-2.5 rounded-xl bg-white border border-zinc-200 text-xs font-bold flex items-center gap-2"><DollarSign className="w-4 h-4"/> Exportar</button><button onClick={()=>{setEditingDebt(null);setDebtForm({customerName:'',customerPhone:'',amount:0,remainingAmount:0,dueDate:''});setIsDebtModalOpen(true)}} className="px-4 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold flex items-center gap-2"><Plus className="w-4 h-4"/> Nova dívida</button></div></div>
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[['Total em dívida',money(total),'text-red-600','!'],['Clientes',new Set(active.map(d=>d.customerId)).size,'text-orange-600','◎'],['Em atraso',money(overdue.reduce((a,d)=>a+d.remainingAmount,0)),'text-red-600','!'],['A vencer',money(total-overdue.reduce((a,d)=>a+d.remainingAmount,0)),'text-emerald-600','✓']].map(([l,v,c,i])=><div key={l} className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm"><div className={`w-9 h-9 rounded-xl bg-zinc-50 grid place-items-center font-black ${c}`}>{i}</div><b className="block mt-4 text-xl">{v}</b><span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">{l}</span></div>)}</div>
  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{active.map(debt=>{const customer=customers.find(c=>c.id===debt.customerId);const isOverdue=debt.dueDate&&new Date(debt.dueDate)<new Date();return <article key={debt.id} className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-5"><div className="flex justify-between gap-3"><div><h3 className="font-black">{customer?.name||'Cliente'}</h3><p className="text-xs text-zinc-500">{customer?.phone||'Sem telefone'}</p></div><span className={`text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg ${isOverdue?'bg-red-50 text-red-700':'bg-orange-50 text-orange-700'}`}>{isOverdue?'Em atraso':'A vencer'}</span></div><div className="mt-5 text-2xl font-black text-red-600">{money(debt.remainingAmount)}</div><div className="mt-1 text-xs text-zinc-500">de {money(debt.amount)} · vence {safeFormatDate(debt.dueDate,'dd/MM/yyyy')}</div><div className="mt-5 flex gap-2"><button onClick={async()=>{if(!window.confirm('Deseja baixar o pagamento total desta dívida?'))return;try{await updateDoc(doc(db,'debts',debt.id),{remainingAmount:0,status:'paid',paidAt:new Date().toISOString()})}catch(err){handleFirestoreError(err,OperationType.UPDATE,`debts/${debt.id}`)}}} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1"><CheckCircle2 className="w-4 h-4"/> Registar pagamento</button><button onClick={()=>{setEditingDebt(debt);setDebtForm({customerName:customer?.name||'',customerPhone:customer?.phone||'',amount:debt.amount||0,remainingAmount:debt.remainingAmount||0,dueDate:debt.dueDate||''});setIsDebtModalOpen(true)}} className="p-2.5 rounded-xl bg-zinc-50 text-zinc-600"><Edit className="w-4 h-4"/></button><button onClick={()=>handleDeleteDebt(debt.id)} className="p-2.5 rounded-xl bg-red-50 text-red-600"><Trash2 className="w-4 h-4"/></button></div></article>})}</div>
  {!active.length&&<div className="bg-white rounded-3xl border border-zinc-200 p-12 text-center"><AlertTriangle className="w-8 h-8 mx-auto text-emerald-600 mb-3"/><b>Nenhuma dívida ativa</b><p className="text-sm text-zinc-500 mt-1">Os seus clientes estão em dia.</p></div>}
 </motion.div>
};
export default DebtsTab;
