/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, CheckCircle2, X } from 'lucide-react';
import { SafeImage } from '../SafeImage';
import { Product, CartItem } from '../../types';

export const CartAddedNotification = React.memo(({ 
  addedItem, 
  onClose, 
  onViewCart,
  totalCartItems 
}: { 
  addedItem: { item: CartItem; timestamp: number } | null; 
  onClose: () => void; 
  onViewCart: () => void;
  totalCartItems: number;
}) => {
  useEffect(() => {
    if (!addedItem) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4200);
    return () => clearTimeout(timer);
  }, [addedItem, onClose]);

  return (
    <AnimatePresence>
      {addedItem && (
        <motion.div
          key={addedItem.timestamp}
          initial={{ opacity: 0, y: 50, scale: 0.88 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.92 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
          className="fixed bottom-20 sm:bottom-8 right-4 sm:right-8 z-[200] max-w-sm w-[calc(100vw-2rem)] sm:w-96 bg-zinc-950/95 backdrop-blur-xl text-white p-4 rounded-3xl shadow-2xl border border-zinc-800/80 flex items-center gap-3.5 ring-1 ring-white/10"
        >
          {/* Animated Product Image with Cart Badge */}
          <div className="relative w-14 h-14 flex-shrink-0 rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center p-1">
            {addedItem.item.image ? (
              <SafeImage src={addedItem.item.image} className="w-full h-full object-contain" />
            ) : (
              <ShoppingCart className="w-6 h-6 text-orange-500" />
            )}
            <span className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-1 shadow-lg ring-2 ring-zinc-950">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <motion.div
                animate={{ rotate: [0, -14, 14, -8, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6 }}
              >
                <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />
              </motion.div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                Adicionado ao Carrinho!
              </span>
            </div>
            <h4 className="font-bold text-xs text-zinc-100 truncate">{addedItem.item.productName}</h4>
            <p className="text-[10px] text-zinc-400 truncate mt-0.5">
              <span className="text-zinc-200 font-semibold">{addedItem.item.quantity}x</span> • {addedItem.item.variation.color}/{addedItem.item.variation.size} • <span className="text-orange-400 font-bold">KZ {(addedItem.item.price * addedItem.item.quantity).toLocaleString()}</span>
            </p>
          </div>

          {/* Action */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => {
                onClose();
                onViewCart();
              }}
              className="bg-orange-600 hover:bg-orange-500 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-lg shadow-orange-600/30 whitespace-nowrap"
            >
              Ver Carrinho
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

// --- Main App ---
