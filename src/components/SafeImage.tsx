import React, { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const SafeImage = React.memo(({ src, alt, className, onLoad, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => {
  const [error, setError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const fallback = 'https://picsum.photos/seed/error/800/800';
  
  // Helper to fix common URL issues
  const getCleanUrl = (url: string) => {
    if (!url) return '';
    let clean = url.trim();
    
    // Fix Google Drive links
    if (clean.includes('drive.google.com')) {
      const id = clean.match(/[-\w]{25,}/);
      if (id) return `https://lh3.googleusercontent.com/u/0/d/${id[0]}`;
    }
    
    // Fix Dropbox links
    if (clean.includes('dropbox.com')) {
      return clean.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace('?dl=0', '');
    }

    // Ensure https if possible
    if (clean.startsWith('http://')) {
      return clean.replace('http://', 'https://');
    }
    
    return clean;
  };

  const finalSrc = (error || !src || (typeof src === 'string' && src.trim() === '')) ? fallback : getCleanUrl(src as string);

  return (
    <>
      {!isLoaded && !error && (
        <span 
          aria-hidden="true" 
          className="absolute inset-0 bg-zinc-200/75 animate-shimmer pointer-events-none rounded-[inherit] z-0" 
        />
      )}
      <img
        src={finalSrc || undefined}
        alt={alt}
        className={`${className || ''} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 ease-out`}
        onLoad={(e) => {
          setIsLoaded(true);
          onLoad?.(e);
        }}
        onError={() => {
          if (!error) setError(true);
          setIsLoaded(true);
        }}
        referrerPolicy="no-referrer"
        loading="lazy"
        decoding="async"
        {...props}
      />
    </>
  );
});

export const safeFormatDate = (dateStr: string | undefined | null, formatStr: string) => {
  if (!dateStr) return '---';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Data Inválida';
    return format(date, formatStr, { locale: ptBR });
  } catch (e) {
    return 'Data Inválida';
  }
};
