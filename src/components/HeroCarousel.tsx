import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Product, SiteSettings, BannerSlide } from '../types';
import { SafeImage } from './SafeImage';
import { cn } from '../lib/utils';

interface HeroCarouselProps {
  products: Product[];
  settings: SiteSettings;
  onSelectProduct: (p: Product) => void;
  onViewOffers: () => void;
}

interface SlideItem {
  id: string;
  isCover: boolean;
  tag: string;
  title: string;
  highlightText: string;
  subtitle: string;
  buttonText: string;
  gradient: string;
  emoji?: string;
  imageUrl?: string;
  price?: string;
  product?: Product | null;
}

const GRADIENTS = [
  'linear-gradient(118deg, #03285c 0%, #063d78 52%, #ff6400 100%)',
  'linear-gradient(118deg, #081a38 0%, #0c3666 48%, #ea580c 100%)',
  'linear-gradient(118deg, #051937 0%, #0f3e75 50%, #f97316 100%)',
  'linear-gradient(118deg, #021e42 0%, #0b498f 54%, #ff7a18 100%)',
  'linear-gradient(118deg, #0f172a 0%, #1e3a8a 52%, #ff6900 100%)',
];

export const HeroCarousel: React.FC<HeroCarouselProps> = ({
  products,
  settings,
  onSelectProduct,
  onViewOffers,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Generate slides: Slide 0 is ALWAYS the Cover ("Tudo o que você precisa num só lugar!") with shoe emoji
  // Following slides are custom slides from settings or featured products with real images in bottom-right
  const slides: SlideItem[] = useMemo(() => {
    // 1. Capa (Slide 0)
    const coverSlide: SlideItem = {
      id: 'cover-slide',
      isCover: true,
      tag: '🔥 OFERTAS PDA COMERCIAL',
      title: 'Tudo o que você precisa',
      highlightText: 'num só lugar!',
      subtitle: settings.storeDescription || 'Roupas • Calçados • Computadores e muito mais...',
      buttonText: 'Ver Ofertas →',
      gradient: GRADIENTS[0],
      emoji: '👟',
      product: null,
    };

    const result: SlideItem[] = [coverSlide];

    // 2. Custom slides configured in SiteSettings
    if (settings.bannerSlides && settings.bannerSlides.length > 0) {
      settings.bannerSlides.forEach((bs, index) => {
        const linkedProduct = bs.productId ? products.find(p => p.id === bs.productId) : null;
        result.push({
          id: bs.id || `custom-${index}`,
          isCover: false,
          tag: bs.tag || '✨ OFERTA EM DESTAQUE',
          title: bs.title || 'Destaque Especial',
          highlightText: bs.highlightText || 'na PDA Comercial',
          subtitle: bs.subtitle || 'Confira os melhores produtos com a qualidade e rapidez que você merece.',
          buttonText: bs.buttonText || (linkedProduct ? 'Ver Detalhes →' : 'Ver Ofertas →'),
          gradient: bs.gradient || GRADIENTS[(index + 1) % GRADIENTS.length],
          imageUrl: bs.imageUrl || linkedProduct?.images[0],
          price: linkedProduct ? `KZ ${linkedProduct.price.toLocaleString('pt-AO')}` : undefined,
          product: linkedProduct || null,
        });
      });
    }

    // 3. If there are fewer than 4 slides, automatically add featured products with images
    if (result.length < 4) {
      // Prioritize featured products with images, or products with images
      const featured = products
        .filter(p => p.images && p.images.length > 0)
        .sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));

      const alreadyAddedProductIds = new Set(result.map(r => r.product?.id).filter(Boolean));

      for (const p of featured) {
        if (alreadyAddedProductIds.has(p.id)) continue;
        if (result.length >= 5) break;

        const slideIdx = result.length;
        result.push({
          id: `product-slide-${p.id}`,
          isCover: false,
          tag: p.isFeatured ? '⭐ EM DESTAQUE EXCLUSIVO' : `⚡ CATEGORIA ${p.category.toUpperCase()}`,
          title: p.name,
          highlightText: `por KZ ${p.price.toLocaleString('pt-AO')}`,
          subtitle: p.description 
            ? (p.description.length > 95 ? `${p.description.slice(0, 92)}...` : p.description)
            : 'Produto disponível para entrega imediata em Huíla e Cunene.',
          buttonText: 'Ver Detalhes →',
          gradient: GRADIENTS[slideIdx % GRADIENTS.length],
          imageUrl: p.images[0],
          price: `KZ ${p.price.toLocaleString('pt-AO')}`,
          product: p,
        });
        alreadyAddedProductIds.add(p.id);
      }
    }

    return result;
  }, [products, settings]);

  // Safe navigation
  const nextSlide = useCallback(() => {
    setCurrentSlide(prev => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  // Autoplay
  useEffect(() => {
    if (isHovered || slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 5500);

    return () => clearInterval(interval);
  }, [isHovered, slides.length]);

  // Reset currentSlide if index is out of bounds
  useEffect(() => {
    if (currentSlide >= slides.length) {
      setCurrentSlide(0);
    }
  }, [currentSlide, slides.length]);

  const activeSlide = slides[currentSlide] || slides[0];

  return (
    <section className="section mt-5 select-none">
      <div 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="hero relative min-h-[260px] sm:min-h-[290px] md:min-h-[320px] rounded-[26px] p-5 sm:p-8 md:p-10 text-white overflow-hidden flex items-center shadow-xl shadow-[#03285c]/20 group transition-all duration-700"
        style={{
          background: activeSlide.gradient
        }}
      >
        {/* Decorative Ambient Circles / Mesh */}
        <div className="absolute -right-24 -top-24 w-72 h-72 sm:w-80 sm:h-80 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="absolute right-1/4 -bottom-20 w-60 h-60 rounded-full bg-orange-500/20 blur-2xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-48 h-48 rounded-full bg-blue-400/10 blur-xl pointer-events-none" />

        {/* Content with animated slide transition */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSlide.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.45, ease: 'easeInOut' }}
            className="hero-content relative z-10 max-w-[62%] sm:max-w-[60%] md:max-w-xl"
          >
            {/* Tag / Badge */}
            <div className="inline-flex items-center gap-1.5 text-[9.5px] sm:text-xs font-black tracking-wider uppercase bg-white/15 backdrop-blur-md px-3 py-1 rounded-full text-orange-300 border border-white/20 mb-2 sm:mb-3 shadow-xs">
              <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
              <span>{activeSlide.tag}</span>
            </div>

            {/* Title / Legenda Principal */}
            <h1 className="text-xl sm:text-3xl md:text-5xl font-black leading-tight tracking-tight text-white drop-shadow-sm">
              {activeSlide.title}{' '}
              <strong className="text-[#ff8500] font-black inline">
                {activeSlide.highlightText}
              </strong>
            </h1>

            {/* Subtítulo / Legenda Secundária */}
            <p className="mt-2 sm:mt-3 text-white/90 text-xs sm:text-sm md:text-base font-medium leading-relaxed line-clamp-2 sm:line-clamp-3 max-w-lg">
              {activeSlide.subtitle}
            </p>

            {/* CTA Button */}
            <div className="mt-4 sm:mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  if (activeSlide.isCover || !activeSlide.product) {
                    onViewOffers();
                  } else {
                    onSelectProduct(activeSlide.product);
                  }
                }}
                className="hero-button px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-[#ff6900] hover:bg-[#ff8500] text-white font-bold text-xs sm:text-sm shadow-lg shadow-orange-600/35 active:scale-95 transition-all cursor-pointer flex items-center gap-2 group/btn"
              >
                <span>{activeSlide.buttonText}</span>
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Right Corner Presentation */}
        <AnimatePresence mode="wait">
          {activeSlide.isCover ? (
            /* PRIMEIRO BANNER (CAPA): O enoje de sapato 👟 */
            <motion.div
              key="cover-emoji"
              initial={{ opacity: 0, scale: 0.8, rotate: -20 }}
              animate={{ opacity: 0.95, scale: 1, rotate: -12 }}
              exit={{ opacity: 0, scale: 0.8, rotate: 10 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="hero-product flex absolute right-3 sm:right-8 md:right-12 bottom-3 sm:bottom-4 text-7xl sm:text-8xl md:text-9xl select-none transform hover:rotate-0 transition-transform duration-500 drop-shadow-2xl pointer-events-none"
            >
              <span className="inline-block transform hover:scale-110 transition-transform">
                {activeSlide.emoji || '👟'}
              </span>
            </motion.div>
          ) : (
            /* SEGUINTES BANNERS (DESTAQUE): A imagem real do produto em destaque com degrade e design moderno */
            <motion.div
              key={`product-img-${activeSlide.id}`}
              initial={{ opacity: 0, scale: 0.85, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: -15 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="hero-product absolute right-2 sm:right-6 md:right-10 bottom-3 sm:bottom-4 md:bottom-5 z-20"
            >
              <div 
                onClick={() => activeSlide.product && onSelectProduct(activeSlide.product)}
                className="group/card cursor-pointer bg-white/95 backdrop-blur-md p-2 sm:p-3 md:p-3.5 rounded-2xl sm:rounded-3xl border border-white/50 shadow-2xl shadow-black/40 hover:scale-105 active:scale-95 transition-all duration-300 w-32 sm:w-44 md:w-56"
              >
                {/* Glow Behind Card */}
                <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/30 to-amber-400/30 rounded-3xl blur-md -z-10 opacity-70 group-hover/card:opacity-100 transition-opacity" />

                <div className="w-full aspect-square rounded-xl sm:rounded-2xl overflow-hidden bg-[#f4f6fa] flex items-center justify-center relative p-1.5 sm:p-2 border border-zinc-100">
                  <SafeImage 
                    src={activeSlide.imageUrl || activeSlide.product?.images[0]} 
                    alt={activeSlide.product?.name || activeSlide.title}
                    className="w-full h-full object-contain group-hover/card:scale-110 transition-transform duration-500"
                  />
                  {activeSlide.price && (
                    <span className="absolute bottom-1 left-1 sm:bottom-1.5 sm:left-1.5 bg-zinc-950/85 text-white text-[8.5px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-md shadow-sm backdrop-blur-sm">
                      {activeSlide.price}
                    </span>
                  )}
                </div>

                <div className="mt-1 sm:mt-1.5 px-0.5">
                  <p className="text-[10px] sm:text-xs font-bold text-zinc-900 truncate">
                    {activeSlide.product?.name || activeSlide.title}
                  </p>
                  <span className="text-[8px] sm:text-[9px] font-extrabold text-[#ff6900] uppercase tracking-wider block mt-0.5">
                    Ver Produto ↗
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Carousel Navigation Arrows (visible on hover) */}
        {slides.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              aria-label="Slide anterior"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/30 hover:bg-black/60 text-white/80 hover:text-white backdrop-blur-sm flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer active:scale-90"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextSlide}
              aria-label="Próximo slide"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/30 hover:bg-black/60 text-white/80 hover:text-white backdrop-blur-sm flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer active:scale-90"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Indicadores do carrossel (hero-dots) */}
        {slides.length > 1 && (
          <div className="hero-dots absolute bottom-2.5 sm:bottom-4 left-5 sm:left-8 md:left-10 z-20 flex items-center gap-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={cn(
                  "hero-dot transition-all duration-300 rounded-full cursor-pointer h-2 sm:h-2.5",
                  currentSlide === idx 
                    ? "hero-dot active w-6 sm:w-7 bg-[#ff6900] shadow-sm shadow-orange-500/50" 
                    : "w-2 sm:w-2.5 bg-white/40 hover:bg-white/70"
                )}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
