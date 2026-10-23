/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '../../lib/utils';

export const StarRating = React.memo(({ rating, count, onRate, interactive = false }: { rating?: number; count?: number; onRate?: (val: number) => void; interactive?: boolean }) => {
  const [hover, setHover] = useState(0);
  const displayRating = interactive && hover > 0 ? hover : (rating || 0);

  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            disabled={!interactive}
            onMouseEnter={() => interactive && setHover(star)}
            onMouseLeave={() => interactive && setHover(0)}
            onClick={(e) => {
              e.stopPropagation();
              if (interactive) onRate?.(star);
            }}
            className={cn(
              "transition-all p-0.5",
              interactive ? "cursor-pointer hover:scale-110" : "cursor-default"
            )}
          >
            <Star 
              className={cn(
                "w-4 h-4",
                star <= displayRating ? "fill-orange-400 text-orange-400" : "text-zinc-300"
              )} 
            />
          </button>
        ))}
      </div>
      {count !== undefined && (
        <span className="text-[10px] font-bold text-zinc-400 ml-1">({count})</span>
      )}
    </div>
  );
});
