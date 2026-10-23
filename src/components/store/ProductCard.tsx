/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, wrap } from 'motion/react';
import { Plus, ChevronRight, ChevronLeft, CreditCard } from 'lucide-react';
import { getProductStock } from '../../lib/stockUtils';
import { cn } from '../../lib/utils';
import { SafeImage } from '../SafeImage';
import { Product, Stock, CartItem, DiscountSettings } from '../../types';

export const ProductCard = React.memo(({ 
  product, 
  onSelect, 
  stock, 
  onCallUs, 
  selectedProvince,
  onAddToCart,
  isFavorite,
  onToggleFavorite,
  priceColor,
  discountSettings,
  index = 0
}: { 
  product: Product; 
  onSelect: (p: Product) => void; 
  stock: Stock[]; 
  onCallUs: () => void; 
  selectedProvince: string; 
  onAddToCart?: (item: CartItem) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (productId: string, e?: React.MouseEvent) => void;
  priceColor?: string;
  discountSettings?: DiscountSettings;
  index?: number;
  key?: React.Key 
}) => {
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [isAddedQuickly, setIsAddedQuickly] = useState(false);

  const hasDiscount = useMemo(() => {
    if (!discountSettings || discountSettings.enabled === false) return false;
    if (discountSettings.applyToAll) return true;
    return discountSettings.selectedProductIds?.includes(product.id) ?? false;
  }, [discountSettings, product.id]);

  const discountPercentage = discountSettings?.percentage ?? 20;
  
  const totalStock = useMemo(() => getProductStock(product.id, stock), [stock, product.id]);
  const provinceStock = useMemo(() => {
    return selectedProvince ? getProductStock(product.id, stock, selectedProvince) : totalStock;
  }, [stock, product.id, selectedProvince, totalStock]);

  const isOutOfStockInProvince = selectedProvince ? (provinceStock <= 0) : false;
  const isOutOfStockEverywhere = totalStock <= 0;
  const isOutOfStock = selectedProvince ? isOutOfStockInProvince : isOutOfStockEverywhere;

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImgIndex((prev) => (prev + 1) % product.images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImgIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock || !onAddToCart) {
      onSelect(product);
      return;
    }
    const defaultColor = product.attributes.colors[0] || 'Padrão';
    const defaultSize = product.attributes.sizes[0] || 'Único';
    const defaultImage = (product.colorImages && product.colorImages[defaultColor]) || product.images[0] || '';
    
    onAddToCart({
      productId: product.id,
      productName: product.name,
      variation: { color: defaultColor, size: defaultSize },
      quantity: 1,
      price: product.price,
      image: defaultImage
    });
    setIsAddedQuickly(true);
    setTimeout(() => setIsAddedQuickly(false), 1400);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.35, 
        delay: Math.min(index * 0.035, 0.35),
        ease: [0.16, 1, 0.3, 1] 
      }}
      whileHover={{ y: -5, transition: { duration: 0.2, ease: "easeOut" } }}
      whileTap={{ scale: 0.98 }}
      className="group cursor-pointer rounded-[22px] overflow-hidden bg-white border border-[#e7ebf1] hover:border-orange-400 hover:shadow-xl transition-all duration-300 relative w-full flex flex-col justify-between shadow-xs"
      onClick={() => onSelect(product)}
    >
      <div>
        <div className="aspect-square sm:h-[210px] relative overflow-hidden bg-[#f3f5f9] flex items-center justify-center">
          <SafeImage 
            src={product.images[currentImgIndex]} 
            alt={product.name}
            className="w-full h-full object-contain p-2.5 sm:p-3 group-hover:scale-105 transition-transform duration-500"
          />

          {/* Favorite Button (Inspired by script ♡ / ♥) */}
          <motion.button 
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.82 }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite?.(product.id, e);
            }}
            aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            className="favorite absolute right-2.5 top-2.5 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/95 backdrop-blur-md shadow-sm border border-zinc-100 flex items-center justify-center text-sm sm:text-base z-20 cursor-pointer"
            title={isFavorite ? "Favoritado" : "Favoritar"}
          >
            {isFavorite ? '❤️' : '♡'}
          </motion.button>
          
          {product.images.length > 1 && (
            <>
              <button 
                onClick={prevImage}
                aria-label="Imagem anterior"
                className="opacity-0 group-hover:opacity-100 absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-zinc-800 shadow-sm transition-opacity hover:bg-white z-10"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={nextImage}
                aria-label="Próxima imagem"
                className="opacity-0 group-hover:opacity-100 absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-zinc-800 shadow-sm transition-opacity hover:bg-white z-10"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1 z-10 pointer-events-none">
                {product.images.map((_, idx) => (
                  <div 
                    key={idx}
                    className={cn(
                      "h-1 rounded-full transition-all duration-300",
                      currentImgIndex === idx ? "w-3 bg-orange-600" : "w-1 bg-zinc-300/80"
                    )}
                  />
                ))}
              </div>
            </>
          )}

          {/* Availability badge & Discount Badge */}
          <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 flex-wrap">
            {isOutOfStockEverywhere ? (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-zinc-900/80 text-white backdrop-blur-sm">
                Esgotado
              </span>
            ) : (selectedProvince && isOutOfStockInProvince) ? (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-amber-500 text-white shadow-sm">
                Disp. no {selectedProvince === 'Huíla' ? 'Cunene' : 'Huíla'}
              </span>
            ) : (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-emerald-600 text-white shadow-sm flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Em estoque
              </span>
            )}

            {hasDiscount && (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-[#ff6900] text-white shadow-sm">
                -{discountPercentage}%
              </span>
            )}
          </div>
        </div>

        {/* Informações Compactas do Produto */}
        <div className="p-2 sm:p-2.5 pt-1.5 pb-2 space-y-1">
          {/* Categoria e Avaliação */}
          <div className="flex items-center justify-between gap-1 leading-none">
            <span className="text-[8.5px] sm:text-[9.5px] font-bold uppercase tracking-wider text-[#ff6900] truncate block">
              {product.category}
            </span>
            <div className="flex items-center gap-0.5 text-[8.5px] sm:text-[9.5px] font-bold text-zinc-600 bg-zinc-100 px-1 py-0.5 rounded leading-none shrink-0">
              <span className="text-[9px]">⭐</span>
              <span>{(product.rating || 4.8).toFixed(1)}</span>
            </div>
          </div>

          {/* Nome do Produto */}
          <h3 className="font-bold text-[11px] sm:text-xs text-[#142238] leading-snug line-clamp-1 group-hover:text-[#ff6900] transition-colors">
            {product.name}
          </h3>

          {/* Preço e Botão Rápido */}
          <div className="flex items-center justify-between gap-1 pt-0.5">
            <div className="flex items-baseline gap-1.5 overflow-hidden">
              <div 
                className="text-xs sm:text-sm font-black tracking-tight leading-none" 
                style={{ color: priceColor || '#ff6900' }}
              >
                KZ {product.price.toLocaleString('pt-AO')}
              </div>
              {hasDiscount && (
                <span className="text-[9px] sm:text-[10px] text-zinc-400 line-through font-semibold leading-none">
                  KZ {Math.round(product.price / (1 - (discountPercentage / 100))).toLocaleString('pt-AO')}
                </span>
              )}
            </div>

            <button
              onClick={handleQuickAdd}
              disabled={isOutOfStock}
              className={cn(
                "w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-sm sm:text-base text-white shadow-md transition-all active:scale-90 cursor-pointer shrink-0",
                isAddedQuickly 
                  ? "bg-emerald-600 shadow-emerald-600/25 scale-105" 
                  : isOutOfStock
                    ? "bg-zinc-300 text-zinc-500 cursor-not-allowed"
                    : "bg-[#ff6900] hover:bg-[#ff8500] shadow-orange-600/30 hover:scale-105"
              )}
              title={isOutOfStock ? "Esgotado" : "Adicionar ao Carrinho"}
            >
              {isAddedQuickly ? "✓" : <Plus className="w-4 h-4" />}
            </button>
          </div>

          {/* Pagamento no acto da entrega */}
          <div className="flex items-center gap-1 text-[8px] sm:text-[8.5px] text-zinc-400 font-medium truncate pt-1 border-t border-zinc-100 leading-none">
            <CreditCard className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
            <span className="truncate">Pagamento no acto da entrega</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
