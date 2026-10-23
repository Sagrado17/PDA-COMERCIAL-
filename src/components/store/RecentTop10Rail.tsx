/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { SafeImage } from '../SafeImage';
import { Product, DiscountSettings } from '../../types';

export const RecentTop10Rail = React.memo(({ 
  products, 
  onSelect,
  priceColor,
  discountSettings
}: { 
  products: Product[]; 
  onSelect: (p: Product) => void; 
  priceColor?: string;
  discountSettings?: DiscountSettings;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isInteracting, setIsInteracting] = useState(false);

  if (!products || products.length === 0) return null;

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Consecutive automatic scroll advancement (loops consecutively through the 10 items)
  useEffect(() => {
    if (isInteracting || products.length <= 1) return;

    const timer = setInterval(() => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        // When reaching the end, smooth loop back to the beginning
        if (scrollLeft + clientWidth >= scrollWidth - 12) {
          scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          scrollRef.current.scrollBy({ left: 140, behavior: 'smooth' });
        }
      }
    }, 3200);

    return () => clearInterval(timer);
  }, [isInteracting, products.length]);

  return (
    <div 
      className="w-full my-3 sm:my-5 p-3.5 sm:p-4 rounded-[24px] bg-white border border-[#e7ebf1] shadow-xs overflow-hidden"
      onMouseEnter={() => setIsInteracting(true)}
      onMouseLeave={() => setIsInteracting(false)}
      onTouchStart={() => setIsInteracting(true)}
      onTouchEnd={() => setTimeout(() => setIsInteracting(false), 2500)}
    >
      {/* Header with Title and Scroll Controls */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff6900] animate-pulse" />
          <h3 className="text-xs sm:text-sm font-black text-[#142238] uppercase tracking-wider">
            10 Recentes em Destaque
          </h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-[#ff6900] border border-orange-200/60">
            Automático
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => scroll('left')}
            className="p-1.5 rounded-full bg-[#f2f4f8] hover:bg-zinc-200 text-[#062b5c] transition-all active:scale-95 cursor-pointer"
            title="Rolar para esquerda"
            aria-label="Rolar para esquerda"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-1.5 rounded-full bg-[#f2f4f8] hover:bg-zinc-200 text-[#062b5c] transition-all active:scale-95 cursor-pointer"
            title="Rolar para direita"
            aria-label="Rolar para direita"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Horizontal Scroll Track */}
      <div 
        ref={scrollRef}
        className="flex gap-2.5 sm:gap-3.5 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory py-1 px-0.5"
      >
        {products.map((product) => {
          const hasDiscount = discountSettings?.enabled !== false && (
            discountSettings?.applyToAll || (discountSettings?.selectedProductIds?.includes(product.id) ?? false)
          );
          const discountPercentage = discountSettings?.percentage ?? 20;

          return (
            <div
              key={`mini-recent-${product.id}`}
              onClick={() => onSelect(product)}
              className="group shrink-0 w-24 sm:w-28 md:w-32 snap-start cursor-pointer transition-transform active:scale-95"
              title={product.name}
            >
              {/* 1:1 Square Image */}
              <div className="aspect-square w-full rounded-2xl overflow-hidden bg-[#f3f5f9] border border-[#e7ebf1] shadow-xs relative group-hover:shadow-md transition-all">
                <SafeImage
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                />
                {hasDiscount && (
                  <span className="absolute top-1.5 left-1.5 bg-[#ff6900] text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-xs pointer-events-none">
                    -{discountPercentage}%
                  </span>
                )}
              </div>

              {/* Price Only - Proportionally Reduced */}
              <div className="mt-1.5 text-center px-0.5">
                {hasDiscount && (
                  <span className="text-[9px] text-zinc-400 line-through font-medium block leading-none mb-0.5">
                    KZ {Math.round(product.price / (1 - (discountPercentage / 100))).toLocaleString('pt-AO')}
                  </span>
                )}
                <span 
                  className="text-[11px] sm:text-xs font-black tracking-tight block truncate"
                  style={{ color: priceColor || '#ff6900' }}
                >
                  KZ {product.price.toLocaleString('pt-AO')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
