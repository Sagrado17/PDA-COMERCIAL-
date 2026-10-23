/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { ChevronRight, Bell, X } from 'lucide-react';
import { Sale } from '../../types';

export const RealtimeNotificationToast = ({ 
  reservation, 
  onClose, 
  onView 
}: { 
  reservation: Sale; 
  onClose: () => void; 
  onView: () => void;
  key?: React.Key;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.9 }}
      className="fixed bottom-24 right-6 z-[130] bg-zinc-950 text-white rounded-3xl p-5 shadow-2xl border border-zinc-805 flex items-start gap-4 max-w-md w-full"
    >
      <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white flex-shrink-0 md:flex-none">
        <Bell className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-orange-400 font-bold uppercase tracking-widest">
            Nova Reserva Recebida!
          </span>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <h4 className="font-bold text-sm truncate">{reservation.customerName || 'Cliente'}</h4>
        <p className="text-xs text-zinc-400 truncate mt-0.5">
          {reservation.items.map(i => `${i.productName} (x${i.quantity})`).join(', ')}
        </p>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800">
          <span className="text-xs font-bold text-orange-400">
            KZ {reservation.totalAmount.toLocaleString()}
          </span>
          <button
            onClick={() => {
              onClose();
              onView();
            }}
            className="text-[10px] font-black uppercase tracking-wider text-white hover:text-orange-400 transition-colors flex items-center gap-1 font-bold"
          >
            Ver Detalhes
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
