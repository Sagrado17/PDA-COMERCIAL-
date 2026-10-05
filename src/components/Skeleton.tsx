import React from 'react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export const Skeleton: React.FC<{
  className?: string;
  variant?: 'rect' | 'circle' | 'text';
}> = ({ className, variant = 'rect' }) => {
  return (
    <div
      className={cn(
        "bg-zinc-200/75 animate-shimmer relative overflow-hidden",
        variant === 'circle' && "rounded-full",
        variant === 'text' && "rounded-md h-3.5",
        variant === 'rect' && "rounded-xl",
        className
      )}
    />
  );
};

export const ProductCardSkeleton: React.FC<{ index?: number }> = ({ index = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-[22px] overflow-hidden bg-white border border-[#e7ebf1] shadow-xs flex flex-col justify-between"
    >
      <div>
        {/* Image Placeholder */}
        <div className="aspect-square sm:h-[210px] relative overflow-hidden bg-zinc-100 flex items-center justify-center animate-shimmer">
          <div className="absolute top-2.5 left-2.5 w-16 h-4 bg-zinc-200/80 rounded-md" />
          <div className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-zinc-200/80" />
        </div>

        {/* Content Placeholder */}
        <div className="p-2 sm:p-2.5 pt-2 pb-2 space-y-2">
          {/* Category & Rating */}
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="w-16 h-2.5 rounded" />
            <Skeleton className="w-10 h-2.5 rounded" />
          </div>

          {/* Title */}
          <Skeleton className="w-4/5 h-3.5 rounded" />

          {/* Price & Action */}
          <div className="flex items-center justify-between pt-1">
            <Skeleton className="w-20 h-4 rounded" />
            <div className="flex items-center gap-1.5">
              <Skeleton variant="circle" className="w-6 h-6" />
              <Skeleton variant="circle" className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const CommentSkeleton: React.FC = () => {
  return (
    <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100 space-y-2.5 animate-shimmer">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Skeleton variant="circle" className="w-8 h-8" />
          <div className="space-y-1">
            <Skeleton className="w-24 h-3 rounded" />
            <Skeleton className="w-16 h-2 rounded" />
          </div>
        </div>
        <Skeleton className="w-16 h-3 rounded" />
      </div>
      <Skeleton className="w-full h-3 rounded" />
      <Skeleton className="w-3/4 h-3 rounded" />
    </div>
  );
};

export const StorePageSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Top Header Placeholder */}
      <header className="bg-[#03285c] text-white py-3 px-4 sm:px-6 shadow-md">
        <div className="container max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-[9px] bg-white/20" />
            <div className="space-y-1">
              <Skeleton className="w-16 h-3 bg-white/20 rounded" />
              <Skeleton className="w-12 h-2 bg-white/20 rounded" />
            </div>
          </div>
          <div className="flex-1 max-w-md hidden sm:block">
            <Skeleton className="w-full h-8 rounded-full bg-white/15" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="w-14 h-6 rounded-full bg-white/20" />
            <Skeleton variant="circle" className="w-7 h-7 bg-white/20" />
          </div>
        </div>
      </header>

      {/* Main Content Skeleton */}
      <main className="container max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-6">
        {/* Hero Carousel Skeleton */}
        <div className="w-full min-h-[260px] sm:min-h-[290px] md:min-h-[320px] rounded-[26px] bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-200 animate-shimmer p-6 sm:p-10 flex flex-col justify-between">
          <div className="space-y-3 max-w-md">
            <Skeleton className="w-32 h-5 rounded-full bg-zinc-300/80" />
            <Skeleton className="w-3/4 h-8 sm:h-10 rounded-xl bg-zinc-300/80" />
            <Skeleton className="w-1/2 h-4 rounded-lg bg-zinc-300/70" />
          </div>
          <Skeleton className="w-28 h-9 rounded-full bg-zinc-300/80" />
        </div>

        {/* Categories Bar Skeleton */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Skeleton className="w-24 h-5 rounded" />
            <Skeleton className="w-16 h-3 rounded" />
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-2xl bg-zinc-100" />
            ))}
          </div>
        </div>

        {/* Catalog Header & Filter Skeleton */}
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="w-36 h-6 rounded" />
          <div className="flex gap-2">
            <Skeleton className="w-28 h-8 rounded-xl" />
            <Skeleton className="w-32 h-8 rounded-xl" />
          </div>
        </div>

        {/* Product Cards Grid Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6">
          {[...Array(6)].map((_, i) => (
            <ProductCardSkeleton key={i} index={i} />
          ))}
        </div>
      </main>
    </div>
  );
};

export const TopProgressBar: React.FC<{ isAnimating: boolean }> = ({ isAnimating }) => {
  if (!isAnimating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-transparent overflow-hidden pointer-events-none">
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: '100%' }}
        transition={{
          repeat: Infinity,
          duration: 1.2,
          ease: [0.16, 1, 0.3, 1]
        }}
        className="h-full w-1/3 bg-gradient-to-r from-transparent via-[#ff6900] to-orange-400 shadow-sm shadow-orange-500"
      />
    </div>
  );
};
