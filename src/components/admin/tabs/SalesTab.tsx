import React from 'react';
import { motion } from 'motion/react';
import { Filter, History, Package, Eye } from 'lucide-react';
import { Sale } from '../../../types';
import { safeFormatDate } from '../../SafeImage';
import { cn } from '../../../lib/utils';

interface SalesTabProps {
  sales: Sale[];
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  showArchived: boolean;
  setShowArchived: (show: boolean) => void;
  exportToPDF: (type: 'sales' | 'debts') => void;
  handleArchiveMonth: () => void;
}

export const SalesTab: React.FC<SalesTabProps> = ({
  sales,
  selectedMonth,
  setSelectedMonth,
  showArchived,
  setShowArchived,
  exportToPDF,
  handleArchiveMonth,
}) => {
  return (
    <motion.div 
      key="sales"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl font-bold">Histórico de Vendas</h2>
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-zinc-200">
            <Filter className="w-4 h-4 text-zinc-400" />
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-bold uppercase outline-none bg-transparent"
            />
          </div>
          <button 
            onClick={() => exportToPDF('sales')}
            className="bg-zinc-900 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all flex items-center gap-2 cursor-pointer"
          >
            <History className="w-4 h-4" />
            Baixar PDF
          </button>
          <button 
            onClick={handleArchiveMonth}
            className="bg-orange-50 text-orange-600 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all flex items-center gap-2 cursor-pointer"
          >
            <Package className="w-4 h-4" />
            Arquivar Mês
          </button>
          <button 
            onClick={() => setShowArchived(!showArchived)}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer",
              showArchived ? "bg-orange-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            )}
          >
            <Eye className="w-4 h-4" />
            {showArchived ? 'Ocultar Arquivados' : 'Ver Arquivados'}
          </button>
        </div>
      </div>
      <div className="glass rounded-[32px] overflow-hidden overflow-x-auto bg-white border border-zinc-200">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-zinc-50 text-xs font-bold uppercase tracking-widest text-zinc-500">
            <tr>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Itens</th>
              <th className="px-6 py-4">Total</th>
              <th className="px-6 py-4">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {sales.filter(s => {
              const date = new Date(s.createdAt);
              const [year, month] = selectedMonth.split('-');
              const matchesMonth = s.type === 'sale' && date.getFullYear() === parseInt(year) && (date.getMonth() + 1) === parseInt(month);
              if (!matchesMonth) return false;
              return showArchived ? true : !s.archived;
            }).map(sale => (
              <tr key={sale.id} className="hover:bg-zinc-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-lg bg-emerald-400/10 text-emerald-500 w-fit">
                      Concluída
                    </span>
                    {sale.archived && (
                      <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-lg bg-zinc-100 text-zinc-500 w-fit">
                        Arquivada
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-bold">{sale.customerName}</div>
                  <div className="text-xs text-zinc-500">{sale.customerPhone}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    {sale.items.map((item, idx) => (
                      <div key={idx} className="text-xs">
                        <span className="font-bold">{item.productName}</span>
                        <span className="text-zinc-500 ml-2">({item.variation.color}/{item.variation.size}) x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 font-bold">KZ {(sale.totalAmount || 0).toFixed(2)}</td>
                <td className="px-6 py-4 text-sm">{safeFormatDate(sale.createdAt, 'dd/MM/yyyy')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};
export default SalesTab;
