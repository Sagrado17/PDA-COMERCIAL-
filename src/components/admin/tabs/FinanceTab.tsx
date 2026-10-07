import React from 'react';
import { motion } from 'motion/react';
import { DollarSign, Plus, Edit, Trash2 } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../../firebase';
import { Debt, Sale, Customer } from '../../../types';
import { safeFormatDate } from '../../SafeImage';

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

export const FinanceTab: React.FC<FinanceTabProps> = ({
  debts,
  sales,
  customers,
  exportToPDF,
  setEditingDebt,
  setDebtForm,
  setIsDebtModalOpen,
  handleDeleteDebt,
}) => {
  return (
    <motion.div 
      key="finance"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <div className="grid md:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-3xl border-red-500/20 bg-red-500/5 border">
          <div className="text-xs font-bold text-red-400 uppercase tracking-widest mb-2">Total em Dívidas</div>
          <div className="text-3xl font-bold">KZ {debts.reduce((acc, d) => acc + d.remainingAmount, 0).toLocaleString()}</div>
        </div>
        <div className="glass p-6 rounded-3xl border-emerald-500/20 bg-emerald-500/5 border">
          <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Recebido (Mês)</div>
          <div className="text-3xl font-bold">KZ {sales.filter(s => s.status === 'paid').reduce((acc, s) => acc + s.paidAmount, 0).toLocaleString()}</div>
        </div>
        <div className="glass p-6 rounded-3xl border-orange-200 bg-orange-50/50 border">
          <div className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-2">Clientes Devedores</div>
          <div className="text-3xl font-bold">{new Set(debts.filter(d => d.status === 'active').map(d => d.customerId)).size}</div>
        </div>
      </div>

      <div className="glass rounded-[32px] overflow-hidden bg-white border border-zinc-200">
        <div className="p-6 border-b border-zinc-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <h3 className="font-bold">Controle de Devedores</h3>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={() => exportToPDF('debts')}
              className="text-xs font-bold text-orange-600 uppercase tracking-widest hover:text-orange-500 flex items-center gap-2 cursor-pointer"
            >
              <DollarSign className="w-4 h-4" />
              Exportar Relatório
            </button>
            <button 
              onClick={() => {
                setEditingDebt(null);
                setDebtForm({ customerName: '', customerPhone: '', amount: 0, remainingAmount: 0, dueDate: '' });
                setIsDebtModalOpen(true);
              }}
              className="bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-orange-700 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nova Dívida
            </button>
          </div>
        </div>
        <table className="w-full text-left">
          <thead className="bg-zinc-50 text-xs font-bold uppercase tracking-widest text-zinc-500">
            <tr>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Valor Original</th>
              <th className="px-6 py-4">Saldo Devedor</th>
              <th className="px-6 py-4">Vencimento</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {debts.map(debt => {
              const customer = customers.find(c => c.id === debt.customerId);
              return (
                <tr key={debt.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold">{customer?.name}</div>
                    <div className="text-xs text-zinc-500">{customer?.phone}</div>
                  </td>
                  <td className="px-6 py-4 text-sm">KZ {(debt.amount || 0).toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <span className="text-red-400 font-bold">KZ {(debt.remainingAmount || 0).toFixed(2)}</span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {safeFormatDate(debt.dueDate, 'dd/MM/yyyy')}
                  </td>
                  <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                    <button 
                      onClick={() => {
                        setEditingDebt(debt);
                        setDebtForm({ 
                          customerName: customer?.name || '', 
                          customerPhone: customer?.phone || '', 
                          amount: debt.amount || 0, 
                          remainingAmount: debt.remainingAmount || 0, 
                          dueDate: debt.dueDate || '' 
                        });
                        setIsDebtModalOpen(true);
                      }}
                      className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-orange-600 transition-all cursor-pointer"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteDebt(debt.id)}
                      className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-red-600 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={async () => {
                        if (window.confirm('Deseja baixar o pagamento total desta dívida?')) {
                          try {
                            await updateDoc(doc(db, 'debts', debt.id), { 
                              remainingAmount: 0, 
                              status: 'paid',
                              paidAt: new Date().toISOString()
                            });
                          } catch (err) {
                            handleFirestoreError(err, OperationType.UPDATE, `debts/${debt.id}`);
                          }
                        }
                      }}
                      className="bg-emerald-600/20 text-emerald-600 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-emerald-600 hover:text-white transition-all cursor-pointer"
                    >
                      Baixar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};
export default FinanceTab;
