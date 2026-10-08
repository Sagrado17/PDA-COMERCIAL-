import React, {useMemo, useState} from 'react';
import { motion } from 'motion/react';
import { Trash2, Search, ShoppingBag, WalletCards, UserRound } from 'lucide-react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../../firebase';
import { Customer, Sale } from '../../../types';
import { safeFormatDate } from '../../SafeImage';

interface CustomersTabProps { customers:Customer[]; sales:Sale[]; }
const money=(n:number)=>`KZ ${Math.round(n||0).toLocaleString('pt-AO')}`;

export const CustomersTab:React.FC<CustomersTabProps>=({customers,sales})=>{
 const [query,setQuery]=useState('');
 const visible=useMemo(()=>customers.filter(c=>`${c.name} ${c.phone||''} ${c.email||''}`.toLowerCase().includes(query.toLowerCase())),[customers,query]);
 return <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="space-y-6">
  <div><p className="text-xs font-bold uppercase tracking-widest text-orange-600">Relacionamento</p><h2 className="text-2xl md:text-3xl font-black">Clientes</h2><p className="text-sm text-zinc-500 mt-1">Perfis resumidos e histórico de compras.</p></div>
  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3"><div className="bg-white rounded-2xl border border-zinc-200 p-4"><UserRound className="w-5 h-5 text-blue-600"/><b className="block text-2xl mt-3">{customers.length}</b><span className="text-[10px] uppercase font-bold text-zinc-500">Total de clientes</span></div><div className="bg-white rounded-2xl border border-zinc-200 p-4"><ShoppingBag className="w-5 h-5 text-orange-600"/><b className="block text-2xl mt-3">{sales.filter(s=>s.type==='sale').length}</b><span className="text-[10px] uppercase font-bold text-zinc-500">Vendas registadas</span></div><div className="hidden lg:block bg-white rounded-2xl border border-zinc-200 p-4"><WalletCards className="w-5 h-5 text-red-600"/><b className="block text-2xl mt-3">{customers.filter(c=>(c.totalDebt||0)>0).length}</b><span className="text-[10px] uppercase font-bold text-zinc-500">Com dívida</span></div></div>
  <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Pesquisar cliente..." className="w-full h-11 pl-10 pr-4 bg-white border border-zinc-200 rounded-xl outline-none focus:border-orange-400 text-sm"/></div>
  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{visible.map(customer=>{const purchases=sales.filter(s=>s.type==='sale'&&s.customerId===customer.id);const spent=purchases.reduce((a,s)=>a+(s.totalAmount||0),0);return <article key={customer.id} className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-5"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-2xl bg-[#062b5c] text-white grid place-items-center font-black">{(customer.name||'?').split(' ').slice(0,2).map(x=>x[0]).join('').toUpperCase()}</div><div className="min-w-0"><h3 className="font-black truncate">{customer.name}</h3><p className="text-xs text-zinc-500 truncate">{customer.phone||customer.email||'Sem contacto'}</p></div></div><div className="grid grid-cols-2 gap-2 mt-5"><div className="bg-zinc-50 rounded-xl p-3"><span className="text-[10px] uppercase font-bold text-zinc-400">Compras</span><b className="block mt-1">{purchases.length}</b></div><div className="bg-zinc-50 rounded-xl p-3"><span className="text-[10px] uppercase font-bold text-zinc-400">Total</span><b className="block mt-1">{money(spent)}</b></div></div><div className="mt-4 pt-4 border-t border-zinc-100 flex justify-between items-center"><span className="text-xs text-zinc-500">Cadastro: {safeFormatDate(customer.createdAt,'dd/MM/yyyy')}</span><button onClick={()=>{if(window.confirm('Tem certeza que deseja excluir este cliente?'))deleteDoc(doc(db,'customers',customer.id)).catch(err=>handleFirestoreError(err,OperationType.DELETE,'customers'))}} className="p-2 rounded-xl bg-red-50 text-red-600"><Trash2 className="w-4 h-4"/></button></div></article>})}</div>
  {!visible.length&&<div className="bg-white rounded-3xl border border-zinc-200 p-12 text-center text-sm text-zinc-400">Nenhum cliente encontrado.</div>}
 </motion.div>
};
export default CustomersTab;
