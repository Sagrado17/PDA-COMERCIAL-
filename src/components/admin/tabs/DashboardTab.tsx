import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, DollarSign, Clock, AlertCircle, Users, Eye } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Product, Stock, Sale, Customer, Debt, SiteSettings, Stats } from '../../../types';
import { getVariationStock } from '../../../lib/stockUtils';
import { safeFormatDate, SafeImage } from '../../SafeImage';

interface DashboardTabProps {
  sales: Sale[];
  stock: Stock[];
  products: Product[];
  customers: Customer[];
  debts: Debt[];
  stats: Stats | null;
  settings: SiteSettings;
}

const money = (n:number) => `KZ ${Math.round(n || 0).toLocaleString('pt-AO')}`;

export const DashboardTab: React.FC<DashboardTabProps> = ({ sales, stock, products, customers, debts, stats, settings }) => {
  const now = new Date();
  const monthSales = sales.filter(s => {
    const d = new Date(s.createdAt);
    if (s.type !== 'sale' || d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
    return !settings.salesResetDate || d.getTime() >= new Date(settings.salesResetDate).getTime();
  });
  const paid = sales.filter(s => s.status === 'paid' && s.paidAt).filter(s => {
    const d = new Date(s.paidAt!);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const pending = sales.filter(s => s.type === 'sale' && s.status === 'pending').reduce((a,s)=>a + Math.max(0,(s.totalAmount||0)-(s.paidAmount||0)),0);
  const recent = [...sales].filter(s => s.type === 'sale' && !s.archived).sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()).slice(0,5);
  const critical = stock.map(s => ({...s, realQuantity:getVariationStock(s)})).filter(s=>s.realQuantity < 5).slice(0,5);

  return (
    <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-widest text-orange-600">PDA Comercial</p><h2 className="text-2xl md:text-3xl font-black tracking-tight">Visão geral</h2><p className="text-sm text-zinc-500 mt-1">O que está a acontecer no seu negócio.</p></div>
        <span className="text-xs font-bold text-zinc-400">{now.toLocaleDateString('pt-AO',{day:'2-digit',month:'long',year:'numeric'})}</span>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 md:gap-4">
        {[
          ['Vendas do mês', money(monthSales.reduce((a,s)=>a+s.totalAmount,0)), '↗', 'text-emerald-600'],
          ['Recebido', money(paid.reduce((a,s)=>a+s.paidAmount,0)), '✓', 'text-emerald-600'],
          ['Reservas pendentes', String(sales.filter(s=>s.type==='reservation'&&s.status==='pending').length), '◷', 'text-orange-600'],
          ['Dívidas', money(debts.filter(d=>d.status==='active').reduce((a,d)=>a+d.remainingAmount,0)), '!', 'text-red-600'],
          ['Clientes', String(customers.length), '◎', 'text-blue-600'],
        ].map(([label,value,icon,color])=>(
          <div key={label} className="bg-white rounded-2xl border border-zinc-200 p-4 md:p-5 shadow-sm">
            <div className={`w-9 h-9 rounded-xl bg-zinc-50 flex items-center justify-center font-black ${color}`}>{icon}</div>
            <div className="mt-4 text-xl md:text-2xl font-black">{value}</div>
            <div className="mt-1 text-[10px] md:text-xs font-bold uppercase tracking-wider text-zinc-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1.45fr_.9fr] gap-5">
        <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-zinc-100 flex items-center justify-between"><div><h3 className="font-black">Vendas recentes</h3><p className="text-xs text-zinc-500 mt-1">Últimas vendas registadas.</p></div><span className="text-xs font-bold text-orange-600">{monthSales.length} este mês</span></div>
          <div className="divide-y divide-zinc-100">
            {recent.length ? recent.map(s=>(
              <div key={s.id} className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 grid place-items-center font-black">#{s.id.slice(-2)}</div>
                <div className="min-w-0 flex-1"><div className="font-bold text-sm truncate">{s.customerName || 'Cliente sem nome'}</div><div className="text-xs text-zinc-500">{safeFormatDate(s.createdAt,'dd/MM/yyyy')} · {s.items.length} item(s)</div></div>
                <div className="text-right"><div className="font-black text-sm">{money(s.totalAmount)}</div><span className={`text-[10px] font-bold ${s.status==='paid'?'text-emerald-600':'text-orange-600'}`}>{s.status==='paid'?'Pago':'Pendente'}</span></div>
              </div>
            )) : <div className="p-8 text-center text-sm text-zinc-400">Ainda não existem vendas.</div>}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-zinc-100"><h3 className="font-black">Stock a merecer atenção</h3><p className="text-xs text-zinc-500 mt-1">Produtos com menos de 5 unidades.</p></div>
          <div className="p-4 space-y-3">
            {critical.length ? critical.map(item=>{
              const product=products.find(p=>p.id===item.productId);
              return <div key={item.id} className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50">
                <div className="w-12 h-12 rounded-xl bg-white overflow-hidden border border-zinc-100">{product?.images?.[0] ? <SafeImage src={product.images[0]} className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-xl">📦</div>}</div>
                <div className="flex-1 min-w-0"><b className="text-sm truncate block">{product?.name || item.productName}</b><span className="text-[11px] text-zinc-500">{item.variation.color} · {item.variation.size}</span></div>
                <b className={item.realQuantity===0?'text-red-600':'text-orange-600'}>{item.realQuantity}</b>
              </div>
            }) : <div className="p-5 text-center text-sm text-zinc-400">Stock saudável.</div>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-5">
        <div className="mb-3"><h3 className="font-black">Fluxo de vendas</h3><p className="text-xs text-zinc-500">Últimos registos.</p></div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={recent.slice().reverse().map(s=>({date:safeFormatDate(s.createdAt,'dd/MM'),amount:s.totalAmount||0}))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false}/>
              <XAxis dataKey="date" fontSize={11} stroke="#9ca3af"/>
              <YAxis fontSize={11} stroke="#9ca3af"/>
              <Tooltip formatter={(v)=>[money(Number(v)),'Venda']}/>
              <Line type="monotone" dataKey="amount" stroke="#ff6b00" strokeWidth={3} dot={{r:4}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="text-[11px] text-zinc-400">Visitas registadas: <b>{stats?.visitorCount || 0}</b> · Clientes: <b>{customers.length}</b></div>
    </motion.div>
  );
};
export default DashboardTab;
