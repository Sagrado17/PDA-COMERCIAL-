import React from 'react';
import { motion } from 'motion/react';
import { Trash2 } from 'lucide-react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../../firebase';
import { Customer } from '../../../types';
import { safeFormatDate } from '../../SafeImage';

interface CustomersTabProps {
  customers: Customer[];
}

export const CustomersTab: React.FC<CustomersTabProps> = ({ customers }) => {
  return (
    <motion.div 
      key="customers"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div className="grid md:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-3xl bg-white border border-zinc-200">
          <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Total de Clientes</div>
          <div className="text-3xl font-bold">{customers.length}</div>
        </div>
        <div className="glass p-6 rounded-3xl bg-white border border-zinc-200">
          <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Novos (Mês)</div>
          <div className="text-3xl font-bold">
            {customers.filter(c => {
              const date = new Date(c.createdAt || Date.now());
              const now = new Date();
              return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            }).length}
          </div>
        </div>
      </div>

      <div className="glass rounded-[32px] overflow-hidden bg-white border border-zinc-200">
        <table className="w-full text-left">
          <thead className="bg-zinc-50 text-xs font-bold uppercase tracking-widest text-zinc-500">
            <tr>
              <th className="px-6 py-4">Nome</th>
              <th className="px-6 py-4">Contato</th>
              <th className="px-6 py-4">Cadastro</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {customers.map(customer => (
              <tr key={customer.id} className="hover:bg-zinc-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold">{customer.name}</div>
                  <div className="text-xs text-zinc-500">{customer.email}</div>
                </td>
                <td className="px-6 py-4 font-mono text-sm">{customer.phone}</td>
                <td className="px-6 py-4 text-sm">{safeFormatDate(customer.createdAt, 'dd/MM/yyyy')}</td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => {
                      if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
                        deleteDoc(doc(db, 'customers', customer.id)).catch(err => handleFirestoreError(err, OperationType.DELETE, 'customers'));
                      }
                    }}
                    className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-red-500 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};
export default CustomersTab;
