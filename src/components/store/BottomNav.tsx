/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { LayoutDashboard, User, Home } from 'lucide-react';
import { cn } from '../../lib/utils';

export const BottomNav = React.memo(({ 
  isAdmin, 
  onOpenDashboard, 
  onGoHome,
  onOpenAdmin,
  currentView
}: { 
  isAdmin: boolean; 
  onOpenDashboard: () => void;
  onGoHome: () => void;
  onOpenAdmin: () => void;
  currentView: 'store' | 'admin';
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          if (currentScrollY > lastScrollY.current + 8 && currentScrollY > 70) {
            setIsVisible(prev => prev ? false : prev);
          } else if (currentScrollY < lastScrollY.current - 8) {
            setIsVisible(prev => !prev ? true : prev);
          }
          lastScrollY.current = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav 
      animate={{ y: isVisible ? 0 : 80, opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="fixed bottom-4 inset-x-0 flex justify-center z-[90] pointer-events-none pb-safe"
    >
      <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-zinc-200/80 w-auto min-w-[200px] max-w-[270px] mx-auto px-4 py-1.5 flex items-center justify-around gap-2 shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-full">
        <button 
          onClick={onGoHome}
          className={cn(
            "flex flex-col items-center gap-0.5 transition-all active:scale-95 py-1 px-3 rounded-full",
            currentView === 'store' ? "text-orange-600 font-bold" : "text-zinc-400 hover:text-zinc-600"
          )}
        >
          <Home className="w-4 h-4" />
          <span className="text-[10px] font-bold tracking-tight">Início</span>
        </button>

        <button 
          onClick={onOpenDashboard}
          className="flex flex-col items-center gap-0.5 text-zinc-400 hover:text-zinc-600 transition-all active:scale-95 py-1 px-3 rounded-full"
        >
          <User className="w-4 h-4" />
          <span className="text-[10px] font-bold tracking-tight">Painel</span>
        </button>
        
        {isAdmin && (
          <button 
            onClick={onOpenAdmin}
            className={cn(
              "flex flex-col items-center gap-0.5 transition-all active:scale-95 py-1 px-3 rounded-full",
              currentView === 'admin' ? "text-orange-600 font-bold" : "text-zinc-400 hover:text-zinc-600"
            )}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-[10px] font-bold tracking-tight">Admin</span>
          </button>
        )}
      </div>
    </motion.nav>
  );
});
