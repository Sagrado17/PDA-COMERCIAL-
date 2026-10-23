/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, X } from 'lucide-react';
import { SafeImage } from '../SafeImage';

export const AdModal = React.memo(({ isOpen, onClose, settings }: { isOpen: boolean; onClose: () => void; settings: any }) => {
  if (!settings.showAd || !settings.adImageUrl) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-[40px] overflow-hidden shadow-2xl"
          >
            <div className="relative">
              <div className="relative group overflow-hidden bg-zinc-100 flex items-center justify-center">
                <SafeImage 
                  src={settings.adImageUrl} 
                  className="w-full h-auto max-h-[80vh] object-contain"
                />
                <button 
                  onClick={onClose}
                  className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/40 transition-all border border-white/20 z-10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pb-8 p-8 flex flex-col gap-4">
                <button
                  onClick={onClose}
                  className="w-full py-5 rounded-2xl bg-white text-black font-bold flex items-center justify-center gap-3 transition-all shadow-xl active:scale-[0.98] hover:bg-zinc-100"
                >
                  Ver Mais Detalhes
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
});

// --- Storefront Components ---
