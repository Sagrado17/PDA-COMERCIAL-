/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useAnimationFrame, useTransform, wrap } from 'motion/react';
import { Star } from 'lucide-react';
import { SafeImage } from '../SafeImage';
import { Product } from '../../types';

export const FeaturedCarousel = React.memo(({ products, onSelect }: { products: Product[], onSelect: (p: Product) => void }) => {
  const featured = products.filter(p => p.isFeatured);

  // Desktop Carousel Logic
  const cardWidth = 320;
  const gap = 32;
  const totalItemWidth = cardWidth + gap;
  const totalWidth = featured.length * totalItemWidth;
  const displayProducts = useMemo(() => {
    if (featured.length === 0) return [];
    return featured.length > 2 ? [...featured, ...featured] : featured;
  }, [featured]);

  const baseVelocity = -1.2; 
  const baseX = useMotionValue(0);
  const x = useTransform(baseX, (v) => `${wrap(-totalWidth || 1, 0, v)}px`);

  useAnimationFrame((t, delta) => {
    if (featured.length === 0 || typeof window === 'undefined' || window.innerWidth < 640) return;
    let moveBy = baseVelocity * (delta / 18);
    baseX.set(baseX.get() + moveBy);
  });

  // Mobile Sequential Logic
  const [mobileIndex, setMobileIndex] = useState(0);
  useEffect(() => {
    if (featured.length === 0) return;
    const timer = setInterval(() => {
      setMobileIndex(prev => (prev + 1) % featured.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [featured.length]);

  if (featured.length === 0) return null;

  return (
    <div className="my-4">
      {/* Desktop View */}
      <div className="hidden sm:block relative overflow-hidden py-10 rounded-3xl bg-zinc-50/30 border border-zinc-100/50">
        <div className="max-w-7xl mx-auto px-6 mb-4 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-3">
            <div className="h-px w-8 bg-blue-500 rounded-full" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Deslize para navegar</h2>
          </div>
        </div>

        <div className="flex overflow-hidden relative cursor-grab active:cursor-grabbing">
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white/80 via-white/50 to-transparent z-20 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white/80 via-white/50 to-transparent z-20 pointer-events-none" />

          <motion.div 
            className="flex gap-8 px-6"
            style={{ x }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDrag={(e, info) => {
              baseX.set(baseX.get() + info.delta.x);
            }}
            whileTap={{ cursor: "grabbing" }}
          >
            {displayProducts.map((product, idx) => (
              <motion.div 
                key={`${product.id}-${idx}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onSelect(product)}
                className="w-[320px] aspect-[5/7] flex-shrink-0 glass rounded-3xl overflow-hidden relative cursor-pointer group hover:shadow-2xl hover:shadow-blue-600/10 transition-shadow border border-zinc-100/50"
              >
                <SafeImage 
                  src={product.images[0]} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 pointer-events-none"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent p-8 flex flex-col justify-end pointer-events-none">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black text-white bg-blue-600 px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-blue-600/20">
                      Destaque
                    </span>
                    {product.rating && (
                      <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                        <Star className="w-3 h-3 fill-orange-400 text-orange-400" />
                        <span className="text-xs text-white font-bold">{(product.rating || 0).toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  <h3 className="text-white font-bold text-xl leading-tight mb-2 group-hover:text-blue-500 transition-colors">{product.name}</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-white tracking-tight">KZ {product.price.toLocaleString()}</span>
                    <div className="h-1.5 w-1.5 bg-zinc-500 rounded-full" />
                    <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest">Ver Detalhes</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Mobile View - Automating cycle */}
      <div className="sm:hidden px-4">
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-4 px-2">Em Destaque Agora</h2>
        <div className="relative aspect-[4/5] rounded-3xl overflow-hidden shadow-xl border border-zinc-100">
          <AnimatePresence mode="wait">
            <motion.div
              key={featured[mobileIndex].id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onClick={() => onSelect(featured[mobileIndex])}
              className="absolute inset-0 cursor-pointer"
            >
              <SafeImage 
                src={featured[mobileIndex].images[0]} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-6 flex flex-col justify-end">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-white bg-blue-600 px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
                    Destaque
                  </span>
                  <div className="flex gap-1">
                    {featured.map((_, i) => (
                      <div 
                        key={i} 
                        className={`h-1 rounded-full transition-all duration-500 ${i === mobileIndex ? 'w-4 bg-blue-500' : 'w-1 bg-white/30'}`} 
                      />
                    ))}
                  </div>
                </div>
                <h3 className="text-white font-bold text-lg mb-1">{featured[mobileIndex].name}</h3>
                <span className="text-white/80 font-bold text-sm tracking-tight">KZ {featured[mobileIndex].price.toLocaleString()}</span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
});
