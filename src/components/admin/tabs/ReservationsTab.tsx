import React from 'react';
import { motion } from 'motion/react';
import { Trash2, MessageSquare, MessageCircle, CalendarClock, CheckCircle2, XCircle } from 'lucide-react';
import { Sale } from '../../../types';
import { safeFormatDate } from '../../SafeImage';

interface ReservationsTabProps {
  sales: Sale[];
  handleClearAllCancelledReservations: () => void;
  handleUpdateReservationStatus: (id: string, status: 'paid' | 'cancelled') => void;
  handleDeleteCancelledReservation: (id: string) => void;
}

const money=(n:number)=>`KZ ${Math.round(n||0).toLocaleString('pt-AO')}`;

export const ReservationsTab: React.FC<ReservationsTabProps>=({sales,handleClearAllCancelledReservations,handleUpdateReservationStatus,handleDeleteCancelledReservation})=>{
 const reservations=sales.filter(s=>s.type==='reservation');
 const pending=reservations.filter(s=>s.status==='pending').length;
 const confirmed=reservations.filter(s=>s.status==='paid').length;
 const cancelled=reservations.filter(s=>s.status==='cancelled').length;
 return <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="space-y-6">
   <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
     <div><p className="text-xs font-bold uppercase tracking-widest text-orange-600">Pedidos agendados</p><h2 className="text-2xl md:text-3xl font-black">Reservas</h2><p className="text-sm text-zinc-500 mt-1">Cada reserva num cartão, com estado, cliente, valor e ações.</p></div>
     {cancelled>0&&<button onClick={handleClearAllCancelledReservations} className="px-4 py-2.5 rounded-xl bg-red-50 text-red-600 border border-red-100 text-xs font-bold flex items-center gap-2"><Trash2 className="w-4 h-4"/> Limpar canceladas ({cancelled})</button>}
   </div>
   <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
     {[['Total',reservations.length,'#','text-blue-600'],['Pendentes',pending,'◷','text-orange-600'],['Confirmadas',confirmed,'✓','text-emerald-600'],['Valor reservado',money(reservations.reduce((a,s)=>a+(s.totalAmount||0),0)),'KZ','text-orange-600']].map(([l,v,i,c])=><div key={l} className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm"><div className={`w-9 h-9 rounded-xl bg-zinc-50 grid place-items-center font-black ${c}`}>{i}</div><b className="block mt-3 text-xl">{v}</b><span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">{l}</span></div>)}
   </div>
   <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
    {reservations.map(res=><article key={res.id} className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start gap-3"><div><span className="text-[10px] font-black text-zinc-400">#{res.id.slice(-5)}</span><h3 className="font-black mt-1">{res.customerName||'Cliente sem nome'}</h3></div>
      <span className={`text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg ${res.status==='pending'?'bg-orange-50 text-orange-700':res.status==='paid'?'bg-emerald-50 text-emerald-700':'bg-red-50 text-red-700'}`}>{res.status==='pending'?'Pendente':res.status==='paid'?'Confirmada':'Cancelada'}</span></div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="bg-zinc-50 rounded-xl p-3"><span className="text-zinc-400 block mb-1">Data</span><b>{safeFormatDate(res.createdAt,'dd/MM/yyyy')}</b></div><div className="bg-zinc-50 rounded-xl p-3"><span className="text-zinc-400 block mb-1">Valor</span><b>{money(res.totalAmount)}</b></div></div>
      <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">{res.channel==='sms'?<MessageSquare className="w-4 h-4 text-blue-600"/>:<MessageCircle className="w-4 h-4 text-emerald-600"/>}<span>{res.channel==='sms'?'SMS':'WhatsApp'} · {res.customerPhone||'Sem telefone'}</span></div>
      <div className="mt-4 space-y-2">{res.items.slice(0,3).map((item,i)=><div key={i} className="flex justify-between text-xs border-b border-zinc-100 pb-2"><span className="font-bold truncate pr-3">{item.productName}</span><span className="text-zinc-500">×{item.quantity}</span></div>)}</div>
      <div className="mt-5 flex gap-2">{res.status==='pending'&&<><button onClick={()=>handleUpdateReservationStatus(res.id,'paid')} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1"><CheckCircle2 className="w-4 h-4"/> Confirmar</button><button onClick={()=>handleUpdateReservationStatus(res.id,'cancelled')} className="px-3 py-2.5 rounded-xl bg-red-50 text-red-600 text-xs font-bold"><XCircle className="w-4 h-4"/></button></>}{res.status==='cancelled'&&<button onClick={()=>handleDeleteCancelledReservation(res.id)} className="w-full py-2.5 rounded-xl bg-red-50 text-red-600 text-xs font-bold">Apagar histórico</button>}{res.status==='paid'&&<div className="w-full text-center py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold">Reserva confirmada</div>}</div>
    </article>)}
   </div>
   {!reservations.length&&<div className="bg-white rounded-3xl border border-zinc-200 p-12 text-center text-sm text-zinc-400"><CalendarClock className="mx-auto mb-3 w-8 h-8"/ >Nenhuma reserva registada.</div>}
 </motion.div>
};
export default ReservationsTab;
