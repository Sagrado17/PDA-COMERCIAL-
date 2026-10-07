import React from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  DollarSign, 
  Clock, 
  AlertCircle, 
  Users, 
  Eye 
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Product, Stock, Sale, Customer, Debt, SiteSettings, Stats } from '../../../types';
import { getVariationStock } from '../../../lib/stockUtils';
import { safeFormatDate } from '../../SafeImage';
import { cn } from '../../../lib/utils';

interface DashboardTabProps {
  sales: Sale[];
  stock: Stock[];
  products: Product[];
  customers: Customer[];
  debts: Debt[];
  stats: Stats | null;
  settings: SiteSettings;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  sales,
  stock,
  products,
  customers,
  debts,
  stats,
  settings,
}) => {
  return (
    <motion.div 
      key="dashboard"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {[
          { 
            label: 'Vendas (Mês)', 
            value: `KZ ${sales.filter(s => {
              const date = new Date(s.createdAt);
              const now = new Date();
              const isCurrentMonth = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
              if (!isCurrentMonth) return false;
              if (settings.salesResetDate) {
                return s.type === 'sale' && date.getTime() >= new Date(settings.salesResetDate).getTime();
              }
              return s.type === 'sale';
            }).reduce((acc, s) => acc + s.totalAmount, 0).toLocaleString()}`, 
            icon: TrendingUp, 
            color: 'text-emerald-400' 
          },
          { 
            label: 'Recebido (Mês)', 
            value: `KZ ${(
              sales.filter(s => {
                if (!s.paidAt) return false;
                const date = new Date(s.paidAt);
                const now = new Date();
                const isCurrentMonth = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                if (!isCurrentMonth) return false;
                if (settings.salesResetDate) {
                  return s.status === 'paid' && date.getTime() >= new Date(settings.salesResetDate).getTime();
                }
                return s.status === 'paid';
              }).reduce((acc, s) => acc + s.totalAmount, 0) +
              debts.filter(d => {
                if (!d.paidAt) return false;
                const date = new Date(d.paidAt);
                const now = new Date();
                const isCurrentMonth = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                if (!isCurrentMonth) return false;
                if (settings.salesResetDate) {
                  return d.status === 'paid' && date.getTime() >= new Date(settings.salesResetDate).getTime();
                }
                return d.status === 'paid';
              }).reduce((acc, d) => acc + d.amount, 0)
            ).toLocaleString()}`, 
            icon: DollarSign, 
            color: 'text-emerald-500' 
          },
          { label: 'Reservas Ativas', value: sales.filter(s => s.type === 'reservation' && s.status === 'pending').length, icon: Clock, color: 'text-orange-400' },
          { label: 'Dívidas Pendentes', value: `KZ ${debts.reduce((acc, d) => acc + d.remainingAmount, 0).toLocaleString()}`, icon: AlertCircle, color: 'text-red-400' },
          { label: 'Total Clientes', value: customers.length, icon: Users, color: 'text-blue-400' },
          { label: 'Total Visitas', value: stats?.visitorCount || 0, icon: Eye, color: 'text-purple-400' },
        ].map((stat) => (
          <div key={stat.label} className="glass p-6 rounded-3xl bg-white border border-zinc-200">
            <div className="flex justify-between items-start mb-4">
              <div className={cn("p-3 rounded-2xl bg-zinc-100", stat.color)}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
            <div className="text-2xl font-bold mb-1">{stat.value}</div>
            <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="glass p-8 rounded-[40px] bg-white border border-zinc-200">
          <h3 className="text-lg font-bold mb-6">Fluxo de Vendas</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sales.slice(0, 7).reverse().map(s => ({ date: safeFormatDate(s.createdAt, 'dd/MM'), amount: s.totalAmount }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#00000010" vertical={false} />
                <XAxis dataKey="date" stroke="#00000040" fontSize={12} />
                <YAxis stroke="#00000040" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#ea580c' }}
                />
                <Line type="monotone" dataKey="amount" stroke="#ea580c" strokeWidth={3} dot={{ fill: '#ea580c', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass p-8 rounded-[40px] bg-white border border-zinc-200">
          <h3 className="text-lg font-bold mb-6">Estoque Crítico</h3>
          <div className="space-y-4">
            {stock.map(s => ({
              ...s,
              realQuantity: getVariationStock(s)
            })).filter(s => s.realQuantity < 5).slice(0, 5).map(item => {
              const product = products.find(p => p.id === item.productId);
              return (
                <div key={item.id} className="flex items-center justify-between p-4 bg-zinc-50 border border-zinc-100 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-400/10 flex items-center justify-center text-red-400">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold">{product?.name}</div>
                      <div className="text-xs text-zinc-500">{item.variation.color} / {item.variation.size}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-red-400">{item.realQuantity} un</div>
                    <div className="text-[10px] text-zinc-500 uppercase font-bold">
                      {item.realQuantity === 0 ? 'Esgotado' : 'Saldo Baixo'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
export default DashboardTab;
