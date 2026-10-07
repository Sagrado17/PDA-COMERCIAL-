import React from 'react';
import { Loader2 } from 'lucide-react';

interface TabLoadingSkeletonProps {
  label?: string;
}

export const TabLoadingSkeleton: React.FC<TabLoadingSkeletonProps> = ({ 
  label = 'seção' 
}) => {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between p-6 bg-white rounded-3xl border border-zinc-200">
        <div className="space-y-2">
          <div className="h-5 w-48 bg-zinc-200 rounded-lg" />
          <div className="h-3 w-72 bg-zinc-100 rounded-lg" />
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
          <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
          <span>Carregando {label}...</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-32 bg-white rounded-3xl border border-zinc-200 p-6 space-y-3">
          <div className="h-3 w-24 bg-zinc-200 rounded" />
          <div className="h-8 w-36 bg-zinc-300 rounded-xl" />
        </div>
        <div className="h-32 bg-white rounded-3xl border border-zinc-200 p-6 space-y-3">
          <div className="h-3 w-24 bg-zinc-200 rounded" />
          <div className="h-8 w-36 bg-zinc-300 rounded-xl" />
        </div>
        <div className="h-32 bg-white rounded-3xl border border-zinc-200 p-6 space-y-3">
          <div className="h-3 w-24 bg-zinc-200 rounded" />
          <div className="h-8 w-36 bg-zinc-300 rounded-xl" />
        </div>
      </div>

      <div className="h-64 bg-white rounded-[32px] border border-zinc-200 p-6 space-y-4">
        <div className="h-4 w-40 bg-zinc-200 rounded" />
        <div className="space-y-2 pt-2">
          <div className="h-10 bg-zinc-100 rounded-xl" />
          <div className="h-10 bg-zinc-100 rounded-xl" />
          <div className="h-10 bg-zinc-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
};
export default TabLoadingSkeleton;
