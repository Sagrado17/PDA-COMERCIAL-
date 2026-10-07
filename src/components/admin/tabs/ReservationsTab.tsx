import React from 'react';
import { motion } from 'motion/react';
import { Trash2, MessageSquare, MessageCircle } from 'lucide-react';
import { Sale } from '../../../types';
import { safeFormatDate } from '../../SafeImage';
import { cn } from '../../../lib/utils';

interface ReservationsTabProps {
  sales: Sale[];
  handleClearAllCancelledReservations: () => void;
  handleUpdateReservationStatus: (id: string, status: 'paid' | 'cancelled') => void;
  handleDeleteCancelledReservation: (id: string) => void;
}

export const ReservationsTab: React.FC<ReservationsTabProps> = ({
  sales,
  handleClearAllCancelledReservations,
  handleUpdateReservationStatus,
  handleDeleteCancelledReservation,
}) => {
  const cancelledCount = sales.filter(s => s.type === 'reservation' && s.status === 'cancelled').length;

  return (
    <motion.div 
      key="reservations"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between gap-4 flex-wrap px-1">
        <div>
          <h2 className="text-xl font-black text-zinc-900">Reservas de Clientes</h2>
          <p className="text-xs text-zinc-500">Gerencie confirmações de pagamento e cancelamentos</p>
        </div>
        {cancelledCount > 0 && (
          <button
            onClick={handleClearAllCancelledReservations}
            className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar Todas Canceladas ({cancelledCount})</span>
          </button>
        )}
      </div>

      <div className="glass rounded-[32px] overflow-hidden overflow-x-auto bg-white border border-zinc-200">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-zinc-50 text-xs font-bold uppercase tracking-widest text-zinc-500">
            <tr>
              <th className="px-6 py-4">Ações</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Itens</th>
              <th className="px-6 py-4">Total</th>
              <th className="px-6 py-4">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {sales.filter(s => s.type === 'reservation').map(res => (
              <tr key={res.id} className="hover:bg-zinc-50 transition-colors">
                <td className="px-6 py-4 text-center">
                  {res.status === 'pending' && (
                    <div className="flex flex-col gap-2 min-w-[140px]">
                      <button 
                        onClick={() => handleUpdateReservationStatus(res.id, 'paid')}
                        className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-emerald-700 transition-all shadow-sm whitespace-nowrap cursor-pointer"
                      >
                        Confirmar Pagamento
                      </button>
                      <button 
                        onClick={() => handleUpdateReservationStatus(res.id, 'cancelled')}
                        className="border border-red-200 text-red-500 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-red-50 transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                  {res.status === 'cancelled' && (
                    <button 
                      onClick={() => handleDeleteCancelledReservation(res.id)}
                      className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all shadow-xs flex items-center justify-center gap-1.5 mx-auto whitespace-nowrap cursor-pointer active:scale-95"
                      title="Apagar esta reserva cancelada do histórico permanentemente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Apagar Histórico</span>
                    </button>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "text-[10px] font-bold uppercase px-2 py-1 rounded-lg",
                    res.status === 'pending' ? "bg-orange-400/10 text-orange-400" : 
                    res.status === 'paid' ? "bg-emerald-400/10 text-emerald-400" : "bg-red-400/10 text-red-400"
                  )}>
                    {res.status === 'pending' ? 'Pendente' : res.status === 'paid' ? 'Confirmada' : 'Cancelada'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="font-bold">{res.customerName}</div>
                  <div className="text-xs text-zinc-500">{res.customerPhone}</div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {res.channel === 'sms' ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded-md">
                        <MessageSquare className="w-2.5 h-2.5" /> SMS
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                        <MessageCircle className="w-2.5 h-2.5" /> WhatsApp
                      </span>
                    )}
                    {res.customerProvince && (
                      <span className="text-[10px] text-orange-600 font-bold uppercase">
                        {res.customerProvince}
                      </span>
                    )}
                  </div>
                  {(res.customerNeighborhood || res.customerAddress) && (
                    <div className="text-[10px] text-zinc-400 font-medium mt-0.5">
                      {res.customerNeighborhood && `Bairro: ${res.customerNeighborhood}`}
                      {res.customerAddress && ` • Ref: ${res.customerAddress}`}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 min-w-[200px]">
                  <div className="space-y-2">
                    {res.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-4 py-1.5 border-b border-zinc-50 last:border-0">
                        <div>
                          <div className="text-sm font-bold text-zinc-900">{item.productName}</div>
                          <div className="flex gap-1.5 mt-0.5">
                            <span className="text-[9px] font-bold uppercase text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-md">{item.variation.color}</span>
                            <span className="text-[9px] font-bold uppercase text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-md">{item.variation.size}</span>
                          </div>
                        </div>
                        <div className="text-xs font-bold text-zinc-700 bg-zinc-50 px-2 py-1 rounded-lg">x{item.quantity}</div>
                      </div>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 font-bold text-zinc-900">KZ {(res.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="px-6 py-4 text-sm text-zinc-500">{safeFormatDate(res.createdAt, 'dd/MM/yyyy')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};
export default ReservationsTab;
