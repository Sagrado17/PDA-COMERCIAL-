/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Package, Star, Clock, X, MessageCircle, Truck } from 'lucide-react';
import { cn } from '../../lib/utils';

export const PromotionalModal = React.memo(({ isOpen, onClose, storeName }: { isOpen: boolean; onClose: () => void; storeName: string }) => {
  const benefits = [
    {
      icon: Truck,
      title: "Pagamento na Entrega",
      description: "Compre com confiança e pague apenas ao receber o seu produto.",
      color: "bg-orange-50 text-orange-600"
    },
    {
      icon: Clock,
      title: "Reservas Online",
      description: "Garanta os seus produtos favoritos antes que esgotem do estoque.",
      color: "bg-blue-50 text-blue-600"
    },
    {
      icon: MessageCircle,
      title: "Suporte Total",
      description: "Estamos sempre disponíveis via WhatsApp e Telefone para o ajudar.",
      color: "bg-emerald-50 text-emerald-600"
    },
    {
      icon: Package,
      title: "Qualidade Garantida",
      description: "Produtos selecionados com rigor para garantir a sua satisfação.",
      color: "bg-purple-50 text-purple-600"
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="welcome-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-zinc-900/60 backdrop-blur-sm"
        >
          <motion.div
            key="welcome-modal"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white rounded-[40px] shadow-2xl max-w-2xl w-full overflow-hidden relative"
          >
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 hover:bg-zinc-100 rounded-full transition-colors z-10"
            >
              <X className="w-6 h-6 text-zinc-400" />
            </button>

            <div className="p-6 sm:p-10">
              <div className="text-center mb-6 sm:mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-2xl sm:rounded-3xl mb-4">
                  <Star className="w-6 h-6 sm:w-8 sm:h-8 text-primary fill-primary" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-display font-bold mb-2 uppercase tracking-tight">Bem-vindo à {storeName}</h2>
                <p className="text-xs sm:text-sm text-zinc-500 font-medium max-w-[280px] mx-auto">Conheça as vantagens exclusivas de comprar connosco.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-h-[40vh] sm:max-h-none overflow-y-auto pr-1 -mr-1">
                {benefits.map((benefit, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-4 rounded-2xl border border-zinc-100 hover:border-primary/20 transition-all bg-zinc-50/50"
                  >
                    <div className={cn("p-2.5 rounded-xl shrink-0", benefit.color)}>
                      <benefit.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xs mb-0.5">{benefit.title}</h3>
                      <p className="text-[10px] text-zinc-500 leading-tight font-medium">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 sm:mt-8">
                <button 
                  onClick={onClose}
                  className="w-full bg-zinc-900 text-white py-4 rounded-xl font-bold hover:bg-primary transition-all shadow-xl shadow-zinc-900/10 uppercase tracking-widest text-xs"
                >
                  Explorar a Loja
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
