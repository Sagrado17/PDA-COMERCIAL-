/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Truck, MapPin } from 'lucide-react';
import { cn } from '../../lib/utils';

export const ProvinceSelectorModal = React.memo(({ 
  isOpen, 
  onClose, 
  selectedProvince, 
  onSelectProvince 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  selectedProvince: string; 
  onSelectProvince: (p: string) => void; 
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.95, y: 15 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 15 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-zinc-100 relative"
        >
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400 hover:text-zinc-600"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-zinc-900">Sua Localização</h3>
              <p className="text-xs text-zinc-400">Escolha a província para ver a disponibilidade de estoque</p>
            </div>
          </div>

          <div className="grid gap-3 my-5">
            {[
              { id: 'Huíla', name: 'Huíla', detail: 'Lubango e municípios vizinhos' },
              { id: 'Cunene', name: 'Cunene', detail: 'Ondjiva, Namacunde e regiões' }
            ].map(p => {
              const isSelected = selectedProvince === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectProvince(p.id);
                    onClose();
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left group",
                    isSelected 
                      ? "border-orange-500 bg-orange-50/50 shadow-sm" 
                      : "border-zinc-100 hover:border-zinc-200 bg-zinc-50/40"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                      isSelected ? "border-orange-600 bg-orange-600" : "border-zinc-300"
                    )}>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-zinc-900 group-hover:text-orange-600 transition-colors">
                        Província da {p.name}
                      </div>
                      <div className="text-[11px] text-zinc-400 font-medium">
                        {p.detail}
                      </div>
                    </div>
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md",
                    isSelected ? "bg-orange-600 text-white" : "bg-zinc-100 text-zinc-500"
                  )}>
                    {isSelected ? 'Ativo' : 'Selecionar'}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="p-3 bg-zinc-50 rounded-xl text-center border border-zinc-100">
            <p className="text-[11px] text-zinc-500 font-medium flex items-center justify-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-orange-600" />
              <span>Entregas rápidas com pagamento no acto da entrega</span>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});
