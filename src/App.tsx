/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  motion, 
  AnimatePresence,
  useMotionValue,
  useAnimationFrame,
  useTransform,
  wrap
} from 'motion/react';
import { 
  ShoppingBag, 
  LayoutDashboard, 
  Package, 
  Users, 
  DollarSign, 
  Plus, 
  Search, 
  Filter, 
  SlidersHorizontal,
  ChevronRight, 
  ChevronLeft,
  Star, 
  ShoppingCart, 
  User, 
  LogOut,
  Share2,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Bell,
  BellOff,
  Check,
  ArrowRight,
  Settings,
  Settings2,
  Menu,
  X,
  CreditCard,
  History,
  Trash2,
  Edit,
  Save,
  Layout,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  MessageSquare,
  MessageCircle,
  Phone,
  Mail,
  Home,
  Tag,
  Megaphone,
  Eye,
  Truck,
  Monitor,
  Smartphone,
  Zap,
  MapPin,
  Minus,
  RotateCcw,
  Image as ImageIcon
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc,
  updateDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit,
  getDoc,
  setDoc,
  increment,
  Timestamp
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { 
  db, 
  auth, 
  handleFirestoreError, 
  OperationType 
} from './firebase';
import { cn } from './lib/utils';
import { Product, Stock, Sale, Comment, Rating, CartItem, SiteSettings, Stats, Coupon, DiscountSettings } from './types';
import { getVariationStock, getProductStock, isProductInStock } from './lib/stockUtils';
import { SafeImage, safeFormatDate } from './components/SafeImage';
import { PdaLogo } from './components/PdaLogo';
import { HeroCarousel } from './components/HeroCarousel';
import { 
  Skeleton, 
  ProductCardSkeleton, 
  StorePageSkeleton, 
  CommentSkeleton, 
  TopProgressBar 
} from './components/Skeleton';

const AdminPanel = React.lazy(() => import('./components/AdminPanel'));

const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const [hasError, setHasError] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.error?.message?.includes('operationType')) {
        setHasError(true);
        setErrorInfo(event.error.message);
      }
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <div className="glass p-8 rounded-3xl max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Erro de Permissão</h2>
          <p className="text-zinc-400 mb-6">Você não tem permissão para realizar esta ação ou acessar estes dados.</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold"
          >
            Recarregar Página
          </button>
        </div>
      </div>
    );
  }

  return children;
};


// --- Ad Modal ---
const AdModal = React.memo(({ isOpen, onClose, settings }: { isOpen: boolean; onClose: () => void; settings: any }) => {
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

const StarRating = React.memo(({ rating, count, onRate, interactive = false }: { rating?: number; count?: number; onRate?: (val: number) => void; interactive?: boolean }) => {
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

const FeaturedCarousel = React.memo(({ products, onSelect }: { products: Product[], onSelect: (p: Product) => void }) => {
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

const RecentTop10Rail = React.memo(({ 
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

const ClientDashboard = React.memo(({ 
  isOpen, 
  onClose, 
  user, 
  sales, 
  settings,
  products = [],
  favorites = [],
  cart = [],
  favoritesCount = 0,
  onCallUs,
  onLogout,
  onSelectProduct,
  onToggleFavorite
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  user: any; 
  sales: Sale[]; 
  settings: SiteSettings;
  products?: Product[];
  favorites?: string[];
  cart?: CartItem[];
  favoritesCount?: number;
  onCallUs?: () => void;
  onLogout?: () => void;
  onSelectProduct?: (p: Product) => void;
  onToggleFavorite?: (productId: string, e?: React.MouseEvent) => void;
}) => {
  const [activeModal, setActiveModal] = useState<'orders' | 'profile' | 'address' | 'payments' | 'notifications' | 'favorites' | null>(null);

  const userSales = useMemo(() => {
    let guestIds: string[] = [];
    try {
      guestIds = JSON.parse(localStorage.getItem('my_reservation_ids') || '[]');
    } catch {}
    return sales.filter(s => {
      const isUserUid = Boolean(user?.uid && s.userId === user.uid);
      const isUserPhone = Boolean(user?.phoneNumber && s.customerPhone === user.phoneNumber);
      const isGuestOrder = guestIds.includes(s.id);
      return isUserUid || isUserPhone || isGuestOrder;
    });
  }, [sales, user]);

  const latestSale = userSales[0];

  // Resiliente: utiliza a prop favorites ou o storage pda_favorites
  const effectiveFavorites = useMemo(() => {
    if (Array.isArray(favorites) && favorites.length > 0) return favorites;
    try {
      const stored = localStorage.getItem('pda_favorites');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  }, [favorites]);

  const favoritedProducts = useMemo(() => {
    return products.filter(p => effectiveFavorites.includes(p.id));
  }, [products, effectiveFavorites]);

  const displayName = user?.displayName || (latestSale?.customerName && latestSale.customerName !== 'Consumidor Final' ? latestSale.customerName : 'Cliente');
  const displayEmail = user?.email || (latestSale?.customerPhone ? latestSale.customerPhone : 'Conta Cliente');
  const firstName = displayName.split(' ')[0] || 'Cliente';

  const orderNumber = latestSale ? `Pedido #PDA-${latestSale.id.slice(-6).toUpperCase()}` : '';
  
  const isCancelled = latestSale?.status === 'cancelled';
  const isPaid = latestSale?.status === 'paid';

  let orderStatus = 'Sem encomendas';
  let orderStatusColor = '#64748b';
  let orderStatusBg = '#f1f5f9';

  if (latestSale) {
    if (isCancelled) {
      orderStatus = 'Cancelada';
      orderStatusColor = '#dc2626';
      orderStatusBg = '#fef2f2';
    } else if (isPaid) {
      orderStatus = 'Entregue';
      orderStatusColor = 'var(--verde)';
      orderStatusBg = '#e8f8ef';
    } else {
      orderStatus = 'Em preparação';
      orderStatusColor = '#062b5c';
      orderStatusBg = '#e6f0fa';
    }
  }

  const isStep3Active = isPaid || (latestSale as any)?.status === 'shipping';
  const isStep4Active = isPaid;
  const progressLineWidth = !latestSale ? '0%' : (isCancelled ? '0%' : (isStep4Active ? '100%' : (isStep3Active ? '75%' : '50%')));

  // Números estritamente reais refletindo a realidade do sistema:
  const ordersCount = userSales.length;
  const favsCount = favoritedProducts.length > 0 ? favoritedProducts.length : effectiveFavorites.length;
  const pointsCount = userSales.filter(s => s.status === 'paid').length * 50;

  const handleLogoutClick = async () => {
    const confirmar = window.confirm("Tem a certeza de que pretende sair?");
    if (confirmar) {
      if (onLogout) {
        await onLogout();
      } else {
        await auth.signOut();
      }
      onClose();
    }
  };

  const abrirDefinicoes = () => {
    setActiveModal('profile');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="client-dashboard-screen"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 15 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] overflow-y-auto client-dashboard-root"
        >
          <div className="app dashboard-app">
            {/* =================================================
                 CABEÇALHO
            ================================================== */}
            <header className="dashboard-header">
              <div className="header-top">
                <div className="header-left">
                  <button
                    type="button"
                    className="back-button"
                    onClick={onClose}
                    aria-label="Voltar"
                  >
                    ‹
                  </button>

                  <div className="avatar">
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      '👤'
                    )}
                  </div>

                  <div className="user-info">
                    <h1>{displayName}</h1>
                    <p>{displayEmail}</p>
                  </div>
                </div>

                <button
                  type="button"
                  className="settings"
                  onClick={abrirDefinicoes}
                  aria-label="Definições"
                >
                  ⚙
                </button>
              </div>
            </header>

            {/* =================================================
                 CONTEÚDO
            ================================================== */}
            <main className="container dashboard-container">
              {/* BOAS-VINDAS */}
              <div className="welcome">
                <h2>Olá, {firstName}! 👋</h2>
                <p>Acompanhe a sua conta e as suas encomendas.</p>
              </div>

              {/* =================================================
                   ESTADO DA ENCOMENDA (SÓ EXIBE SE HOUVER ENCOMENDA REAL)
              ================================================== */}
              {latestSale ? (
                <section className="order-card cursor-pointer" onClick={() => setActiveModal('orders')}>
                  <div className="order-top">
                    <div>
                      <div className="order-title">Última encomenda</div>
                      <div className="order-number">{orderNumber}</div>
                    </div>

                    <span 
                      className="order-status font-black"
                      style={{ background: orderStatusBg, color: orderStatusColor }}
                    >
                      {orderStatus}
                    </span>
                  </div>

                  {isCancelled ? (
                    <div className="mt-4 p-3.5 bg-red-50/90 border border-red-200 rounded-2xl text-center">
                      <span className="text-xs font-bold text-red-600 block">
                        ⚠️ Esta encomenda foi cancelada pelo suporte/administrativo.
                      </span>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        Não está em preparação. Fale connosco caso pretenda agendar um novo pedido.
                      </p>
                    </div>
                  ) : (
                    <div className="progress">
                      <div className="progress-line" style={{ width: progressLineWidth }}></div>

                      <div className="progress-item active">
                        <div className="progress-circle">✓</div>
                        <span>Pedido</span>
                      </div>

                      <div className={cn("progress-item", (isPaid || latestSale.status === 'pending') && "active")}>
                        <div className="progress-circle">✓</div>
                        <span>Preparação</span>
                      </div>

                      <div className={cn("progress-item", isStep3Active && "active")}>
                        <div className="progress-circle">{isStep3Active ? '✓' : '3'}</div>
                        <span>Envio</span>
                      </div>

                      <div className={cn("progress-item", isStep4Active && "active")}>
                        <div className="progress-circle">{isStep4Active ? '✓' : '4'}</div>
                        <span>Entregue</span>
                      </div>
                    </div>
                  )}
                </section>
              ) : (
                <section className="order-card text-center py-6 px-4 bg-white border border-dashed border-zinc-200">
                  <div className="w-12 h-12 mx-auto mb-2.5 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center text-xl">
                    📦
                  </div>
                  <h3 className="font-bold text-sm text-[#142238] mb-1">Nenhuma encomenda realizada</h3>
                  <p className="text-xs text-zinc-500 mb-3 max-w-xs mx-auto">
                    Acompanhe aqui o estado das suas compras e entregas em tempo real assim que fizer um pedido.
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 px-4 py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    Explorar produtos da loja
                  </button>
                </section>
              )}

              {/* =================================================
                   ESTATÍSTICAS
              ================================================== */}
              <section className="stats">
                <div className="stat-card cursor-pointer" onClick={() => setActiveModal('orders')}>
                  <div className="stat-icon">📦</div>
                  <div className="stat-value">{ordersCount}</div>
                  <div className="stat-label">Encomendas</div>
                </div>

                <div className="stat-card cursor-pointer" onClick={() => setActiveModal('favorites')}>
                  <div className="stat-icon">❤️</div>
                  <div className="stat-value">{favsCount}</div>
                  <div className="stat-label">Favoritos</div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">🎁</div>
                  <div className="stat-value">{pointsCount}</div>
                  <div className="stat-label">Pontos</div>
                </div>
              </section>

              {/* =================================================
                   ATALHOS
              ================================================== */}
              <h2 className="section-title">Acesso rápido</h2>

              <section className="shortcuts">
                <button type="button" className="shortcut" onClick={() => setActiveModal('orders')}>
                  <div className="shortcut-icon">📦</div>
                  <span>Encomendas ({ordersCount})</span>
                </button>

                <button type="button" className="shortcut" onClick={() => setActiveModal('favorites')}>
                  <div className="shortcut-icon">❤️</div>
                  <span>Favoritos ({favsCount})</span>
                </button>

                <button type="button" className="shortcut" onClick={() => setActiveModal('address')}>
                  <div className="shortcut-icon">📍</div>
                  <span>Endereços</span>
                </button>

                <button type="button" className="shortcut" onClick={() => setActiveModal('payments')}>
                  <div className="shortcut-icon">💳</div>
                  <span>Pagamentos</span>
                </button>
              </section>

              {/* =================================================
                   PRODUTOS FAVORITOS NA TELA DO PAINEL
              ================================================== */}
              {favoritedProducts.length > 0 && (
                <section className="mb-6">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">❤️</span>
                      <h2 className="section-title !mb-0">Meus Produtos Favoritos ({favoritedProducts.length})</h2>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setActiveModal('favorites')}
                      className="text-xs font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
                    >
                      Ver todos ({favoritedProducts.length}) ›
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {favoritedProducts.map(prod => (
                      <div 
                        key={`dash-fav-${prod.id}`}
                        onClick={() => { onSelectProduct?.(prod); onClose(); }}
                        className="flex items-center justify-between gap-3 p-3.5 bg-white rounded-2xl border border-zinc-200/80 hover:border-orange-400 hover:shadow-md transition-all cursor-pointer group"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-zinc-900 truncate group-hover:text-orange-600 transition-colors">
                            {prod.name}
                          </h4>
                          <span className="text-[10px] text-zinc-500 uppercase font-semibold block">
                            {prod.category}
                          </span>
                          <span className="text-xs sm:text-sm font-black text-[#ff6900] block mt-0.5">
                            KZ {prod.price.toLocaleString('pt-AO')}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite?.(prod.id, e);
                          }}
                          className="w-8 h-8 rounded-full bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center text-sm transition-colors shrink-0 cursor-pointer"
                          title="Remover dos favoritos"
                        >
                          ❤️
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* =================================================
                   DUAS COLUNAS
              ================================================== */}
              <div className="content-grid">
                {/* ATIVIDADE RECENTE - DETALHES REAIS */}
                <section className="card">
                  <h2 className="section-title">Atividade recente</h2>

                  {/* 1. Real reservations if any */}
                  {userSales.slice(0, 2).map((sale) => (
                    <div 
                      key={`act-sale-${sale.id}`} 
                      className="activity cursor-pointer hover:bg-zinc-50 px-1 py-2 rounded-xl transition-colors"
                      onClick={() => setActiveModal('orders')}
                    >
                      <div className={cn("activity-icon shrink-0", sale.status === 'cancelled' ? "text-red-500 bg-red-50" : (sale.status === 'paid' ? "text-emerald-600 bg-emerald-50" : "text-blue-600 bg-blue-50"))}>
                        {sale.status === 'cancelled' ? '❌' : (sale.status === 'paid' ? '✅' : '📦')}
                      </div>
                      <div className="activity-text min-w-0">
                        <strong>
                          {sale.status === 'cancelled' 
                            ? `Encomenda cancelada (#PDA-${sale.id.slice(-5).toUpperCase()})` 
                            : (sale.status === 'paid' 
                              ? `Encomenda entregue (#PDA-${sale.id.slice(-5).toUpperCase()})` 
                              : `Encomenda em preparação (#PDA-${sale.id.slice(-5).toUpperCase()})`)}
                        </strong>
                        <span className="truncate block">
                          {sale.items[0]?.productName || 'Produtos'} ({sale.items.reduce((s, i) => s + i.quantity, 0)} un.) • KZ {sale.totalAmount.toLocaleString('pt-AO')} • {new Date(sale.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* 2. Real favorited products if any */}
                  {favoritedProducts.slice(0, 2).map((prod) => (
                    <div 
                      key={`act-fav-${prod.id}`} 
                      className="activity cursor-pointer hover:bg-zinc-50 px-1 py-2 rounded-xl transition-colors"
                      onClick={() => { onSelectProduct?.(prod); onClose(); }}
                    >
                      <div className="activity-icon text-red-500 bg-red-50 shrink-0">
                        ❤️
                      </div>
                      <div className="activity-text min-w-0">
                        <strong>Produto favoritado</strong>
                        <span className="truncate block">{prod.name} • KZ {prod.price.toLocaleString('pt-AO')}</span>
                      </div>
                    </div>
                  ))}

                  {/* 3. Real cart items if any */}
                  {cart.slice(0, 2).map((cItem, cIdx) => (
                    <div key={`act-cart-${cIdx}`} className="activity px-1 py-2">
                      <div className="activity-icon text-orange-600 bg-orange-50 shrink-0">
                        🛒
                      </div>
                      <div className="activity-text min-w-0">
                        <strong>No seu carrinho de compras</strong>
                        <span className="truncate block">{cItem.productName} ({cItem.variation.color}/{cItem.variation.size}) x{cItem.quantity}</span>
                      </div>
                      {cItem.image && (
                        <img src={cItem.image} alt={cItem.productName} className="w-9 h-9 object-cover rounded-lg border border-zinc-200 shrink-0" />
                      )}
                    </div>
                  ))}

                  {/* 4. Clean empty state if user has no real actions yet */}
                  {userSales.length === 0 && favoritedProducts.length === 0 && cart.length === 0 && (
                    <div className="py-6 px-3 text-center">
                      <p className="text-xs text-zinc-400">
                        Ainda não tem atividades recentes. Os seus pedidos, produtos favoritos e itens no carrinho serão listados aqui.
                      </p>
                    </div>
                  )}
                </section>

                {/* PERFIL / CONTA */}
                <section className="card">
                  <h2 className="section-title">Minha conta</h2>

                  <button type="button" className="account-option" onClick={() => setActiveModal('profile')}>
                    <span className="account-icon">👤</span>
                    <span>Dados pessoais</span>
                    <span className="arrow">›</span>
                  </button>

                  <button type="button" className="account-option" onClick={() => setActiveModal('address')}>
                    <span className="account-icon">📍</span>
                    <span>Endereços</span>
                    <span className="arrow">›</span>
                  </button>

                  <button type="button" className="account-option" onClick={() => setActiveModal('notifications')}>
                    <span className="account-icon">🔔</span>
                    <span>Notificações</span>
                    <span className="arrow">›</span>
                  </button>

                  <button type="button" className="account-option" onClick={() => onCallUs ? onCallUs() : setActiveModal('notifications')}>
                    <span className="account-icon">❓</span>
                    <span>Ajuda e suporte</span>
                    <span className="arrow">›</span>
                  </button>
                </section>
              </div>

              {/* SAIR */}
              <button
                type="button"
                className="logout"
                onClick={handleLogoutClick}
              >
                Sair da conta
              </button>
            </main>
          </div>

          {/* =================================================
               MODAIS DE DETALHES RÁPIDOS
          ================================================== */}
          {activeModal && (
            <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-[24px] max-w-lg w-full p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto">
                <button 
                  onClick={() => setActiveModal(null)}
                  className="absolute top-4 right-4 w-9 h-9 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center font-bold text-lg cursor-pointer"
                  aria-label="Fechar"
                >
                  ✕
                </button>

                {/* MODAL: ENCOMENDAS */}
                {activeModal === 'orders' && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-2xl">📦</span>
                      <h3 className="text-lg font-black text-[#132238]">Minhas Encomendas</h3>
                    </div>
                    {userSales.length > 0 ? (
                      <div className="space-y-3">
                        {userSales.map(sale => (
                          <div key={sale.id} className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-zinc-500">
                                #PDA-{sale.id.slice(-6).toUpperCase()} • {new Date(sale.createdAt).toLocaleDateString()}
                              </span>
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-bold",
                                sale.status === 'paid' 
                                  ? "bg-emerald-100 text-emerald-700" 
                                  : (sale.status === 'cancelled' 
                                    ? "bg-red-100 text-red-700" 
                                    : "bg-amber-100 text-amber-700")
                              )}>
                                {sale.status === 'paid' ? 'Entregue' : (sale.status === 'cancelled' ? 'Cancelada' : 'Em preparação')}
                              </span>
                            </div>
                            <div className="space-y-1 mb-2">
                              {sale.items.map((it, idx) => (
                                <div key={idx} className="text-xs text-zinc-700 flex justify-between">
                                  <span>{it.productName} ({it.variation.color}/{it.variation.size}) x{it.quantity}</span>
                                  <span className="font-bold">KZ {(it.price * it.quantity).toLocaleString('pt-AO')}</span>
                                </div>
                              ))}
                            </div>
                            <div className="pt-2 border-t border-zinc-200 flex justify-between text-xs font-bold text-zinc-800">
                              <span>Total da Reserva</span>
                              <span className="text-[#062b5c]">KZ {sale.totalAmount.toLocaleString('pt-AO')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-zinc-500 text-sm">
                        <div className="w-12 h-12 mx-auto mb-2.5 rounded-2xl bg-zinc-100 flex items-center justify-center text-xl">
                          📦
                        </div>
                        <p className="font-bold text-[#132238] mb-1">Nenhuma encomenda registada</p>
                        <p className="text-xs text-zinc-400">Faça a sua primeira reserva na loja para acompanhar os detalhes aqui.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* MODAL: FAVORITOS - LISTADOS REALMENTE */}
                {activeModal === 'favorites' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">❤️</span>
                        <h3 className="text-lg font-black text-[#132238]">Meus Favoritos ({favoritedProducts.length})</h3>
                      </div>
                    </div>

                    {favoritedProducts.length > 0 ? (
                      <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                        {favoritedProducts.map(prod => (
                          <div 
                            key={prod.id}
                            onClick={() => { onSelectProduct?.(prod); onClose(); }}
                            className="flex items-center justify-between gap-3 p-3.5 bg-zinc-50 hover:bg-zinc-100 rounded-2xl border border-zinc-200/80 cursor-pointer transition-colors group"
                          >
                            <div className="flex-1 min-w-0">
                              <strong className="text-xs sm:text-sm font-bold text-zinc-900 block truncate group-hover:text-orange-600 transition-colors">
                                {prod.name}
                              </strong>
                              <span className="text-[10px] text-zinc-500 block uppercase font-semibold">
                                {prod.category}
                              </span>
                              <span className="text-xs sm:text-sm font-black text-[#ff6900] block mt-0.5">
                                KZ {prod.price.toLocaleString('pt-AO')}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleFavorite?.(prod.id, e);
                                }}
                                className="p-2 rounded-xl text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Remover dos favoritos"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <span className="text-xs font-bold text-white bg-[#062b5c] px-3 py-1.5 rounded-xl shadow-xs group-hover:bg-[#ff6900] transition-colors">
                                Ver
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 bg-zinc-50 rounded-2xl text-center">
                        <span className="text-4xl block mb-2">❤️</span>
                        <h4 className="font-bold text-zinc-800 text-sm mb-1">Nenhum produto favoritado ainda</h4>
                        <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                          Clique no coração dos produtos que você mais gostar na loja para que eles fiquem salvos aqui.
                        </p>
                        <button 
                          onClick={() => {
                            setActiveModal(null);
                            onClose();
                          }}
                          className="mt-4 px-5 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold cursor-pointer hover:bg-orange-700 transition-colors shadow-sm"
                        >
                          Explorar Catálogo
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* MODAL: DADOS PESSOAIS */}
                {activeModal === 'profile' && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-2xl">👤</span>
                      <h3 className="text-lg font-black text-[#132238]">Dados Pessoais & Conta</h3>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="p-3 bg-zinc-50 rounded-xl">
                        <span className="text-xs text-zinc-400 block font-bold">Nome</span>
                        <strong className="text-zinc-800">{displayName}</strong>
                      </div>
                      <div className="p-3 bg-zinc-50 rounded-xl">
                        <span className="text-xs text-zinc-400 block font-bold">Email / Identificador</span>
                        <strong className="text-zinc-800">{displayEmail}</strong>
                      </div>
                      <div className="p-3 bg-zinc-50 rounded-xl">
                        <span className="text-xs text-zinc-400 block font-bold">Estado da Conta</span>
                        <strong className="text-emerald-600 font-bold">✓ Cliente Verificado PDA Comercial</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* MODAL: ENDEREÇOS */}
                {activeModal === 'address' && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-2xl">📍</span>
                      <h3 className="text-lg font-black text-[#132238]">Endereços de Entrega</h3>
                    </div>
                    <div className="space-y-3 text-sm text-zinc-700">
                      <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200/80">
                        <span className="text-xs font-bold text-orange-600 block mb-1">Áreas de Entrega Activas</span>
                        <p className="font-semibold text-zinc-800">Cunene (Ondjiva) & Huíla (Lubango)</p>
                        <p className="text-xs text-zinc-500 mt-1">Entrega ao domicílio com rapidez, comodidade e pagamento na entrega.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* MODAL: PAGAMENTOS (MULTICAIXA EXPRESS & CASH) */}
                {activeModal === 'payments' && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-2xl">💳</span>
                      <h3 className="text-lg font-black text-[#132238]">Métodos de Pagamento</h3>
                    </div>
                    <div className="space-y-3 text-sm text-zinc-700">
                      <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200/80">
                        <strong className="block text-zinc-900 mb-1">💵 Pagamento no Acto da Entrega</strong>
                        <p className="text-xs text-zinc-600">Pague apenas quando receber o seu pedido em mãos com total segurança.</p>
                      </div>
                      <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200/80">
                        <strong className="block text-zinc-900 mb-1">💳 Multicaixa Express & Cash</strong>
                        <p className="text-xs text-zinc-600">Aceitamos transferências por Multicaixa Express e pagamento em dinheiro físico (Cash) no acto da entrega com os nossos estafetas.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* MODAL: NOTIFICAÇÕES */}
                {activeModal === 'notifications' && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-2xl">🔔</span>
                      <h3 className="text-lg font-black text-[#132238]">Notificações</h3>
                    </div>
                    <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-sm leading-relaxed border border-emerald-200/80">
                      <strong>Notificações SMS & WhatsApp Activas</strong>
                      <p className="text-xs text-emerald-700 mt-1">
                        Você recebe avisos automáticos e actualizações em tempo real a cada etapa da sua encomenda.
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-6 text-center">
                  <button
                    onClick={() => setActiveModal(null)}
                    className="w-full py-3 bg-[#062b5c] text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-[#031d40] transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

const BottomNav = React.memo(({ 
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

const PromotionalModal = React.memo(({ isOpen, onClose, storeName }: { isOpen: boolean; onClose: () => void; storeName: string }) => {
  const benefits = [
    {
      icon: Truck,
      title: "Pagamento na Entrega",
      description: "Compre com confiança e pague apenas ao receber o seu produto.",
      color: "bg-orange-50 text-orange-600"
    },
    {
      icon: Clock,
      title: "Reservas Online",
      description: "Garanta os seus produtos favoritos antes que esgotem do estoque.",
      color: "bg-blue-50 text-blue-600"
    },
    {
      icon: MessageCircle,
      title: "Suporte Total",
      description: "Estamos sempre disponíveis via WhatsApp e Telefone para o ajudar.",
      color: "bg-emerald-50 text-emerald-600"
    },
    {
      icon: Package,
      title: "Qualidade Garantida",
      description: "Produtos selecionados com rigor para garantir a sua satisfação.",
      color: "bg-purple-50 text-purple-600"
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="welcome-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-zinc-900/60 backdrop-blur-sm"
        >
          <motion.div
            key="welcome-modal"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white rounded-[40px] shadow-2xl max-w-2xl w-full overflow-hidden relative"
          >
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 hover:bg-zinc-100 rounded-full transition-colors z-10"
            >
              <X className="w-6 h-6 text-zinc-400" />
            </button>

            <div className="p-6 sm:p-10">
              <div className="text-center mb-6 sm:mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-2xl sm:rounded-3xl mb-4">
                  <Star className="w-6 h-6 sm:w-8 sm:h-8 text-primary fill-primary" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-display font-bold mb-2 uppercase tracking-tight">Bem-vindo à {storeName}</h2>
                <p className="text-xs sm:text-sm text-zinc-500 font-medium max-w-[280px] mx-auto">Conheça as vantagens exclusivas de comprar connosco.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-h-[40vh] sm:max-h-none overflow-y-auto pr-1 -mr-1">
                {benefits.map((benefit, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-4 rounded-2xl border border-zinc-100 hover:border-primary/20 transition-all bg-zinc-50/50"
                  >
                    <div className={cn("p-2.5 rounded-xl shrink-0", benefit.color)}>
                      <benefit.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xs mb-0.5">{benefit.title}</h3>
                      <p className="text-[10px] text-zinc-500 leading-tight font-medium">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 sm:mt-8">
                <button 
                  onClick={onClose}
                  className="w-full bg-zinc-900 text-white py-4 rounded-xl font-bold hover:bg-primary transition-all shadow-xl shadow-zinc-900/10 uppercase tracking-widest text-xs"
                >
                  Explorar a Loja
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

const ProvinceSelectorModal = React.memo(({ 
  isOpen, 
  onClose, 
  selectedProvince, 
  onSelectProvince 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  selectedProvince: string; 
  onSelectProvince: (p: string) => void; 
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.95, y: 15 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 15 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-zinc-100 relative"
        >
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400 hover:text-zinc-600"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-zinc-900">Sua Localização</h3>
              <p className="text-xs text-zinc-400">Escolha a província para ver a disponibilidade de estoque</p>
            </div>
          </div>

          <div className="grid gap-3 my-5">
            {[
              { id: 'Huíla', name: 'Huíla', detail: 'Lubango e municípios vizinhos' },
              { id: 'Cunene', name: 'Cunene', detail: 'Ondjiva, Namacunde e regiões' }
            ].map(p => {
              const isSelected = selectedProvince === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectProvince(p.id);
                    onClose();
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left group",
                    isSelected 
                      ? "border-orange-500 bg-orange-50/50 shadow-sm" 
                      : "border-zinc-100 hover:border-zinc-200 bg-zinc-50/40"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                      isSelected ? "border-orange-600 bg-orange-600" : "border-zinc-300"
                    )}>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-zinc-900 group-hover:text-orange-600 transition-colors">
                        Província da {p.name}
                      </div>
                      <div className="text-[11px] text-zinc-400 font-medium">
                        {p.detail}
                      </div>
                    </div>
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md",
                    isSelected ? "bg-orange-600 text-white" : "bg-zinc-100 text-zinc-500"
                  )}>
                    {isSelected ? 'Ativo' : 'Selecionar'}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="p-3 bg-zinc-50 rounded-xl text-center border border-zinc-100">
            <p className="text-[11px] text-zinc-500 font-medium flex items-center justify-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-orange-600" />
              <span>Entregas rápidas com pagamento no acto da entrega</span>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

const ProductCard = React.memo(({ 
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

const ProductModal = React.memo(({ 
  product, 
  onClose, 
  onAddToCart, 
  onBuyNow,
  onRate, 
  onComment, 
  stock, 
  onCallUs, 
  onShare, 
  copiedLink, 
  selectedProvince,
  priceColor,
  isFavorite = false,
  onToggleFavorite,
  discountSettings
}: { 
  product: Product; 
  onClose: () => void; 
  onAddToCart: (item: CartItem) => void; 
  onBuyNow?: (item: CartItem) => void;
  onRate: (val: number) => void; 
  onComment: (name: string, text: string) => void; 
  stock: Stock[]; 
  onCallUs: () => void; 
  onShare: (id: string) => void; 
  copiedLink: boolean; 
  selectedProvince: string; 
  priceColor?: string;
  isFavorite?: boolean;
  onToggleFavorite?: (productId: string, e?: React.MouseEvent) => void;
  discountSettings?: DiscountSettings;
  key?: React.Key 
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'comments'>('details');
  const [selectedColor, setSelectedColor] = useState(product.attributes.colors[0] || 'Padrão');
  const [selectedSize, setSelectedSize] = useState(product.attributes.sizes[0] || 'Único');
  const [quantity, setQuantity] = useState(1);
  const [isJustAdded, setIsJustAdded] = useState(false);
  const [commentForm, setCommentForm] = useState({ name: '', text: '' });
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const modalScrollRef = useRef<HTMLDivElement>(null);

  const hasDiscount = useMemo(() => {
    if (!discountSettings || discountSettings.enabled === false) return false;
    if (discountSettings.applyToAll) return true;
    return discountSettings.selectedProductIds?.includes(product.id) ?? false;
  }, [discountSettings, product.id]);

  const discountPercentage = discountSettings?.percentage ?? 20;

  // Always reset scroll to top so the product image is immediately visible on mobile
  useEffect(() => {
    if (modalScrollRef.current) {
      modalScrollRef.current.scrollTop = 0;
    }
  }, [product.id]);

  // On-demand feedback state
  const [comments, setComments] = useState<Comment[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(true);

  // Synchronize image with selected color if mapped
  useEffect(() => {
    if (selectedColor && product.colorImages && product.colorImages[selectedColor]) {
      const imageUrl = product.colorImages[selectedColor];
      const imgIndex = product.images.indexOf(imageUrl);
      if (imgIndex !== -1) {
        setCurrentImageIndex(imgIndex);
      }
    }
  }, [selectedColor, product.colorImages, product.images]);

  // Load comments and ratings ON-DEMAND for this specific product only
  useEffect(() => {
    setIsLoadingFeedback(true);
    let isMounted = true;
    let commentsLoaded = false;
    let ratingsLoaded = false;

    const checkFinished = () => {
      if (commentsLoaded && ratingsLoaded && isMounted) {
        setIsLoadingFeedback(false);
      }
    };

    const qComments = query(collection(db, 'comments'), where('productId', '==', product.id));
    const qRatings = query(collection(db, 'ratings'), where('productId', '==', product.id));

    const unsubComments = onSnapshot(qComments, (snap) => {
      if (!isMounted) return;
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setComments(list);
      commentsLoaded = true;
      checkFinished();
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'comments');
      commentsLoaded = true;
      checkFinished();
    });

    const unsubRatings = onSnapshot(qRatings, (snap) => {
      if (!isMounted) return;
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Rating));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRatings(list);
      ratingsLoaded = true;
      checkFinished();
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'ratings');
      ratingsLoaded = true;
      checkFinished();
    });

    return () => {
      isMounted = false;
      unsubComments();
      unsubRatings();
    };
  }, [product.id]);

  // Estoque específico para a variação selecionada (Cor + Tamanho)
  const currentVariationStock = useMemo(() => {
    return stock.find(s => 
      s.productId === product.id && 
      s.variation.color === selectedColor && 
      s.variation.size === selectedSize
    );
  }, [stock, product.id, selectedColor, selectedSize]);

  const huilaStock = useMemo(() => {
    return getVariationStock(currentVariationStock, 'Huíla');
  }, [currentVariationStock]);

  const cuneneStock = useMemo(() => {
    return getVariationStock(currentVariationStock, 'Cunene');
  }, [currentVariationStock]);

  const variationStock = useMemo(() => {
    return getVariationStock(currentVariationStock, selectedProvince);
  }, [currentVariationStock, selectedProvince]);

  const isOutOfStock = variationStock <= 0;

  const ratingBreakdown = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    ratings.forEach(r => {
      if (r.value >= 1 && r.value <= 5) {
        counts[Math.floor(r.value) - 1]++;
      }
    });
    return counts.reverse(); // 5 to 1
  }, [ratings]);

  return (
    <motion.div 
      key="product-modal-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 overflow-hidden pointer-events-none"
    >
      <motion.div 
        key="product-overlay"
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
      />

      <motion.div 
        key="product-content-wrapper"
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        className="w-full max-w-[700px] h-full sm:h-[92vh] max-h-full sm:max-h-[92vh] bg-[#f5f7fb] sm:rounded-[32px] overflow-hidden relative z-10 pointer-events-auto shadow-2xl flex flex-col"
      >
        {/* =================================================
             GALERIA + CABEÇALHO (DO SCRIPT) - FIXA NO TOPO
        ================================================== */}
        <section className="product-gallery sticky top-0 shrink-0 w-full h-[350px] sm:h-[400px] relative bg-white overflow-hidden flex items-center justify-center z-20 shadow-xs">
          <header className="product-header">
            <button
              type="button"
              className="header-button"
              onClick={onClose}
              aria-label="Voltar"
            >
              ‹
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="header-button"
                onClick={() => onShare(product.id)}
                aria-label="Partilhar produto"
                title={copiedLink ? "Link copiado!" : "Partilhar"}
              >
                <Share2 className="w-5 h-5 text-[#062b5c]" />
              </button>

              <button
                type="button"
                className="header-button favorite-button"
                onClick={(e) => onToggleFavorite?.(product.id, e)}
                aria-label="Adicionar aos favoritos"
                title={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              >
                {isFavorite ? '❤️' : '♡'}
              </button>
            </div>
          </header>

          {hasDiscount && (
            <span className="discount z-20 top-[68px] left-4">
              -{discountPercentage}%
            </span>
          )}

          {/* FOTO DO PRODUTO TOCANDO AS DUAS EXTREMIDADES (ESQUERDA E DIREITA) */}
          <div className="product-photo relative w-full h-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#f8f9fb] to-[#edf1f7] p-0 m-0">
            <SafeImage 
              src={product.images[currentImageIndex] || product.images[0]} 
              alt={product.name}
              className="w-full h-full object-cover select-none p-0 m-0"
            />

            {product.images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setCurrentImageIndex(prev => (prev === 0 ? product.images.length - 1 : prev - 1))}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 backdrop-blur-md flex items-center justify-center text-[#062b5c] shadow-md z-10 hover:bg-white active:scale-90 transition-transform"
                  aria-label="Imagem anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentImageIndex(prev => (prev === product.images.length - 1 ? 0 : prev + 1))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 backdrop-blur-md flex items-center justify-center text-[#062b5c] shadow-md z-10 hover:bg-white active:scale-90 transition-transform"
                  aria-label="Próxima imagem"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* INDICADORES (DOTS DO SCRIPT) */}
          <div className="gallery-dots bottom-3">
            {product.images.map((_, idx) => (
              <span
                key={idx}
                onClick={() => setCurrentImageIndex(idx)}
                className={cn("gallery-dot", idx === currentImageIndex && "active")}
              />
            ))}
          </div>
        </section>

        {/* =================================================
             INFORMAÇÕES (DO SCRIPT) - ROLA INDEPENDENTEMENTE
        ================================================== */}
        <main ref={modalScrollRef} className="product-content flex-1 overflow-y-auto overscroll-contain">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-[#ff6900] block mb-1">
                {product.category}
              </span>
              <h1 className="product-name">
                {product.name}
              </h1>
            </div>

            {copiedLink && (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full shrink-0">
                Link copiado!
              </span>
            )}
          </div>

          <div className="rating">
            <span className="stars">
              ★★★★★
            </span>
            <strong>
              {(product.rating || 4.8).toFixed(1)}
            </strong>
            <button 
              type="button"
              onClick={() => setActiveTab(activeTab === 'comments' ? 'details' : 'comments')}
              className="reviews hover:underline cursor-pointer"
            >
              ({comments.length > 0 ? comments.length : (product.ratingCount || 24)} avaliações)
            </button>
          </div>

          {/* PREÇO */}
          <div className="price-area">
            <span className="price" style={{ color: priceColor || '#062b5c' }}>
              KZ {product.price.toLocaleString('pt-AO')}
            </span>
            {hasDiscount && (
              <span className="old-price">
                KZ {Math.round(product.price / (1 - (discountPercentage / 100))).toLocaleString('pt-AO')}
              </span>
            )}
          </div>

          {/* PAGAMENTO NA ENTREGA + ESTOQUE LOCAL */}
          <div className="delivery-info bg-white border border-[#e5eaf0]">
            <div className="delivery-icon">
              💵
            </div>
            <div className="delivery-text flex-1">
              <strong>Pagamento na entrega</strong>
              <span>Pague quando receber o produto com total segurança.</span>
              <div className="flex items-center gap-4 mt-2.5 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs sm:text-[13px] font-semibold text-zinc-700">
                  <span className={cn("w-2 h-2 rounded-full shrink-0", huilaStock > 0 ? "bg-emerald-500 animate-pulse" : "bg-zinc-300")} />
                  <span>Huíla: {huilaStock > 0 ? `${huilaStock} Em estoque` : <span className="text-zinc-400 font-normal">Esgotado</span>}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs sm:text-[13px] font-semibold text-zinc-700">
                  <span className={cn("w-2 h-2 rounded-full shrink-0", cuneneStock > 0 ? "bg-emerald-500 animate-pulse" : "bg-zinc-300")} />
                  <span>Cunene: {cuneneStock > 0 ? `${cuneneStock} Em estoque` : <span className="text-zinc-400 font-normal">Esgotado</span>}</span>
                </div>
              </div>
            </div>
          </div>

          {/* TAB DETALHES VS COMENTÁRIOS */}
          <div className="flex gap-6 border-b border-zinc-200 mt-6 mb-2">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={cn(
                "pb-2.5 text-xs sm:text-sm font-black uppercase tracking-wider transition-all relative cursor-pointer",
                activeTab === 'details' ? "text-[#ff6900]" : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              Detalhes do Produto
              {activeTab === 'details' && <motion.div layoutId="productTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ff6900]" />}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('comments')}
              className={cn(
                "pb-2.5 text-xs sm:text-sm font-black uppercase tracking-wider transition-all relative flex items-center gap-1.5 cursor-pointer",
                activeTab === 'comments' ? "text-[#ff6900]" : "text-zinc-400 hover:text-zinc-600"
              )}
            >
              Avaliações & Opiniões
              <span className="bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded-md text-[10px] font-bold">
                {isLoadingFeedback ? '...' : comments.length}
              </span>
              {activeTab === 'comments' && <motion.div layoutId="productTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ff6900]" />}
            </button>
          </div>

          {activeTab === 'details' ? (
            <>
              {/* DESCRIÇÃO */}
              <section className="detail-section">
                <h2 className="detail-title">Descrição</h2>
                <p className="description">
                  {product.description || 'Produto de alta qualidade PDA Comercial, garantindo conforto, durabilidade e excelente acabamento para o seu dia a dia.'}
                </p>
              </section>

              {/* TAMANHO */}
              {product.attributes.sizes && product.attributes.sizes.length > 0 && (
                <section className="detail-section">
                  <span className="option-label">Tamanho</span>
                  <div className="options">
                    {product.attributes.sizes.map(size => {
                      const sizeItem = stock.find(s => 
                        s.productId === product.id && 
                        s.variation.color === selectedColor && 
                        s.variation.size === size
                      );
                      const sizeQty = getVariationStock(sizeItem, selectedProvince);
                      const isUnavailable = sizeQty <= 0;

                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setSelectedSize(size)}
                          className={cn(
                            "option", 
                            selectedSize === size && "active",
                            isUnavailable && "opacity-45 text-zinc-400"
                          )}
                          title={isUnavailable ? `Sem estoque disponível nesta cor (${sizeQty} disp.)` : `${sizeQty} unidades disponíveis`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* COR */}
              {product.attributes.colors && product.attributes.colors.length > 0 && (
                <section className="detail-section">
                  <span className="option-label">Cor</span>
                  <div className="options">
                    {product.attributes.colors.map(color => {
                      const colorItem = stock.find(s => 
                        s.productId === product.id && 
                        s.variation.color === color && 
                        s.variation.size === selectedSize
                      );
                      const colorQty = getVariationStock(colorItem, selectedProvince);
                      const isUnavailable = colorQty <= 0;

                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setSelectedColor(color)}
                          className={cn(
                            "option", 
                            selectedColor === color && "active",
                            isUnavailable && "opacity-45 text-zinc-400"
                          )}
                          title={isUnavailable ? `Sem estoque disponível neste tamanho (${colorQty} disp.)` : `${colorQty} unidades disponíveis`}
                        >
                          {color}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* QUANTIDADE */}
              <div className="quantity-area">
                <div className="flex items-center justify-between mb-1">
                  <span className="quantity-label">Quantidade</span>
                  {variationStock > 0 ? (
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                      {variationStock} un. em estoque {selectedProvince ? `na ${selectedProvince}` : ''}
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-md">
                      Esgotado {selectedProvince ? `na ${selectedProvince}` : ''}
                    </span>
                  )}
                </div>
                <div className="quantity">
                  <button
                    type="button"
                    id="minus"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    −
                  </button>
                  <span id="quantity">{quantity}</span>
                  <button
                    type="button"
                    id="plus"
                    disabled={isOutOfStock || quantity >= variationStock}
                    onClick={() => setQuantity(Math.min(Math.max(1, variationStock), quantity + 1))}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* SUB-TOTAL */}
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-[#e5eaf0]">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Subtotal:</span>
                <span className="text-lg font-black text-[#062b5c]">
                  KZ {(product.price * quantity).toLocaleString('pt-AO')}
                </span>
              </div>

              {isOutOfStock && (
                <div className="mt-3 p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold text-center">
                  ⚠️ Esta variação está esgotada no momento. Experimente selecionar outra cor ou tamanho.
                </div>
              )}

              {/* BOTÕES DE COMPRA (DO SCRIPT) */}
              <div className="buy-area">
                <button
                  type="button"
                  className="add-cart"
                  id="addCart"
                  disabled={isOutOfStock}
                  onClick={() => {
                    onAddToCart({
                      productId: product.id,
                      productName: product.name,
                      variation: { color: selectedColor, size: selectedSize },
                      quantity,
                      price: product.price,
                      image: (product.colorImages && product.colorImages[selectedColor]) || product.images[0]
                    });
                    setIsJustAdded(true);
                    setTimeout(() => setIsJustAdded(false), 1400);
                  }}
                >
                  {isJustAdded ? '✓ Adicionado ao Carrinho' : '🛒 Adicionar ao Carrinho'}
                </button>

                <button
                  type="button"
                  className="buy-now"
                  id="buyNow"
                  disabled={isOutOfStock}
                  onClick={() => {
                    const itemData: CartItem = {
                      productId: product.id,
                      productName: product.name,
                      variation: { color: selectedColor, size: selectedSize },
                      quantity,
                      price: product.price,
                      image: (product.colorImages && product.colorImages[selectedColor]) || product.images[0]
                    };
                    if (onBuyNow) {
                      onBuyNow(itemData);
                    } else {
                      onAddToCart(itemData);
                      onClose();
                    }
                  }}
                >
                  Comprar agora
                </button>
              </div>

              {/* SUPORTE POR LIGAÇÃO */}
              <div className="mt-4 flex items-center justify-center text-xs pt-3.5 border-t border-zinc-100 text-zinc-500">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onCallUs();
                  }}
                  className="text-[#062b5c] font-bold hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Dúvidas? Ligue para nós</span>
                </button>
              </div>
            </>
          ) : (
            /* COMENTÁRIOS E AVALIAÇÕES (MANTENDO AS FUNÇÕES EXISTENTES) */
            <div className="space-y-6 mt-4">
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {/* INTERACTIVE STAR RATING */}
                <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200/80 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-zinc-700 block">Sua Avaliação:</span>
                    <span className="text-[10px] text-zinc-400">Clique nas estrelas para avaliar</span>
                  </div>
                  <StarRating rating={product.rating} interactive onRate={onRate} />
                </div>

                {isLoadingFeedback ? (
                  <div className="space-y-3 py-2">
                    <CommentSkeleton />
                    <CommentSkeleton />
                  </div>
                ) : (
                  <>
                    {ratings.length > 0 && (
                      <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200/80">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">Distribuição de Avaliações</h4>
                        <div className="space-y-2">
                          {ratingBreakdown.map((count, idx) => {
                            const stars = 5 - idx;
                            const percentage = ratings.length > 0 ? (count / ratings.length) * 100 : 0;
                            return (
                              <div key={stars} className="flex items-center gap-3">
                                <div className="flex items-center gap-1 w-10 text-xs font-bold text-zinc-700">
                                  <span>{stars}</span>
                                  <Star className="w-3 h-3 fill-[#ffb400] text-[#ffb400]" />
                                </div>
                                <div className="flex-1 h-2 bg-zinc-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-orange-500" style={{ width: `${percentage}%` }} />
                                </div>
                                <span className="text-[10px] font-bold text-zinc-400 w-6 text-right">{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {comments.length === 0 ? (
                      <div className="text-center py-8 text-zinc-400">
                        <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30 text-[#062b5c]" />
                        <p className="text-xs">Nenhum comentário ainda. Seja o primeiro a opinar!</p>
                      </div>
                    ) : (
                      comments.map(c => (
                        <div key={c.id} className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/80 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-xs text-[#062b5c]">{c.userName}</span>
                            <span className="text-[10px] text-zinc-400">{safeFormatDate(c.createdAt, 'dd/MM/yyyy')}</span>
                          </div>
                          <p className="text-xs text-zinc-600 leading-relaxed">{c.text}</p>
                        </div>
                      ))
                    )}
                  </>
                )}
              </div>

              {/* FORMULÁRIO DE COMENTÁRIO */}
              <div className="pt-4 border-t border-zinc-200/80">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 mb-3">Deixe sua Opinião</h4>
                <div className="space-y-2.5">
                  <input
                    type="text"
                    placeholder="Seu Nome"
                    value={commentForm.name}
                    onChange={(e) => setCommentForm({ ...commentForm, name: e.target.value })}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-orange-500"
                  />
                  <textarea
                    rows={3}
                    placeholder="O que você achou do produto?"
                    value={commentForm.text}
                    onChange={(e) => setCommentForm({ ...commentForm, text: e.target.value })}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-orange-500 resize-none"
                  />
                  <button
                    type="button"
                    disabled={!commentForm.name.trim() || !commentForm.text.trim()}
                    onClick={() => {
                      onComment(commentForm.name, commentForm.text);
                      setCommentForm({ name: '', text: '' });
                    }}
                    className="w-full py-2.5 rounded-xl bg-[#062b5c] text-white text-xs font-bold hover:bg-[#031d40] transition-all disabled:opacity-40 cursor-pointer"
                  >
                    Publicar Comentário
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </motion.div>
    </motion.div>
  );
});

const Cart = React.memo(({ 
  isOpen, 
  onClose, 
  items, 
  onUpdateQuantity, 
  onRemove, 
  onCheckout, 
  onCallUs, 
  onViewReservations, 
  isAuthenticated,
  availableCoupons,
  selectedProvince,
  onProvinceChange,
  stock
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  items: CartItem[]; 
  onUpdateQuantity: (pid: string, c: string, s: string, q: number) => void; 
  onRemove: (pid: string, c: string, s: string) => void; 
  onCheckout: (info: { name: string, phone: string, province: string, neighborhood?: string, address?: string, coupon?: Coupon, channel?: 'whatsapp' | 'sms' }) => void; 
  onCallUs: () => void; 
  onViewReservations: () => void; 
  isAuthenticated: boolean;
  availableCoupons: Coupon[];
  selectedProvince: string;
  onProvinceChange: (p: string) => void;
  stock: Stock[];
}) => {
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', province: selectedProvince || '', neighborhood: '', address: '' });
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<'whatsapp' | 'sms' | null>(null);

  useEffect(() => {
    setCustomerInfo(prev => ({ ...prev, province: selectedProvince }));
  }, [selectedProvince]);

  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const isFreeDelivery = totalQuantity > 1;
  
  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    
    if (appliedCoupon.productId) {
      const targetItems = items.filter(i => i.productId === appliedCoupon.productId);
      if (targetItems.length === 0) return 0;
      
      const targetSubtotal = targetItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      return (appliedCoupon.type === 'percentage' 
        ? (targetSubtotal * (appliedCoupon.value || 0)) / 100 
        : Math.min((appliedCoupon.value || 0), targetSubtotal)) || 0;
    }

    return (appliedCoupon.type === 'percentage' 
      ? (total * (appliedCoupon.value || 0)) / 100 
      : Math.min((appliedCoupon.value || 0), total)) || 0;
  }, [appliedCoupon, items, total]);

  const finalTotal = total - discountAmount;

  const handleApplyCoupon = () => {
    setCouponError('');
    const coupon = availableCoupons.find(c => c.code.toUpperCase() === couponCode.trim().toUpperCase() && c.active);
    if (coupon) {
      setAppliedCoupon(coupon);
      setCouponCode('');
    } else {
      setCouponError('Cupom inválido ou expirado');
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="cart-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150]"
        />
      )}
      {isOpen && (
        <motion.div 
          key="cart-content"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="fixed inset-y-0 right-0 w-full max-w-[650px] bg-[#f5f7fb] z-[160] shadow-2xl flex flex-col overflow-hidden"
        >
          {/* CABEÇALHO (DO SCRIPT) */}
          <header className="cart-header">
            <button 
              type="button"
              className="back-button" 
              onClick={onClose}
              aria-label="Voltar"
            >
              ‹
            </button>

            <div className="cart-title">
              <h1>Carrinho</h1>
              <p>{items.length} {items.length === 1 ? 'produto adicionado' : 'produtos adicionados'}</p>
            </div>

            {isAuthenticated && (
              <button 
                type="button"
                onClick={() => {
                  onClose();
                  onViewReservations();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all text-xs font-bold shrink-0 cursor-pointer"
                title="Ver Minhas Reservas"
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">Reservas</span>
              </button>
            )}
          </header>

          {/* CONTEÚDO (DO SCRIPT) */}
          <div className="flex-1 overflow-y-auto cart-container space-y-6">
            {items.length === 0 ? (
              <div className="text-center py-16 px-4 bg-white rounded-[22px] border border-[#e6ebf1] shadow-[0_8px_28px_rgba(5,34,70,.07)]">
                <ShoppingBag className="w-16 h-16 mx-auto mb-3 text-zinc-300 stroke-[1.5]" />
                <h3 className="font-extrabold text-lg text-[#132238]">Seu carrinho está vazio</h3>
                <p className="text-xs text-[#738096] mt-1.5 max-w-xs mx-auto">
                  Nenhum produto adicionado ainda. Explore os produtos da loja e adicione ao carrinho!
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-5 px-6 py-2.5 rounded-full bg-[#062b5c] text-white font-bold text-xs hover:bg-[#031d40] transition-colors cursor-pointer"
                >
                  Continuar Comprando
                </button>
              </div>
            ) : (
              <>
                {/* PRODUTOS ESCOLHIDOS */}
                <div>
                  <div className="section-title">
                    Produtos Escolhidos
                  </div>

                    <div className="space-y-3">
                    {items.map((item, idx) => {
                      const stockItem = stock.find(s => 
                        s.productId === item.productId && 
                        s.variation.color === item.variation.color && 
                        s.variation.size === item.variation.size
                      );
                      const chosenProvince = customerInfo.province;
                      const provinceQty = getVariationStock(stockItem, chosenProvince);
                      const isItemOutOfStock = chosenProvince ? (provinceQty < item.quantity) : (provinceQty <= 0);

                      return (
                        <div key={`${item.productId}-${idx}`} className="cart-product">
                          <div className="product-image">
                            <SafeImage 
                              src={item.image} 
                              alt={item.productName} 
                              className="w-full h-full object-contain p-2" 
                            />
                          </div>

                          <div className="product-info">
                            <div className="product-name truncate">
                              {item.productName}
                            </div>

                            <div className="product-description">
                              {item.variation.color} • Tamanho {item.variation.size}
                            </div>

                            <div className="product-price">
                              KZ {(item.price * item.quantity).toLocaleString('pt-AO')}
                            </div>

                            {isItemOutOfStock && (
                              <span className="text-[10px] font-bold text-red-500 bg-red-50 border border-red-100 px-2 py-0.5 rounded-md inline-block my-1">
                                Indisponível {chosenProvince ? `em ${chosenProvince}` : ''} ({provinceQty} disp.)
                              </span>
                            )}

                            <div className="quantity">
                              <button 
                                type="button"
                                onClick={() => onUpdateQuantity(item.productId, item.variation.color, item.variation.size, item.quantity - 1)}
                                aria-label="Diminuir quantidade"
                              >
                                -
                              </button>
                              <span>{item.quantity}</span>
                              <button 
                                type="button"
                                onClick={() => onUpdateQuantity(item.productId, item.variation.color, item.variation.size, item.quantity + 1)}
                                aria-label="Aumentar quantidade"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          <button 
                            type="button"
                            className="remove-product"
                            onClick={() => onRemove(item.productId, item.variation.color, item.variation.size)}
                            aria-label="Remover produto"
                            title="Remover"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ENTREGA (DO SCRIPT) */}
                <div className="delivery-card">
                  <div className={cn("delivery-icon", isFreeDelivery ? "bg-[#eaf8f0] text-[#18a663]" : "bg-[#fff1e8] text-[#ff6900]")}>
                    🚚
                  </div>
                  <div className="delivery-info">
                    <strong className="text-[15px] text-[#132238]">Entrega ao Domicílio</strong>
                    <span className="text-xs text-[#738096] font-medium">
                      Grátis (para mais de 1 item)
                    </span>
                  </div>
                  {isFreeDelivery && (
                    <div className="delivery-check" title="Entrega Grátis Ativa">
                      ✓
                    </div>
                  )}
                </div>

                {/* DADOS DA RESERVA */}
                <div className="bg-white rounded-[22px] p-5 shadow-[0_8px_28px_rgba(5,34,70,.07)] border border-[#e6ebf1]/60">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[17px] font-extrabold text-[#132238]">Dados da Reserva</h2>
                    <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full">
                      Província Obrigatória *
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    <div>
                      <label className="text-[11px] font-bold text-[#738096] uppercase tracking-wider block mb-1.5 px-0.5">
                        Nome Completo
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input 
                          type="text" 
                          placeholder="Ex: Manuel António" 
                          value={customerInfo.name}
                          onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                          className="w-full h-12 bg-[#f8fafc] border border-[#e6ebf1] rounded-[14px] pl-11 pr-4 text-sm text-[#132238] focus:border-[#062b5c] focus:bg-white focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-[#738096] uppercase tracking-wider block mb-1.5 px-0.5">
                        Telefone / WhatsApp
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input 
                          type="tel" 
                          placeholder="Ex: 923 000 000" 
                          value={customerInfo.phone}
                          onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                          className="w-full h-12 bg-[#f8fafc] border border-[#e6ebf1] rounded-[14px] pl-11 pr-4 text-sm text-[#132238] focus:border-[#062b5c] focus:bg-white focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5 px-0.5">
                        <label className="text-[11px] font-bold text-[#132238] uppercase tracking-wider block">
                          Província *
                        </label>
                        {!customerInfo.province && (
                          <span className="text-[10px] text-amber-600 font-bold">Obrigatório para reserva</span>
                        )}
                      </div>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-[#ff6900] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <select
                          value={customerInfo.province}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCustomerInfo({...customerInfo, province: val});
                            onProvinceChange(val);
                          }}
                          className={cn(
                            "w-full h-12 bg-[#f8fafc] border rounded-[14px] pl-11 pr-4 text-sm font-bold appearance-none focus:outline-none focus:bg-white transition-all",
                            !customerInfo.province 
                              ? "border-amber-400 text-zinc-500 ring-2 ring-amber-100" 
                              : "border-[#e6ebf1] text-[#132238] focus:border-[#062b5c]"
                          )}
                          required
                        >
                          <option value="">Selecione a Província * (Cunene ou Huíla)</option>
                          <option value="Cunene">Cunene</option>
                          <option value="Huíla">Huíla</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-[#738096] uppercase tracking-wider block mb-1.5 px-0.5">
                        Bairro (Opcional)
                      </label>
                      <div className="relative">
                        <Home className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input 
                          type="text" 
                          placeholder="Ex: Benfica, Lubango..." 
                          value={customerInfo.neighborhood}
                          onChange={(e) => setCustomerInfo({...customerInfo, neighborhood: e.target.value})}
                          className="w-full h-12 bg-[#f8fafc] border border-[#e6ebf1] rounded-[14px] pl-11 pr-4 text-sm text-[#132238] focus:border-[#062b5c] focus:bg-white focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-[#738096] uppercase tracking-wider block mb-1.5 px-0.5">
                        Endereço / Ponto de Referência (Opcional)
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input 
                          type="text" 
                          placeholder="Rua, número ou ponto de referência" 
                          value={customerInfo.address}
                          onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                          className="w-full h-12 bg-[#f8fafc] border border-[#e6ebf1] rounded-[14px] pl-11 pr-4 text-sm text-[#132238] focus:border-[#062b5c] focus:bg-white focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* CUPOM DE DESCONTO (DO SCRIPT) */}
                <div className="coupon-area">
                  <div className="section-title">
                    Cupom de Desconto
                  </div>

                  {appliedCoupon ? (
                    <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-[16px] flex items-center justify-between">
                      <div className="flex items-center gap-3 text-emerald-800">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center font-bold">
                          ✓
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-wider">{appliedCoupon.code}</p>
                          <p className="text-[10px] text-emerald-600">Desconto aplicado com sucesso!</p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                        title="Remover cupom"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="coupon-box">
                      <input
                        type="text"
                        placeholder="Código do cupom"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="coupon-input"
                      />
                      <button 
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={!couponCode.trim()}
                        className="coupon-button"
                      >
                        Aplicar
                      </button>
                    </div>
                  )}
                  {couponError && <p className="text-xs text-red-500 font-bold mt-2 px-1">{couponError}</p>}
                </div>

                {/* RESUMO DO PEDIDO (DO SCRIPT) */}
                <div className="summary-card">
                  <h2>Resumo do Pedido</h2>

                  <div className="summary-line">
                    <span>Subtotal</span>
                    <span>{total.toLocaleString('pt-AO')} Kz</span>
                  </div>

                  <div className="summary-line">
                    <span>Desconto</span>
                    <span>{discountAmount > 0 ? `- ${discountAmount.toLocaleString('pt-AO')} Kz` : '0 Kz'}</span>
                  </div>

                  <div className="summary-line">
                    <span>Entrega ao Domicílio</span>
                    <span style={{ color: isFreeDelivery ? 'var(--verde)' : '#738096', fontWeight: 'bold' }}>
                      Grátis (para mais de 1 item)
                    </span>
                  </div>

                  <div className="summary-line total">
                    <span>Total</span>
                    <span className="total-price">
                      {finalTotal.toLocaleString('pt-AO')} Kz
                    </span>
                  </div>

                  {/* Seleção do Canal de Envio: WhatsApp ou SMS (Iniciam Desabilitadas / Sem Seleção) */}
                  <div className="mt-5 p-3.5 bg-[#f5f7fb] rounded-[16px] border border-[#e6ebf1]">
                    <div className="flex items-center justify-between mb-2.5 px-0.5">
                      <span className="text-[11px] font-black text-[#132238] uppercase tracking-wider block">
                        Finalizar Reserva por:
                      </span>
                      {!selectedChannel ? (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100/90 px-2 py-0.5 rounded-full animate-pulse">
                          Obrigatório selecionar 1 *
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          ✓ Canal selecionado
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setSelectedChannel('whatsapp')}
                        className={cn(
                          "flex items-center justify-center gap-2 py-2.5 px-3 rounded-[12px] text-xs font-bold transition-all border cursor-pointer active:scale-95",
                          selectedChannel === 'whatsapp'
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-300"
                            : "bg-white text-zinc-700 border-zinc-200 hover:border-emerald-400 hover:bg-emerald-50/20"
                        )}
                      >
                        <div className={cn(
                          "w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[8px] shrink-0",
                          selectedChannel === 'whatsapp' ? "border-white bg-white text-emerald-600 font-black" : "border-zinc-300 bg-white"
                        )}>
                          {selectedChannel === 'whatsapp' ? '●' : ''}
                        </div>
                        <MessageCircle className={cn("w-4 h-4", selectedChannel === 'whatsapp' ? "text-emerald-100" : "text-emerald-600")} />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedChannel('sms')}
                        className={cn(
                          "flex items-center justify-center gap-2 py-2.5 px-3 rounded-[12px] text-xs font-bold transition-all border cursor-pointer active:scale-95",
                          selectedChannel === 'sms'
                            ? "bg-[#062b5c] text-white border-[#062b5c] shadow-md ring-2 ring-blue-300"
                            : "bg-white text-zinc-700 border-zinc-200 hover:border-blue-400 hover:bg-blue-50/20"
                        )}
                      >
                        <div className={cn(
                          "w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[8px] shrink-0",
                          selectedChannel === 'sms' ? "border-white bg-white text-[#062b5c] font-black" : "border-zinc-300 bg-white"
                        )}>
                          {selectedChannel === 'sms' ? '●' : ''}
                        </div>
                        <MessageSquare className={cn("w-4 h-4", selectedChannel === 'sms' ? "text-blue-100" : "text-[#062b5c]")} />
                        <span>SMS</span>
                      </button>
                    </div>
                  </div>

                  {/* Botão de Finalizar Reserva: Só ativo após selecionar WhatsApp ou SMS */}
                  <button 
                    type="button"
                    disabled={items.length === 0 || !selectedChannel || isSubmitting}
                    onClick={async () => {
                      if (!selectedChannel) {
                        alert("Por favor, selecione uma das opções de envio (WhatsApp ou SMS) para finalizar a sua reserva!");
                        return;
                      }
                      if (!customerInfo.province) {
                        alert("Por favor, selecione a sua Província (Cunene ou Huíla) nos Dados da Reserva para verificarmos a disponibilidade e concluir o seu pedido!");
                        return;
                      }

                      // Verificação rigorosa de estoque em tempo real
                      const outOfStockItem = items.find(item => {
                        const stockItem = stock.find(s => 
                          s.productId === item.productId && 
                          s.variation.color === item.variation.color && 
                          s.variation.size === item.variation.size
                        );
                        const available = getVariationStock(stockItem, customerInfo.province);
                        return available < item.quantity;
                      });

                      if (outOfStockItem) {
                        const stockItem = stock.find(s => 
                          s.productId === outOfStockItem.productId && 
                          s.variation.color === outOfStockItem.variation.color && 
                          s.variation.size === outOfStockItem.variation.size
                        );
                        const available = getVariationStock(stockItem, customerInfo.province);
                        alert(`Atenção: O produto "${outOfStockItem.productName}" (${outOfStockItem.variation.color}/${outOfStockItem.variation.size}) tem apenas ${available} unidade(s) disponível(is) em estoque na província de ${customerInfo.province}. Por favor, ajuste a quantidade no carrinho.`);
                        return;
                      }

                      setIsSubmitting(true);
                      try {
                        await onCheckout({
                          ...customerInfo, 
                          coupon: appliedCoupon || undefined,
                          channel: selectedChannel
                        });
                        setCustomerInfo({ name: '', phone: '', province: '', neighborhood: '', address: '' });
                        onProvinceChange('');
                        setSelectedChannel(null);
                        setAppliedCoupon(null);
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    className={cn(
                      "checkout-button",
                      !selectedChannel && "opacity-50 cursor-not-allowed bg-zinc-300 text-zinc-500 shadow-none hover:transform-none"
                    )}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Confirmando Reserva...</span>
                      </div>
                    ) : !selectedChannel ? (
                      <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                        <span>Selecione WhatsApp ou SMS para Ativar</span>
                      </div>
                    ) : selectedChannel === 'whatsapp' ? (
                      <>
                        <MessageCircle className="w-5 h-5" />
                        <span>Finalizar Reserva pelo WhatsApp</span>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-5 h-5" />
                        <span>Finalizar Reserva por SMS</span>
                      </>
                    )}
                  </button>

                  {!selectedChannel && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200/80 rounded-xl py-2 px-3 text-center mt-2.5 font-medium">
                      ⚠️ O botão de finalizar reserva só fica ativo após selecionar WhatsApp ou SMS acima.
                    </p>
                  )}

                  <div className="security">
                    🔒 Compra 100% Segura • Pagamento na Entrega
                  </div>
                </div>

                {/* Opção Adicional: Dúvidas? Ligue para nós */}
                <button 
                  type="button"
                  onClick={() => {
                    onClose();
                    onCallUs();
                  }}
                  className="w-full bg-white border border-[#e6ebf1] text-[#062b5c] py-3.5 rounded-[16px] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-zinc-50 transition-colors shadow-xs cursor-pointer mb-2"
                >
                  <Phone className="w-4 h-4 text-[#ff6900]" />
                  <span>Dúvidas? Ligue para nós</span>
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});



const MyReservations = ({ sales, onClose, settings, onCallUs }: { sales: Sale[]; onClose: () => void; settings: SiteSettings; onCallUs: () => void }) => {
  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      <header className="px-6 py-8 border-b border-zinc-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button 
            onClick={onClose}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors font-bold uppercase tracking-widest text-xs"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar à Loja
          </button>
          <h1 className="font-display text-xl font-bold uppercase tracking-tight">Minhas Reservas</h1>
          <div className="w-20" /> {/* Spacer */}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {sales.length === 0 ? (
          <div className="text-center py-20 glass rounded-[40px] bg-white">
            <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <History className="w-10 h-10 text-zinc-300" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Nenhuma reserva encontrada</h2>
            <p className="text-zinc-500 mb-8 max-w-sm mx-auto">Você ainda não realizou nenhuma reserva em nossa loja.</p>
            <button 
              onClick={onClose}
              className="bg-zinc-900 text-white px-8 py-3 rounded-2xl font-bold hover:bg-primary transition-all shadow-lg"
            >
              Começar a comprar
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {sales.map((reservation) => (
              <motion.div 
                key={reservation.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-[32px] overflow-hidden bg-white border-zinc-200 shadow-sm"
              >
                <div className="p-6 sm:p-8">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                    <div>
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Reserva #{reservation.id.slice(-6).toUpperCase()}</div>
                      <div className="text-xs text-zinc-500">{format(new Date(reservation.createdAt), 'dd "de" MMMM "de" yyyy, HH:mm', { locale: ptBR })}</div>
                      {reservation.customerProvince && (
                        <div className="text-[10px] text-orange-600 font-bold uppercase mt-1">
                          Província: {reservation.customerProvince}
                          {reservation.customerNeighborhood && ` • Bairro: ${reservation.customerNeighborhood}`}
                          {reservation.customerAddress && ` • Endereço/Ref: ${reservation.customerAddress}`}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {reservation.status === 'paid' ? (
                        <span className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-400/10 text-emerald-600 text-xs font-bold uppercase tracking-widest border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Pago
                        </span>
                      ) : reservation.status === 'cancelled' ? (
                        <span className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-red-400/10 text-red-600 text-xs font-bold uppercase tracking-widest border border-red-500/20">
                          <X className="w-3.5 h-3.5" />
                          Cancelado
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-orange-400/10 text-orange-600 text-xs font-bold uppercase tracking-widest border border-orange-500/20">
                          <Clock className="w-3.5 h-3.5" />
                          Pendente
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {reservation.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-3 border-b border-zinc-50 last:border-0">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-zinc-50 flex items-center justify-center font-bold text-zinc-400 border border-zinc-100">
                            {item.quantity}x
                          </div>
                          <div>
                            <div className="font-bold text-zinc-900">{item.productName}</div>
                            <div className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">{item.variation.color} / {item.variation.size}</div>
                          </div>
                        </div>
                        <div className="font-bold text-zinc-900">
                          KZ {(item.price * item.quantity).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 pt-6 border-t border-zinc-100 flex justify-between items-center">
                    <span className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Total da Reserva</span>
                    <span className="text-2xl font-bold text-zinc-900" style={{ color: settings.primaryColor }}>
                      KZ {reservation.totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
                {reservation.status === 'pending' && (
                  <button 
                    onClick={onCallUs}
                    className="w-full px-8 py-4 bg-orange-50 border-t border-orange-100 italic transition-all hover:bg-orange-100 group"
                  >
                    <p className="text-[10px] text-orange-600 font-bold uppercase tracking-wider text-center group-hover:scale-105 transition-transform flex items-center justify-center gap-2">
                      <Phone className="w-3 h-3" />
                      Pagamento feito na entrega, Ligue para nós
                    </p>
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

// --- Notification helper components ---
const RealtimeNotificationToast = ({ 
  reservation, 
  onClose, 
  onView 
}: { 
  reservation: Sale; 
  onClose: () => void; 
  onView: () => void;
  key?: React.Key;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.9 }}
      className="fixed bottom-24 right-6 z-[130] bg-zinc-950 text-white rounded-3xl p-5 shadow-2xl border border-zinc-805 flex items-start gap-4 max-w-md w-full"
    >
      <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white flex-shrink-0 md:flex-none">
        <Bell className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-orange-400 font-bold uppercase tracking-widest">
            Nova Reserva Recebida!
          </span>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <h4 className="font-bold text-sm truncate">{reservation.customerName || 'Cliente'}</h4>
        <p className="text-xs text-zinc-400 truncate mt-0.5">
          {reservation.items.map(i => `${i.productName} (x${i.quantity})`).join(', ')}
        </p>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800">
          <span className="text-xs font-bold text-orange-400">
            KZ {reservation.totalAmount.toLocaleString()}
          </span>
          <button
            onClick={() => {
              onClose();
              onView();
            }}
            className="text-[10px] font-black uppercase tracking-wider text-white hover:text-orange-400 transition-colors flex items-center gap-1 font-bold"
          >
            Ver Detalhes
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const CartAddedNotification = React.memo(({ 
  addedItem, 
  onClose, 
  onViewCart,
  totalCartItems 
}: { 
  addedItem: { item: CartItem; timestamp: number } | null; 
  onClose: () => void; 
  onViewCart: () => void;
  totalCartItems: number;
}) => {
  useEffect(() => {
    if (!addedItem) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4200);
    return () => clearTimeout(timer);
  }, [addedItem, onClose]);

  return (
    <AnimatePresence>
      {addedItem && (
        <motion.div
          key={addedItem.timestamp}
          initial={{ opacity: 0, y: 50, scale: 0.88 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.92 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
          className="fixed bottom-20 sm:bottom-8 right-4 sm:right-8 z-[200] max-w-sm w-[calc(100vw-2rem)] sm:w-96 bg-zinc-950/95 backdrop-blur-xl text-white p-4 rounded-3xl shadow-2xl border border-zinc-800/80 flex items-center gap-3.5 ring-1 ring-white/10"
        >
          {/* Animated Product Image with Cart Badge */}
          <div className="relative w-14 h-14 flex-shrink-0 rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center p-1">
            {addedItem.item.image ? (
              <SafeImage src={addedItem.item.image} className="w-full h-full object-contain" />
            ) : (
              <ShoppingCart className="w-6 h-6 text-orange-500" />
            )}
            <span className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-1 shadow-lg ring-2 ring-zinc-950">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <motion.div
                animate={{ rotate: [0, -14, 14, -8, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6 }}
              >
                <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />
              </motion.div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                Adicionado ao Carrinho!
              </span>
            </div>
            <h4 className="font-bold text-xs text-zinc-100 truncate">{addedItem.item.productName}</h4>
            <p className="text-[10px] text-zinc-400 truncate mt-0.5">
              <span className="text-zinc-200 font-semibold">{addedItem.item.quantity}x</span> • {addedItem.item.variation.color}/{addedItem.item.variation.size} • <span className="text-orange-400 font-bold">KZ {(addedItem.item.price * addedItem.item.quantity).toLocaleString()}</span>
            </p>
          </div>

          {/* Action */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => {
                onClose();
                onViewCart();
              }}
              className="bg-orange-600 hover:bg-orange-500 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-lg shadow-orange-600/30 whitespace-nowrap"
            >
              Ver Carrinho
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

// --- Main App ---

export default function App() {
  const [view, setView] = useState<'store' | 'admin' | 'reservations'>('store');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Província não é pré-definida: só é conhecida quando o cliente seleciona nos dados da reserva
  const [selectedProvince, setSelectedProvince] = useState<string>('');

  const handleProvinceChange = (province: string) => {
    setSelectedProvince(province);
  };

  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<Stock[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  // UI State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adminTab, setAdminTab] = useState('dashboard');
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [isProfilePanelOpen, setIsProfilePanelOpen] = useState(false);
  const [isClientDashboardOpen, setIsClientDashboardOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [addedCartItem, setAddedCartItem] = useState<{ item: CartItem; timestamp: number } | null>(null);
  const [isCartBouncing, setIsCartBouncing] = useState(false);

  // Notification States & Logic
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('read_reservation_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [lastSeenTime, setLastSeenTime] = useState<string>(() => {
    const saved = localStorage.getItem('last_seen_reservations_time');
    return saved || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  });
  const [hasShownEntranceNotification, setHasShownEntranceNotification] = useState(false);
  const [realtimeNotification, setRealtimeNotification] = useState<Sale | null>(null);
  const entranceTimeRef = useRef<string>(new Date().toISOString());

  const relevantReservations = useMemo(() => {
    return sales.filter(s => {
      const isMyRes = s.userId === user?.uid || (user?.phoneNumber && s.customerPhone === user.phoneNumber);
      return s.type === 'reservation' && (isAdmin ? true : isMyRes);
    });
  }, [sales, isAdmin, user]);

  const pendingReservationsCount = useMemo(() => {
    return sales.filter(s => s.type === 'reservation' && s.status === 'pending').length;
  }, [sales]);

  const unseenReservations = useMemo(() => {
    return relevantReservations.filter(r => !readNotificationIds.includes(r.id));
  }, [relevantReservations, readNotificationIds]);

  const handleDismissNotification = useCallback((id: string) => {
    setReadNotificationIds(prev => {
      if (prev.includes(id)) return prev;
      const updated = [...prev, id];
      try {
        localStorage.setItem('read_reservation_notifications', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, []);

  const handleMarkNotificationsAsRead = useCallback(() => {
    const allIds = relevantReservations.map(r => r.id);
    setReadNotificationIds(prev => {
      const combined = Array.from(new Set([...prev, ...allIds]));
      try {
        localStorage.setItem('read_reservation_notifications', JSON.stringify(combined));
      } catch (e) {}
      return combined;
    });
    const now = new Date().toISOString();
    setLastSeenTime(now);
    try {
      localStorage.setItem('last_seen_reservations_time', now);
    } catch (e) {}
  }, [relevantReservations]);

  useEffect(() => {
    if (sales.length === 0) return;

    // 1. Check for notifications on entrance (Ao entrar no sistema)
    if (!hasShownEntranceNotification) {
      const unseenAtEntrance = relevantReservations.filter(r => r.createdAt > lastSeenTime);
      setHasShownEntranceNotification(true);
    }

    // 2. Real-time Notification for reservations created while inside the system (active session)
    const latestReservation = relevantReservations[0];
    if (latestReservation) {
      const isNewInSession = latestReservation.createdAt > entranceTimeRef.current;
      
      const lastTriggeredId = sessionStorage.getItem('last_triggered_realtime_id');
      if (isNewInSession && latestReservation.id !== lastTriggeredId) {
        // Play notification sound
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-700.wav');
          audio.volume = 0.4;
          audio.play().catch(() => {});
        } catch (e) {}
        
        setRealtimeNotification(latestReservation);
        sessionStorage.setItem('last_triggered_realtime_id', latestReservation.id);

        const timer = setTimeout(() => {
          setRealtimeNotification(null);
        }, 8000);
        return () => clearTimeout(timer);
      }
    }
  }, [sales, relevantReservations, lastSeenTime, hasShownEntranceNotification]);

  // Check for product in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('p');
    if (productId && products.length > 0) {
      const product = products.find(p => p.id === productId);
      if (product) {
        setSelectedProduct(product);
      }
    }
  }, [products]);

  const handleShareProduct = useCallback((productId: string) => {
    const product = products.find(p => p.id === productId);
    const url = `${window.location.origin}${window.location.pathname}?p=${productId}`;
    
    // First try Web Share API for better native experience
    if (navigator.share) {
      navigator.share({
        title: product?.name || 'Comprar na Loja',
        text: `Confira este produto: ${product?.name}`,
        url: url,
      }).catch((error) => {
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      });
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(url).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      });
    }
  }, [products]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isProvinceModalOpen, setIsProvinceModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'featured' | 'price-asc' | 'price-desc' | 'rating'>('recent');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [isDesktopMode, setIsDesktopMode] = useState(false);

  // Favorites state persisted to localStorage
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('pda_favorites') || '[]');
    } catch {
      return [];
    }
  });

  const toggleFavorite = useCallback((productId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFavorites(prev => {
      const next = prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId];
      try {
        localStorage.setItem('pda_favorites', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Category matching helper adapting to store categories
  const matchCategory = useCallback((productCat: string, targetKey: string): boolean => {
    if (targetKey === 'all') return true;
    const p = (productCat || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const t = targetKey.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (t === 'roupas') return p.includes('roupa') || p.includes('camis') || p.includes('vest') || p.includes('calca') || p.includes('polo') || p.includes('moda') || p.includes('short');
    if (t === 'calcados') return p.includes('calcad') || p.includes('tenis') || p.includes('sapato') || p.includes('sandalia') || p.includes('chinel') || p.includes('bota');
    if (t === 'telemoveis') return p.includes('telemov') || p.includes('telefon') || p.includes('celular') || p.includes('smartphone') || p.includes('iphone') || p.includes('samsung');
    if (t === 'acessorios') return p.includes('acessor') || p.includes('fone') || p.includes('headphone') || p.includes('bolsa') || p.includes('mochila') || p.includes('cabo') || p.includes('carregador') || p.includes('oculos');
    if (t === 'relogios') return p.includes('relog') || p.includes('watch') || p.includes('smartwatch');
    if (t === 'outros') return true;
    return p === t || p.includes(t) || t.includes(p);
  }, []);

  // Viewport management for Desktop Mode
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    if (meta) {
      if (isDesktopMode) {
        meta.setAttribute('content', 'width=1200');
      } else {
        meta.setAttribute('content', 'width=device-width, initial-scale=1.0');
      }
    } else {
      const newMeta = document.createElement('meta');
      newMeta.name = 'viewport';
      newMeta.content = isDesktopMode ? 'width=1200' : 'width=device-width, initial-scale=1.0';
      document.getElementsByTagName('head')[0].appendChild(newMeta);
    }
  }, [isDesktopMode]);

  // Settings State
  const [settings, setSettings] = useState<SiteSettings>({
    id: 'site',
    logoUrl: '/pda-logo.svg',
    storeName: 'PDA COMERCIAL',
    storeDescription: 'Diversos para o seu dia-a-dia',
    primaryColor: '#ff6900', // orange-600 PDA
    accentColor: '#ff8500',  // orange-500 PDA
    priceColor: '#ff6900',   // Laranja PDA
    headerColor: '#062b5c',  // Azul PDA
    backgroundColor: '#f5f7fb',
    textColor: '#142238',
    showcaseColor: '#062b5c',
    searchBarColor: '#ffffff',
    borderRadius: '24px',
    fontFamily: 'Inter, sans-serif',
    whatsappNumber: '',
    emailForNotifications: '',
    adImageUrl: '',
    showAd: false,
    showBenefitsModal: false,
    salesResetDate: '',
    discountSettings: {
      enabled: true,
      percentage: 20,
      applyToAll: true,
      selectedProductIds: []
    }
  });

  const [isSettingsReady, setIsSettingsReady] = useState(false);
  const [isAdOpen, setIsAdOpen] = useState(false);
  const [showPromo, setShowPromo] = useState(false);
  const modalsTriggeredRef = useRef(false);

  useEffect(() => {
    if (!modalsTriggeredRef.current && isSettingsReady) {
      modalsTriggeredRef.current = true;

      // Trigger Benefits Modal
      if (settings.showBenefitsModal !== false) {
        setShowPromo(true);
      }

      // Trigger Ad Modal
      if (settings.showAd && settings.adImageUrl && !sessionStorage.getItem('hasSeenAd')) {
        setTimeout(() => setIsAdOpen(true), 1500);
      }
    }
  }, [isSettingsReady, settings.showBenefitsModal, settings.showAd, settings.adImageUrl]);

  const handleCloseAd = () => {
    setIsAdOpen(false);
    sessionStorage.setItem('hasSeenAd', 'true');
  };

  // Optimization: Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const getProductArrivalTimestamp = useCallback((product: Product) => {
    const productStocks = stock.filter(s => s.productId === product.id);
    let latestStockTime = 0;
    for (const s of productStocks) {
      if (s.lastUpdated) {
        const t = new Date(s.lastUpdated).getTime();
        if (t > latestStockTime) latestStockTime = t;
      }
    }
    const productCreatedTime = product.createdAt ? new Date(product.createdAt).getTime() : 0;
    const productStockedTime = product.lastStockedAt ? new Date(product.lastStockedAt).getTime() : 0;
    return Math.max(latestStockTime, productCreatedTime, productStockedTime);
  }, [stock]);

  const filteredProducts = useMemo(() => {
    let result = products;
    if (selectedCategory !== 'all') {
      result = result.filter(p => p.category === selectedCategory || matchCategory(p.category, selectedCategory));
    }
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase().trim();
      result = result.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.description.toLowerCase().includes(q) || 
        p.category.toLowerCase().includes(q)
      );
    }

    if (onlyInStock) {
      result = result.filter(p => isProductInStock(p.id, stock, selectedProvince));
    }

    const sorted = [...result];
    if (sortBy === 'price-asc') {
      sorted.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      sorted.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'featured') {
      sorted.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
    } else {
      // Default: 'recent' - produtos adicionados ou em estoque recentemente exibidos primeiros em ordem de chegada
      sorted.sort((a, b) => getProductArrivalTimestamp(b) - getProductArrivalTimestamp(a));
    }

    return sorted;
  }, [products, debouncedSearch, selectedCategory, onlyInStock, sortBy, stock, selectedProvince, getProductArrivalTimestamp]);

  // Top 10 recent products for automatic highlight rail
  const recentTop10 = useMemo(() => {
    if (!products || products.length === 0) return [];
    return [...products]
      .sort((a, b) => getProductArrivalTimestamp(b) - getProductArrivalTimestamp(a))
      .slice(0, 10);
  }, [products, getProductArrivalTimestamp]);

  const handleGoHome = useCallback(() => setView('store'), []);
  const handleOpenDashboard = useCallback(() => {
    if (!user) {
      handleLogin();
    } else {
      setIsClientDashboardOpen(true);
    }
  }, [user]);
  const handleOpenAdmin = useCallback(() => setView('admin'), []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Check admin role
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        setIsAdmin(
          userDoc.data()?.role === 'admin' || 
          user.email === 'pascoalbernabe678@gmail.com' || 
          user.email === 'pdacomercial64@gmail.com'
        );
      } else {
        setIsAdmin(false);
      }
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  // Real-time Listeners
  useEffect(() => {
    // Public listeners
    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'products'));

    const unsubStock = onSnapshot(collection(db, 'stock'), (snap) => {
      setStock(snap.docs.map(d => ({ id: d.id, ...d.data() } as Stock)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'stock'));

    const unsubCoupons = onSnapshot(collection(db, 'coupons'), (snap) => {
      setCoupons(snap.docs.map(d => ({ id: d.id, ...d.data() } as Coupon)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'coupons'));

    const unsubSettings = onSnapshot(doc(db, 'settings', 'site'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as SiteSettings;
        setSettings(prev => ({
          ...prev,
          ...data,
          id: docSnap.id,
          priceColor: data.priceColor || '#ff6900',
          logoUrl: data.logoUrl || '/pda-logo.svg',
          headerColor: data.headerColor || '#062b5c'
        }));
      }
      setIsSettingsReady(true);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'settings/site'));

    const unsubStats = onSnapshot(doc(db, 'stats', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setStats({ id: docSnap.id, ...docSnap.data() } as Stats);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'stats/global'));

    // Visitor Count Logic
    const hasVisited = sessionStorage.getItem('has_visited');
    if (!hasVisited) {
      const statsRef = doc(db, 'stats', 'global');
      getDoc(statsRef).then((docSnap) => {
        if (docSnap.exists()) {
          updateDoc(statsRef, {
            visitorCount: increment(1)
          }).catch(err => console.error('Error incrementing visitor count:', err));
        } else {
          // Initialize stats if it doesn't exist (only admin should be able to create, but we can try)
          setDoc(statsRef, { visitorCount: 1 }).catch(() => {
            // If create fails (not admin), it's expected if it doesn't exist yet
          });
        }
        sessionStorage.setItem('has_visited', 'true');
      });
    }

    // Optimization: Conditional subscriptions
    // Only subscribe to sales if admin (all sales for alerts) or logged-in user (personal reservations)
    let unsubSales = () => {};

    if (isAdmin) {
      // Admins subscribe to all sales to handle background live notifications
      unsubSales = onSnapshot(query(collection(db, 'sales'), orderBy('createdAt', 'desc')), (snap) => {
        setSales(snap.docs.map(d => ({ id: d.id, ...d.data() } as Sale)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'sales'));
    } else if (user) {
      // Small reservation listener for standard users
      unsubSales = onSnapshot(query(collection(db, 'sales'), where('userId', '==', user.uid)), (snap) => {
        const salesData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Sale));
        setSales(salesData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'sales'));
    }

    return () => {
      unsubProducts();
      unsubStock();
      unsubCoupons();
      unsubSettings();
      unsubStats();
      unsubSales();
    };
  }, [isAdmin, user]);

  const handleReservation = async (data: any) => {
    // Check stock accurately
    const stockItem = stock.find(s => 
      s.productId === data.productId && 
      s.variation.color === data.variation.color && 
      s.variation.size === data.variation.size
    );

    const available = getVariationStock(stockItem, data.customerProvince);
    if (available < data.quantity) {
      alert(`Desculpe, este produto tem apenas ${available} unidade(s) disponível(is) em estoque para esta variação.`);
      return;
    }

    try {
      await addDoc(collection(db, 'sales'), {
        ...data,
        userId: auth.currentUser?.uid || null,
        items: [{
          productId: data.productId,
          productName: data.productName,
          variation: data.variation,
          quantity: data.quantity,
          price: data.price
        }],
        totalAmount: data.price * data.quantity,
        paidAmount: 0,
        status: 'pending',
        type: 'reservation',
        createdAt: new Date().toISOString()
      });
      setSelectedProduct(null);
      alert('Reserva realizada com sucesso! Entraremos em contato.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'sales');
    }
  };

  const handleUpdateReservationStatus = async (id: string, status: 'paid' | 'cancelled') => {
    try {
      const sale = sales.find(s => s.id === id);
      if (!sale) return;

      const updateData: any = { status };
      if (status === 'paid') {
        updateData.type = 'sale';
        updateData.paidAmount = sale.totalAmount;
        updateData.paidAt = new Date().toISOString();

        // Decrement stock for each item with exact province synchronization
        for (const item of sale.items) {
          const stockItem = stock.find(s => 
            s.productId === item.productId && 
            s.variation.color === item.variation.color && 
            s.variation.size === item.variation.size
          );

          if (stockItem) {
            const province = sale.customerProvince === 'Cunene' ? 'Cunene' : 'Huíla';
            const currentHuila = Math.max(0, Math.floor(Number(stockItem.quantitiesByProvince?.['Huíla']) || 0));
            const currentCunene = Math.max(0, Math.floor(Number(stockItem.quantitiesByProvince?.['Cunene']) || 0));
            
            const newHuila = province === 'Huíla' ? Math.max(0, currentHuila - item.quantity) : currentHuila;
            const newCunene = province === 'Cunene' ? Math.max(0, currentCunene - item.quantity) : currentCunene;
            const newTotal = newHuila + newCunene;

            await updateDoc(doc(db, 'stock', stockItem.id), {
              quantity: newTotal,
              quantitiesByProvince: {
                Huíla: newHuila,
                Cunene: newCunene
              },
              lastUpdated: new Date().toISOString()
            });
          }
        }
      }
      await updateDoc(doc(db, 'sales', id), updateData);
      alert(status === 'paid' ? 'Pagamento confirmado, estoque atualizado e reserva convertida em venda!' : 'Reserva cancelada com sucesso!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'sales');
    }
  };

  const handleRateProduct = useCallback(async (productId: string, value: number) => {
    try {
      await addDoc(collection(db, 'ratings'), {
        productId,
        value,
        createdAt: new Date().toISOString()
      });

      const product = products.find(p => p.id === productId);
      if (product) {
        const currentCount = product.ratingCount || 0;
        const currentRating = product.rating || 0;
        const newCount = currentCount + 1;
        const newRating = (currentRating * currentCount + value) / newCount;

        await updateDoc(doc(db, 'products', productId), {
          rating: newRating,
          ratingCount: newCount
        });
      }
      alert('Obrigado pela sua avaliação!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'ratings');
    }
  }, [products]);

  const handleComment = useCallback(async (productId: string, userName: string, text: string) => {
    try {
      await addDoc(collection(db, 'comments'), {
        productId,
        userName,
        text,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'comments');
    }
  }, []);

  const addToCart = useCallback((item: CartItem) => {
    setCart(prev => {
      const existing = prev.find(i => 
        i.productId === item.productId && 
        i.variation.color === item.variation.color && 
        i.variation.size === item.variation.size
      );
      if (existing) {
        return prev.map(i => 
          (i.productId === item.productId && 
           i.variation.color === item.variation.color && 
           i.variation.size === item.variation.size) 
          ? { ...i, quantity: i.quantity + item.quantity } 
          : i
        );
      }
      return [...prev, item];
    });
    // Do not open cart automatically; show animated feedback
    setAddedCartItem({ item, timestamp: Date.now() });
    setIsCartBouncing(true);
    setTimeout(() => setIsCartBouncing(false), 900);
  }, []);

  const removeFromCart = useCallback((productId: string, color: string, size: string) => {
    setCart(prev => prev.filter(i => 
      !(i.productId === productId && i.variation.color === color && i.variation.size === size)
    ));
  }, []);

  const updateCartQuantity = useCallback((productId: string, color: string, size: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, color, size);
      return;
    }
    setCart(prev => prev.map(i => 
      (i.productId === productId && i.variation.color === color && i.variation.size === size)
      ? { ...i, quantity }
      : i
    ));
  }, [removeFromCart]);

  const handleCartReservation = useCallback(async (customerInfo: { name: string, phone: string, province: string, neighborhood?: string, address?: string, coupon?: Coupon, channel?: 'whatsapp' | 'sms' }) => {
    if (cart.length === 0) return;

    if (!customerInfo.province) {
      alert("Por favor, selecione a sua Província (Cunene ou Huíla) nos Dados da Reserva para finalizar!");
      return;
    }

    // Check stock for all items
    for (const item of cart) {
      const stockItem = stock.find(s => 
        s.productId === item.productId && 
        s.variation.color === item.variation.color && 
        s.variation.size === item.variation.size
      );
      
      const chosenProvince = customerInfo.province;
      const provinceQty = stockItem?.quantitiesByProvince?.[chosenProvince] ?? stockItem?.quantity ?? 0;

      if (!stockItem || provinceQty < item.quantity) {
        const provinceName = chosenProvince === 'Cunene' ? 'no Cunene' : (chosenProvince === 'Huíla' ? 'na Huíla' : `em ${chosenProvince}`);
        alert(`PRODUTO ESGOTADO ${provinceName}, ligue para encomendar!\n\nO produto "${item.productName}" (${item.variation.color}, ${item.variation.size}) não tem estoque suficiente disponível.`);
        return;
      }
    }

    try {
      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      let discount = 0;
      if (customerInfo.coupon) {
        if (customerInfo.coupon.productId) {
          const targetItems = cart.filter(i => i.productId === customerInfo.coupon?.productId);
          if (targetItems.length > 0) {
            const targetSubtotal = targetItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            discount = customerInfo.coupon.type === 'percentage' 
              ? (targetSubtotal * customerInfo.coupon.value) / 100 
              : Math.min(customerInfo.coupon.value, targetSubtotal);
          }
        } else {
          discount = customerInfo.coupon.type === 'percentage' 
            ? (subtotal * customerInfo.coupon.value) / 100 
            : Math.min(customerInfo.coupon.value, subtotal);
        }
      }

      // Validar disponibilidade de estoque real antes de registrar a reserva
      for (const item of cart) {
        const stockItem = stock.find(s => 
          s.productId === item.productId && 
          s.variation.color === item.variation.color && 
          s.variation.size === item.variation.size
        );
        const available = getVariationStock(stockItem, customerInfo.province);
        if (available < item.quantity) {
          alert(`Desculpe, o produto "${item.productName}" (${item.variation.color}/${item.variation.size}) tem apenas ${available} unidade(s) disponível(is) em estoque na província de ${customerInfo.province || 'informada'}. Por favor, ajuste a quantidade.`);
          return;
        }
      }

      const totalAmount = subtotal - discount;
      const saleId = (await addDoc(collection(db, 'sales'), {
        customerName: customerInfo.name || 'Consumidor Final',
        customerPhone: customerInfo.phone || 'N/A',
        customerProvince: customerInfo.province || 'Não informada',
        customerNeighborhood: customerInfo.neighborhood || null,
        customerAddress: customerInfo.address || null,
        userId: auth.currentUser?.uid || null,
        items: cart.map(item => ({
          productId: item.productId,
          productName: item.productName,
          variation: item.variation,
          quantity: item.quantity,
          price: item.price
        })),
        subtotal,
        discount,
        couponCode: customerInfo.coupon?.code || null,
        totalAmount,
        paidAmount: 0,
        status: 'pending',
        type: 'reservation',
        channel: customerInfo.channel || 'whatsapp',
        createdAt: new Date().toISOString()
      })).id;

      // Track reservation for this user/device
      try {
        const guestIds: string[] = JSON.parse(localStorage.getItem('my_reservation_ids') || '[]');
        if (!guestIds.includes(saleId)) {
          guestIds.push(saleId);
          localStorage.setItem('my_reservation_ids', JSON.stringify(guestIds));
        }
      } catch (e) {}

      // Update coupon usage count if used
      if (customerInfo.coupon) {
        const couponRef = doc(db, 'coupons', customerInfo.coupon.id);
        await updateDoc(couponRef, {
          usageCount: increment(1)
        });
      }

      const channel = customerInfo.channel || 'whatsapp';
      const targetPhone = (settings.whatsappNumber || '244935799097').replace(/\D/g, '');

      if (channel === 'sms') {
        const smsText = `*Nova Reserva - ${settings.storeName || 'PDA COMERCIAL'}*\n` +
          `ID: ${saleId.slice(-6).toUpperCase()}\n` +
          `Cliente: ${customerInfo.name || 'Consumidor Final'}\n` +
          `Tel: ${customerInfo.phone || 'N/A'}\n` +
          `Província: ${customerInfo.province}\n` +
          (customerInfo.neighborhood ? `Bairro: ${customerInfo.neighborhood}\n` : '') +
          `Itens:\n` +
          cart.map(item => `- ${item.productName} (${item.variation.color}/${item.variation.size}) x${item.quantity}`).join('\n') +
          `\nTotal: KZ ${totalAmount.toFixed(2)}`;

        setCart([]);
        setIsCartOpen(false);
        handleProvinceChange('');

        const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
        const smsUrl = isIOS
          ? `sms:${targetPhone}&body=${encodeURIComponent(smsText)}`
          : `sms:${targetPhone}?body=${encodeURIComponent(smsText)}`;

        window.location.href = smsUrl;
      } else {
        const message = `*Nova Reserva - ${settings.storeName}*\n\n` +
          `*ID:* ${saleId}\n` +
          `*Cliente:* ${customerInfo.name || 'Consumidor Final'}\n` +
          `*WhatsApp:* ${customerInfo.phone || 'N/A'}\n` +
          `*Província:* ${customerInfo.province || 'Não informada'}\n` +
          (customerInfo.neighborhood ? `*Bairro:* ${customerInfo.neighborhood}\n` : '') +
          (customerInfo.address ? `*Endereço/Referência:* ${customerInfo.address}\n` : '') + `\n` +
          `*Itens:* \n` +
          cart.map(item => `- ${item.productName} (${item.variation.color}/${item.variation.size}) x${item.quantity}: KZ ${(item.price * item.quantity).toFixed(2)}`).join('\n') +
          `\n\n*Total:* KZ ${totalAmount.toFixed(2)}`;

        // WhatsApp flow
        if (settings.whatsappNumber) {
          setCart([]);
          setIsCartOpen(false);
          handleProvinceChange('');
          const encoded = encodeURIComponent(message);
          window.open(`https://wa.me/${targetPhone}?text=${encoded}`, '_blank');
        } else if (settings.emailForNotifications) {
          setCart([]);
          setIsCartOpen(false);
          handleProvinceChange('');
          const subject = encodeURIComponent(`Nova Reserva: ${customerInfo.name || 'Consumidor Final'}`);
          const body = encodeURIComponent(message);
          window.open(`mailto:${settings.emailForNotifications}?subject=${subject}&body=${body}`, '_blank');
        } else {
          alert('Reserva realizada com sucesso! Entraremos em contato.');
          setCart([]);
          setIsCartOpen(false);
          handleProvinceChange('');
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'sales');
    }
  }, [cart, stock, settings, handleProvinceChange]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return <StorePageSkeleton />;
  }

  return (
    <ErrorBoundary>
      <TopProgressBar isAnimating={isLoading} />
      <style>
        {`
          :root {
            --primary: ${settings.primaryColor};
            --accent: ${settings.accentColor};
            --radius: ${settings.borderRadius};
          }
          body {
            font-family: ${settings.fontFamily};
          }
          .glass {
            border-radius: var(--radius);
          }
          .rounded-2xl { border-radius: calc(var(--radius) * 0.6); }
          .rounded-3xl { border-radius: var(--radius); }
          .rounded-\[32px\] { border-radius: calc(var(--radius) * 1.3); }
          .rounded-\[40px\] { border-radius: calc(var(--radius) * 1.6); }
          
          .text-gradient {
            background: linear-gradient(to right, ${settings.primaryColor}, ${settings.accentColor});
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          .bg-primary { background-color: ${settings.primaryColor}; }
          .text-primary { color: ${settings.primaryColor}; }
          .border-primary { border-color: ${settings.primaryColor}; }
        `}
      </style>
      <div 
        className="min-h-screen selection:bg-orange-100 transition-colors"
        style={{
          backgroundColor: settings.backgroundColor || '#f5f7fb',
          color: settings.textColor || '#142238'
        }}
      >
        {view === 'store' ? (
          <div className="pb-20">
            {/* Cabeçalho PDA Comercial reduzido a 20% */}
            <header 
              className="header text-white px-3 sm:px-5 pt-2.5 pb-2.5 sm:pt-3 sm:pb-3 rounded-b-[18px] shadow-md sticky top-0 z-50 transition-all"
              style={{ backgroundColor: settings.headerColor || '#062b5c' }}
            >
              <div className="max-w-7xl mx-auto">
                <div className="header-top flex items-center justify-between gap-2">
                  {/* Logo PDA Comercial */}
                  <div 
                    onClick={() => {
                      setSelectedCategory('all');
                      setSearchQuery('');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="logo flex items-center gap-2 cursor-pointer group"
                  >
                    <div className="logo-icon w-7.5 h-7.5 sm:w-8.5 sm:h-8.5 bg-white rounded-[9px] flex items-center justify-center text-[#ff6900] shadow-md group-hover:scale-105 transition-transform shrink-0 overflow-hidden p-0.5">
                      {settings.logoUrl && settings.logoUrl !== '/pda-logo.svg' ? (
                        <SafeImage src={settings.logoUrl} className="w-full h-full object-contain" />
                      ) : (
                        <PdaLogo className="w-full h-full object-contain" />
                      )}
                    </div>
                    <div className="logo-text flex flex-col">
                      <strong className="text-base sm:text-lg font-black text-white leading-none tracking-tight">
                        PDA
                      </strong>
                      <span className="text-[#ff6900] font-black text-[9px] sm:text-[10px] tracking-wider leading-none mt-0.5">
                        COMERCIAL
                      </span>
                    </div>
                  </div>

                  {/* Header Actions */}
                  <div className="header-actions flex items-center gap-1.5 sm:gap-2">
                    {/* WhatsApp Quick Link */}
                    <a
                      href={`https://wa.me/${(settings.whatsappNumber || '244935799097').replace(/\D/g, '')}?text=${encodeURIComponent('Olá! Gostaria de suporte sobre a PDA COMERCIAL.')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="icon-btn w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all active:scale-95 hidden sm:flex"
                      title="Falar no WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20" />
                    </a>

                    {/* User Login / Profile */}
                    {!user ? (
                      <button 
                        onClick={handleLogin}
                        className="bg-white/15 hover:bg-[#ff6900] text-white px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                      >
                        Entrar
                      </button>
                    ) : (
                      <div className="relative">
                        <button 
                          onClick={() => setIsProfilePanelOpen(!isProfilePanelOpen)}
                          className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full flex items-center justify-center font-bold border border-white/20 bg-white/15 text-white cursor-pointer hover:bg-white/25 transition-all active:scale-95 overflow-hidden shadow-xs text-[10px]"
                        >
                          {user.photoURL ? (
                            <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                          ) : (
                            user.displayName?.[0] || 'U'
                          )}
                        </button>
                        
                        <AnimatePresence>
                          {isProfilePanelOpen && (
                            <motion.div 
                              key="profile-overlay"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="fixed inset-0 z-40 bg-black/10" 
                              onClick={() => setIsProfilePanelOpen(false)} 
                            />
                          )}
                          {isProfilePanelOpen && (
                            <motion.div
                              key="profile-dropdown"
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              className="absolute right-0 mt-3 w-64 bg-white text-zinc-900 rounded-2xl shadow-2xl border border-zinc-100 overflow-hidden z-50 p-2"
                            >
                                <div className="px-4 py-3 border-b border-zinc-50 mb-1">
                                  <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Logado como</div>
                                  <div className="text-sm font-bold truncate">{user.displayName || user.email?.split('@')[0]}</div>
                                  <div className="text-[10px] text-zinc-500 truncate">{user.email}</div>
                                </div>
                                
                                <button
                                  onClick={() => {
                                    setIsClientDashboardOpen(true);
                                    setIsProfilePanelOpen(false);
                                  }}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-zinc-700 hover:bg-zinc-50 transition-all mb-1 group"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600 group-hover:bg-[#ff6900] group-hover:text-white transition-all">
                                    <User className="w-4 h-4" />
                                  </div>
                                  Seu Painel
                                </button>

                                <button
                                  onClick={() => setIsDesktopMode(!isDesktopMode)}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-zinc-700 hover:bg-zinc-50 transition-all mb-1 group"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                    {isDesktopMode ? <Smartphone className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                                  </div>
                                  {isDesktopMode ? 'Modo Mobile' : 'Modo Desktop'}
                                </button>

                                {isAdmin && (
                                  <button
                                    onClick={() => {
                                      setView('admin');
                                      setIsProfilePanelOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-zinc-700 hover:bg-zinc-50 hover:text-orange-600 transition-all mb-1 group"
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 group-hover:bg-[#ff6900] group-hover:text-white transition-all">
                                      <LayoutDashboard className="w-4 h-4" />
                                    </div>
                                    Painel ADM
                                  </button>
                                )}

                                <button
                                  onClick={() => {
                                    setIsProfilePanelOpen(false);
                                    if (window.confirm('Deseja realmente sair?')) {
                                      signOut(auth);
                                    }
                                  }}
                                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition-all group"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600 group-hover:bg-red-500 group-hover:text-white transition-all">
                                    <LogOut className="w-4 h-4" />
                                  </div>
                                  Encerrar Sessão
                                </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Cart Button with Count Badge */}
                    <motion.button 
                      onClick={() => setIsCartOpen(true)}
                      animate={isCartBouncing ? {
                        scale: [1, 1.25, 0.9, 1.15, 1],
                        rotate: [0, -8, 8, -4, 0],
                        transition: { duration: 0.5 }
                      } : {}}
                      className="icon-btn relative w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                      title="Abrir Carrinho"
                    >
                      <ShoppingCart className="w-3.5 h-3.5 text-white" />
                      {cart.length > 0 && (
                        <motion.span 
                          key={cart.reduce((sum, i) => sum + i.quantity, 0)}
                          initial={{ scale: 0.5 }}
                          animate={{ scale: 1 }}
                          className="cart-count absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#ff6900] text-white text-[8px] font-bold flex items-center justify-center border border-[#062b5c] shadow-sm"
                        >
                          {cart.reduce((sum, i) => sum + i.quantity, 0)}
                        </motion.span>
                      )}
                    </motion.button>
                  </div>
                </div>

                {/* Pesquisa Integrada no Cabeçalho (reduzida a 20%) */}
                <div className="search-wrapper max-w-7xl mx-auto mt-1.5 sm:mt-2">
                  <div 
                    className="search rounded-[11px] h-[34px] sm:h-[36px] px-3 flex items-center shadow-md relative transition-all border border-transparent focus-within:border-[#ff6900]"
                    style={{ backgroundColor: settings.searchBarColor || '#ffffff' }}
                  >
                    <Search className="search-icon w-3.5 h-3.5 text-[#68768a] shrink-0" />
                    <input 
                      type="search" 
                      placeholder="O que você procura?" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 bg-transparent border-none outline-none pl-2 text-xs text-[#142238] placeholder:text-[#9ba5b4] font-medium"
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="p-0.5 text-zinc-400 hover:text-zinc-700 rounded-full cursor-pointer"
                        title="Limpar pesquisa"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </header>

            {/* Anúncio Principal / Carrossel de Destaques Moderno */}
            <main className="container max-w-7xl mx-auto px-4 sm:px-6">
              <HeroCarousel
                products={products}
                settings={settings}
                onSelectProduct={setSelectedProduct}
                onViewOffers={() => {
                  const el = document.getElementById('catalog-products');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
              />

              {/* Categorias Adaptadas (Roupas, Calçados, Telemóveis, Acessórios, Relógios, Outros) */}
              <section className="section mt-7">
                <div className="section-header flex items-center justify-between mb-3.5">
                  <h2 className="section-title text-xl sm:text-2xl font-black text-[#142238] tracking-tight">
                    Categorias
                  </h2>

                  <button 
                    onClick={() => setSelectedCategory('all')}
                    className="see-all text-xs sm:text-sm font-bold text-[#ff6900] hover:text-[#ff8500] cursor-pointer transition-colors"
                  >
                    Ver todas
                  </button>
                </div>

                <div className="categories grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4">
                  {[
                    { id: 'roupas', name: 'Roupas', icon: '👕', filterKey: 'roupas' },
                    { id: 'calcados', name: 'Calçados', icon: '👟', filterKey: 'calcados' },
                    { id: 'telemoveis', name: 'Telemóveis', icon: '📱', filterKey: 'telemoveis' },
                    { id: 'acessorios', name: 'Acessórios', icon: '🎧', filterKey: 'acessorios' },
                    { id: 'relogios', name: 'Relógios', icon: '⌚', filterKey: 'relogios' },
                    { id: 'outros', name: 'Outros', icon: '•••', filterKey: 'all' },
                  ].map(cat => {
                    const isSelected = selectedCategory === cat.filterKey;
                    return (
                      <div
                        key={cat.id}
                        onClick={() => setSelectedCategory(isSelected ? 'all' : cat.filterKey)}
                        className={cn(
                          "category bg-white rounded-[20px] p-3 sm:p-3.5 text-center transition-all cursor-pointer border shadow-xs hover:-translate-y-1 hover:shadow-md",
                          isSelected 
                            ? "border-[#ff6900] ring-2 ring-orange-500/20 bg-orange-50/20" 
                            : "border-[#e7ebf1] hover:border-orange-200"
                        )}
                      >
                        <div className="category-image w-14 h-14 sm:w-18 sm:h-18 mx-auto rounded-[16px] sm:rounded-[18px] bg-[#f2f4f8] flex items-center justify-center text-2xl sm:text-3xl shadow-inner transition-transform group-hover:scale-105">
                          {cat.icon}
                        </div>
                        <span className={cn(
                          "category-name block mt-2 text-xs sm:text-sm font-bold truncate transition-colors",
                          isSelected ? "text-[#ff6900]" : "text-[#142238]"
                        )}>
                          {cat.name}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Sub-Pills de Categorias registradas na Loja */}
                <div id="catalog-products" className="mt-4 pt-2">
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className={cn(
                        "px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 cursor-pointer",
                        selectedCategory === 'all'
                          ? "bg-[#ff6900] text-white shadow-md shadow-orange-600/20"
                          : "bg-white border border-[#e7ebf1] text-[#142238] hover:bg-zinc-100"
                      )}
                    >
                      Todos ({products.length})
                    </button>
                    {Array.from(new Set(products.map(p => p.category))).map(cat => {
                      const count = products.filter(p => p.category === cat).length;
                      return (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className={cn(
                            "px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 cursor-pointer",
                            selectedCategory === cat
                              ? "bg-[#ff6900] text-white shadow-md shadow-orange-600/20"
                              : "bg-white border border-[#e7ebf1] text-[#142238] hover:bg-zinc-100"
                          )}
                        >
                          {cat} ({count})
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* Seção Produtos */}
              <section className="section mt-6">
                <div className="section-header flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <h2 className="section-title text-xl sm:text-2xl font-black text-[#142238] tracking-tight">
                      Produtos
                    </h2>
                    <span className="text-xs text-[#7b8798] font-bold">
                      ({filteredProducts.length} itens)
                    </span>
                  </div>

                  {/* Controles de Filtro e Ordenação */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      onClick={() => setOnlyInStock(!onlyInStock)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer active:scale-95",
                        onlyInStock
                          ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                          : "bg-white border-[#e7ebf1] text-[#142238] hover:bg-zinc-50"
                      )}
                      title={selectedProvince ? `Mostrar apenas produtos disponíveis em ${selectedProvince}` : "Mostrar apenas produtos com estoque disponível"}
                    >
                      <Check className={cn("w-3.5 h-3.5", onlyInStock ? "text-emerald-600" : "text-zinc-300")} />
                      <span>{selectedProvince ? `Em estoque em ${selectedProvince}` : 'Apenas em estoque'}</span>
                    </button>

                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="px-3 py-2 bg-white border border-[#e7ebf1] rounded-xl text-xs font-bold text-[#142238] outline-none focus:border-[#ff6900] cursor-pointer"
                    >
                      <option value="recent">Mais Recentes (Chegada)</option>
                      <option value="featured">Destaques</option>
                      <option value="price-asc">Menor Preço</option>
                      <option value="price-desc">Maior Preço</option>
                      <option value="rating">Melhor Avaliados</option>
                    </select>

                    {(selectedCategory !== 'all' || searchQuery || onlyInStock) && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedCategory('all');
                          setOnlyInStock(false);
                        }}
                        className="see-all text-xs font-bold text-[#ff6900] hover:underline cursor-pointer ml-1"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                </div>

            {settings.showBenefitsModal !== false && (
              <PromotionalModal 
                isOpen={showPromo} 
                onClose={() => setShowPromo(false)} 
                storeName={settings.storeName}
              />
            )}

            {/* Product Grid */}
            <div>
              {filteredProducts.length === 0 ? (
                <div className="text-center py-20 bg-zinc-50 rounded-3xl border border-zinc-200/80">
                  <Package className="w-16 h-16 text-zinc-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2 text-zinc-800">Nenhum produto encontrado</h3>
                  <p className="text-zinc-500 text-sm max-w-md mx-auto mb-4">
                    {searchQuery 
                      ? `Não encontramos resultados para "${searchQuery}". Tente outro termo.` 
                      : onlyInStock
                        ? (selectedProvince 
                            ? `Não há produtos com estoque em ${selectedProvince} nesta categoria.`
                            : "Não há produtos com estoque disponível nesta categoria.")
                        : "Estamos preparando novidades para você."}
                  </p>
                  {(searchQuery || onlyInStock || selectedCategory !== 'all') && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('all');
                        setOnlyInStock(false);
                      }}
                      className="px-4 py-2 rounded-xl bg-orange-600 text-white font-bold text-xs hover:bg-orange-700 transition-colors shadow-sm"
                    >
                      Limpar Filtros
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6">
                  {filteredProducts.map((product, idx) => {
                    // Mobile (2 colunas): Exibição ÚNICA após as 3 primeiras filas (após 6 produtos)
                    const isMobileTrigger = idx === 5 || (filteredProducts.length < 6 && idx === filteredProducts.length - 1);
                    // PC (3 colunas): Exibição ÚNICA após as 3 primeiras filas (após 9 produtos)
                    const isPcTrigger = idx === 8 || (filteredProducts.length < 9 && idx === filteredProducts.length - 1);

                    return (
                      <React.Fragment key={product.id}>
                        <ProductCard 
                          product={product} 
                          index={idx}
                          onSelect={setSelectedProduct} 
                          stock={stock}
                          onCallUs={() => setIsPhoneModalOpen(true)}
                          selectedProvince={selectedProvince}
                          onAddToCart={addToCart}
                          isFavorite={favorites.includes(product.id)}
                          onToggleFavorite={toggleFavorite}
                          priceColor={settings.priceColor || '#ff6900'}
                          discountSettings={settings.discountSettings}
                        />
                        {/* Mobile: Exibição única após as 3 filas abaixo */}
                        {isMobileTrigger && recentTop10.length > 0 && (
                          <div className="col-span-full sm:hidden">
                            <RecentTop10Rail 
                              products={recentTop10} 
                              onSelect={setSelectedProduct} 
                              priceColor={settings.priceColor || '#ff6900'}
                              discountSettings={settings.discountSettings}
                            />
                          </div>
                        )}
                        {/* Modo PC: Exibição única após as 3 filas de 3 abaixo */}
                        {isPcTrigger && recentTop10.length > 0 && (
                          <div className="col-span-full hidden sm:block">
                            <RecentTop10Rail 
                              products={recentTop10} 
                              onSelect={setSelectedProduct} 
                              priceColor={settings.priceColor || '#ff6900'}
                              discountSettings={settings.discountSettings}
                            />
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

            {/* Segundo Anúncio / Ofertas Especiais Inspirado no Script */}
            <section className="advertisement mt-8 mb-6 p-6 sm:p-7 rounded-[22px] bg-[#062b5c] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-5 border border-blue-900/40 shadow-xl shadow-[#062b5c]/10 relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-white/5 pointer-events-none" />
              <div className="relative z-10 max-w-lg">
                <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                  Ofertas especiais
                </h2>
                <p className="mt-1.5 text-white/85 text-xs sm:text-sm font-normal">
                  Aproveite os preços promocionais por tempo limitado. Entregas rápidas em Huíla e Cunene.
                </p>
              </div>

              <div className="relative z-10">
                <button
                  onClick={() => {
                    setSortBy('featured');
                    const el = document.getElementById('catalog-products');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#ff6900] hover:bg-[#ff8500] text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 whitespace-nowrap cursor-pointer"
                >
                  Ver ofertas
                </button>
              </div>
            </section>
          </main>

            <AnimatePresence>
              {selectedProduct && (
                <ProductModal 
                  key="product-modal-view"
                  product={selectedProduct} 
                  onClose={() => {
                    setSelectedProduct(null);
                    // Limpar URL ao fechar
                    window.history.replaceState({}, '', window.location.pathname);
                  }}
                  onAddToCart={addToCart}
                  onBuyNow={(item) => {
                    addToCart(item);
                    setSelectedProduct(null);
                    setIsCartOpen(true);
                  }}
                  isFavorite={favorites.includes(selectedProduct.id)}
                  onToggleFavorite={toggleFavorite}
                  onRate={(val) => handleRateProduct(selectedProduct.id, val)}
                  onComment={(name, text) => handleComment(selectedProduct.id, name, text)}
                  stock={stock}
                  onCallUs={() => setIsPhoneModalOpen(true)}
                  onShare={handleShareProduct}
                  copiedLink={copiedLink}
                  selectedProvince={selectedProvince}
                  priceColor={settings.priceColor || '#ff6900'}
                  discountSettings={settings.discountSettings}
                />
              )}
            </AnimatePresence>

            <Cart 
              isOpen={isCartOpen} 
              onClose={() => setIsCartOpen(false)} 
              items={cart} 
              onUpdateQuantity={updateCartQuantity}
              onRemove={removeFromCart}
              onCheckout={handleCartReservation}
              onCallUs={() => setIsPhoneModalOpen(true)}
              onViewReservations={() => setIsClientDashboardOpen(true)}
              isAuthenticated={!!user}
              availableCoupons={coupons}
              selectedProvince={selectedProvince}
              onProvinceChange={handleProvinceChange}
              stock={stock}
            />

            {/* Delivery Support Footer */}
            <footer id="delivery-support" className="mt-20 py-12 border-t border-zinc-100 bg-zinc-50/50">
              <div className="max-w-7xl mx-auto px-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                  <div className="text-center md:text-left">
                    <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">Suporte de Entrega</h4>
                    <div className="flex flex-col gap-4">
                      <a href="mailto:pdacomercial64@gmail.com" className="text-zinc-900 font-bold hover:text-orange-600 transition-colors flex items-center justify-center md:justify-start gap-2">
                        <MessageSquare className="w-4 h-4" />
                        pdacomercial64@gmail.com
                      </a>
                      <button 
                        onClick={() => setIsPhoneModalOpen(true)}
                        className="bg-zinc-900 text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center justify-center md:justify-start gap-2 hover:bg-zinc-800 transition-all w-fit"
                      >
                        <Phone className="w-4 h-4" />
                        Ligue para nós
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col items-center md:items-end">
                    <span className="font-display text-xl font-bold tracking-tight uppercase text-zinc-900">
                      {settings.storeName.split(' ').map((word, i) => (
                        <span key={i} className={i === settings.storeName.split(' ').length - 1 ? "text-primary" : ""}>
                          {word}{' '}
                        </span>
                      ))}
                    </span>
                    <p className="text-xs text-zinc-500 mt-1">© 2026 Todos os direitos reservados.</p>
                  </div>
                </div>
              </div>
            </footer>

            {/* Phone Selection Modal */}
            <AnimatePresence>
              {isPhoneModalOpen && (
                <motion.div 
                  key="phone-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsPhoneModalOpen(false)}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                />
              )}
              {isPhoneModalOpen && (
                <motion.div 
                  key="phone-modal"
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="fixed inset-0 z-[101] flex items-center justify-center p-6 pointer-events-none"
                >
                  <div className="w-full max-w-sm bg-white rounded-[32px] overflow-hidden shadow-2xl pointer-events-auto">
                    <div className="p-8">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold">Ligue para nós</h3>
                        <button onClick={() => setIsPhoneModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <p className="text-zinc-500 text-sm mb-8">Escolha um dos nossos números para iniciar uma chamada direta com o suporte.</p>
                      
                      <div className="space-y-3">
                        {[
                          { label: 'Suporte Principal', phone: '+244 935 799 097', value: '+244935799097' },
                          { label: 'Suporte Alternativo 1', phone: '+244 938 454 349', value: '+244938454349' },
                          { label: 'Suporte Alternativo 2', phone: '+244 926 259 738', value: '+244926259738' },
                        ].map((item) => (
                          <a 
                            key={item.value}
                            href={`tel:${item.value}`}
                            className="flex items-center justify-between p-4 bg-zinc-50 hover:bg-orange-50 border border-zinc-100 hover:border-orange-200 rounded-2xl transition-all group"
                          >
                            <div>
                              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 group-hover:text-orange-400">{item.label}</div>
                              <div className="font-bold text-zinc-900">{item.phone}</div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-white border border-zinc-100 flex items-center justify-center text-zinc-400 group-hover:text-orange-600 group-hover:border-orange-200 transition-all shadow-sm">
                              <Phone className="w-5 h-5" />
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                    <div className="p-6 bg-zinc-50 border-t border-zinc-100 text-center">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Atendimento 24/7</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Filter Modal */}
            <AnimatePresence>
              {isFilterModalOpen && (
                <motion.div 
                  key="filter-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsFilterModalOpen(false)}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                />
              )}
              {isFilterModalOpen && (
                <motion.div 
                  key="filter-modal"
                  initial={{ opacity: 0, y: "100%" }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: "100%" }}
                  className="fixed inset-x-0 bottom-0 z-[101] p-4 pointer-events-none md:hidden"
                >
                    <div className="w-full max-w-sm mx-auto bg-white rounded-[32px] overflow-hidden shadow-2xl pointer-events-auto">
                      <div className="p-8">
                         <div className="flex justify-between items-center mb-6">
                          <h3 className="text-xl font-bold">Categorias</h3>
                          <button onClick={() => setIsFilterModalOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3 max-h-[60vh] overflow-y-auto pr-2 no-scrollbar">
                          <button 
                            onClick={() => {
                              setSelectedCategory('all');
                              setIsFilterModalOpen(false);
                            }}
                            className={cn(
                              "w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left",
                              selectedCategory === 'all' 
                                ? "bg-orange-50 border-orange-200 text-orange-600 ring-2 ring-orange-100" 
                                : "bg-zinc-50 border-zinc-100 text-zinc-900"
                            )}
                          >
                            <span className="font-bold">Todos os Produtos</span>
                            {selectedCategory === 'all' && <CheckCircle2 className="w-5 h-5" />}
                          </button>
                          
                          {Array.from(new Set(products.map(p => p.category))).map(category => (
                            <button 
                              key={category}
                              onClick={() => {
                                setSelectedCategory(category);
                                setIsFilterModalOpen(false);
                              }}
                              className={cn(
                                "w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left",
                                selectedCategory === category 
                                  ? "bg-orange-50 border-orange-200 text-orange-600 ring-2 ring-orange-100" 
                                  : "bg-zinc-50 border-zinc-100 text-zinc-900"
                              )}
                            >
                              <span className="font-bold">{category}</span>
                              {selectedCategory === category && <CheckCircle2 className="w-5 h-5" />}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="p-6 bg-zinc-50 border-t border-zinc-100 text-center">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Selecione para filtrar</p>
                      </div>
                    </div>
                  </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : !isAdmin ? (
          <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 text-center">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-zinc-100 flex flex-col items-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-6">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
              <p className="text-zinc-500 text-sm mb-6">
                Você não tem permissão para acessar esta área administrativa. Se você é um cliente, pode ver suas reservas no seu painel de usuário.
              </p>
              <div className="flex flex-col gap-3 w-full">
                <button 
                  onClick={() => {
                    setView('store');
                    setIsClientDashboardOpen(true);
                  }}
                  className="w-full bg-orange-600 text-white py-3.5 rounded-2xl font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all"
                >
                  Ver Minhas Reservas
                </button>
                <button 
                  onClick={() => setView('store')}
                  className="w-full bg-zinc-100 text-zinc-700 py-3.5 rounded-2xl font-bold text-sm hover:bg-zinc-200 active:scale-[0.98] transition-all"
                >
                  Voltar para a Loja
                </button>
              </div>
            </motion.div>
          </div>
        ) : (
          <React.Suspense fallback={
            <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 text-center">
              <motion.div 
                animate={{ rotate: 360 }} 
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full mb-4"
              />
              <p className="text-zinc-600 font-bold text-sm">Carregando painel administrativo...</p>
              <span className="text-xs text-zinc-400 mt-1">Carregando módulos, gráficos e relatórios</span>
            </div>
          }>
            <AdminPanel 
              user={user}
              settings={settings}
              setSettings={setSettings}
              products={products}
              stock={stock}
              sales={sales}
              coupons={coupons}
              stats={stats}
              initialTab={adminTab}
              unseenReservations={unseenReservations}
              onMarkNotificationsAsRead={handleMarkNotificationsAsRead}
              onDismissNotification={handleDismissNotification}
              onBackToStore={() => setView('store')}
            />
          </React.Suspense>
        )}

        <BottomNav 
          isAdmin={isAdmin}
          currentView={view as any}
          onGoHome={handleGoHome}
          onOpenDashboard={handleOpenDashboard}
          onOpenAdmin={handleOpenAdmin}
        />

        <ProvinceSelectorModal
          isOpen={isProvinceModalOpen}
          onClose={() => setIsProvinceModalOpen(false)}
          selectedProvince={selectedProvince}
          onSelectProvince={handleProvinceChange}
        />

        <ClientDashboard 
          isOpen={isClientDashboardOpen} 
          onClose={() => setIsClientDashboardOpen(false)}
          user={user}
          sales={sales}
          settings={settings}
          products={products}
          favorites={favorites}
          cart={cart}
          favoritesCount={favorites.length}
          onSelectProduct={(p) => setSelectedProduct(p)}
          onToggleFavorite={toggleFavorite}
          onCallUs={() => setIsPhoneModalOpen(true)}
          onLogout={() => auth.signOut()}
        />

        <AdModal 
          isOpen={isAdOpen} 
          onClose={handleCloseAd} 
          settings={settings} 
        />

        <CartAddedNotification
          addedItem={addedCartItem}
          onClose={() => setAddedCartItem(null)}
          onViewCart={() => setIsCartOpen(true)}
          totalCartItems={cart.reduce((sum, i) => sum + i.quantity, 0)}
        />

        <AnimatePresence>
          {isAdmin && view === 'admin' && realtimeNotification && (
            <RealtimeNotificationToast
              key={realtimeNotification.id}
              reservation={realtimeNotification}
              onClose={() => {
                handleDismissNotification(realtimeNotification.id);
                setRealtimeNotification(null);
              }}
              onView={() => {
                handleDismissNotification(realtimeNotification.id);
                setRealtimeNotification(null);
                if (isAdmin) {
                  setView('admin');
                  setAdminTab('reservations');
                } else {
                  setIsClientDashboardOpen(true);
                }
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
