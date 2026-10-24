/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  motion,
  AnimatePresence,
  wrap
} from 'motion/react';
import {
  LayoutDashboard,
  Package,
  Search,
  Filter,
  ShoppingCart,
  User,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Check,
  Settings,
  X,
  MessageSquare,
  MessageCircle,
  Phone,
  Monitor,
  Smartphone
} from 'lucide-react';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  getDoc,
  setDoc,
  increment
} from 'firebase/firestore';
import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User as FirebaseUser
} from 'firebase/auth';

import {
  db,
  auth,
  handleFirestoreError,
  OperationType
} from './firebase';
import { cn } from './lib/utils';
import { Product, Stock, Sale, CartItem, SiteSettings, Stats, Coupon } from './types';
import { getVariationStock, isProductInStock } from './lib/stockUtils';
import { SafeImage } from './components/SafeImage';
import { HeroCarousel } from './components/HeroCarousel';
import { StorePageSkeleton, TopProgressBar } from './components/Skeleton';

// Componentes da loja, cada um no seu próprio ficheiro em components/store/
import { ErrorBoundary } from './components/store/ErrorBoundary';
import { AdModal } from './components/store/AdModal';
import { RecentTop10Rail } from './components/store/RecentTop10Rail';
import { ClientDashboard } from './components/store/ClientDashboard';
import { BottomNav } from './components/store/BottomNav';
import { PromotionalModal } from './components/store/PromotionalModal';
import { ProvinceSelectorModal } from './components/store/ProvinceSelectorModal';
import { ProductCard } from './components/store/ProductCard';
import { ProductModal } from './components/store/ProductModal';
import { Cart } from './components/store/Cart';
import { RealtimeNotificationToast } from './components/store/RealtimeNotificationToast';
import { CartAddedNotification } from './components/store/CartAddedNotification';

const AdminPanel = React.lazy(() => import('./components/AdminPanel'));

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
    logoUrl: '/icon-512.png',
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
          logoUrl: (data.logoUrl && data.logoUrl !== '/pda-logo.svg') ? data.logoUrl : '/icon-512.png',
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

  const handleCartReservation = useCallback(async (customerInfo: { name: string, phone: string, province: string, neighborhood?: string, address?: string, coupon?: Coupon, channel?: 'whatsapp' | 'sms', deliveryType?: 'pickup' | 'delivery' }) => {
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

      const cartQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
      const deliveryType = customerInfo.deliveryType || 'delivery';
      const shippingFee = deliveryType === 'delivery' && cartQuantity <= 1 ? 600 : 0;
      const deliveryLabel = deliveryType === 'pickup' ? 'Venho buscar' : 'Entrega domiciliar';
      const totalAmount = subtotal - discount + shippingFee;
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
        deliveryType,
        shippingFee,
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
          `Receção: ${deliveryLabel}\n` +
          (shippingFee > 0 ? `Frete: KZ ${shippingFee}\n` : '') +
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
          `*Receção:* ${deliveryLabel}\n` +
          (shippingFee > 0 ? `*Frete:* KZ ${shippingFee}\n` : '') +
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

  // Botão "voltar" do telemóvel/navegador: fecha janelas e vistas abertas em vez de sair da app.
  const overlayCloseRef = useRef<Array<{ open: boolean; close: () => void }>>([]);
  overlayCloseRef.current = [
    { open: isPhoneModalOpen, close: () => setIsPhoneModalOpen(false) },
    { open: isFilterModalOpen, close: () => setIsFilterModalOpen(false) },
    { open: isProvinceModalOpen, close: () => setIsProvinceModalOpen(false) },
    { open: isCartOpen, close: () => setIsCartOpen(false) },
    { open: !!selectedProduct, close: () => setSelectedProduct(null) },
    { open: isProfilePanelOpen, close: () => setIsProfilePanelOpen(false) },
    { open: isClientDashboardOpen, close: () => setIsClientDashboardOpen(false) },
    { open: view !== 'store', close: () => setView('store') },
  ];
  const openOverlayCount = overlayCloseRef.current.filter(o => o.open).length;
  const backPushedRef = useRef(false);
  const ignoreNextPopRef = useRef(false);

  useEffect(() => {
    const onPop = () => {
      if (ignoreNextPopRef.current) {
        ignoreNextPopRef.current = false;
        return;
      }
      if (!backPushedRef.current) return;
      backPushedRef.current = false;
      const top = overlayCloseRef.current.find(o => o.open);
      if (top) top.close();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (openOverlayCount > 0 && !backPushedRef.current) {
      const href = window.location.href;
      if (window.location.search.includes('p=')) {
        // Limpa a entrada base para que "voltar" não reabra o produto
        window.history.replaceState(window.history.state, '', window.location.pathname);
      }
      window.history.pushState({ pdaOverlay: true }, '', href);
      backPushedRef.current = true;
    } else if (openOverlayCount === 0 && backPushedRef.current) {
      backPushedRef.current = false;
      ignoreNextPopRef.current = true;
      window.history.back();
    }
  }, [openOverlayCount]);

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
                    <div className="logo-icon w-8 h-8 sm:w-9 sm:h-9 bg-white rounded-[10px] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform shrink-0 overflow-hidden p-0.5">
                      <SafeImage 
                        src={settings.logoUrl && settings.logoUrl !== '/pda-logo.svg' ? settings.logoUrl : '/icon-512.png'} 
                        className="w-full h-full object-contain" 
                        alt="PDA Comercial"
                      />
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

              {/* Categorias com imagens — PDA Comercial */}
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
                    { id: 'roupas', name: 'Roupas', image: '/categorias/roupas.jpg', filterKey: 'roupas' },
                    { id: 'calcados', name: 'Calçados', image: '/categorias/calcados.jpg', filterKey: 'calcados' },
                    { id: 'telemoveis', name: 'Telemóveis', image: '/categorias/telemoveis.jpg', filterKey: 'telemoveis' },
                    { id: 'acessorios', name: 'Acessórios', image: '/categorias/acessorios.jpg', filterKey: 'acessorios' },
                    { id: 'relogios', name: 'Relógios', image: '/categorias/relogios.jpg', filterKey: 'relogios' },
                    { id: 'outros', name: 'Outros', image: '/categorias/outros.jpg', filterKey: 'all' },
                  ].map(cat => {
                    const isSelected = selectedCategory === cat.filterKey;
                    return (
                      <div
                        key={cat.id}
                        onClick={() => setSelectedCategory(isSelected ? 'all' : cat.filterKey)}
                        className={cn(
                          "category group bg-white rounded-[20px] p-3 sm:p-3.5 text-center transition-all cursor-pointer border shadow-xs hover:-translate-y-1 hover:shadow-md",
                          isSelected
                            ? "border-[#ff6900] ring-2 ring-orange-500/20 bg-orange-50/20"
                            : "border-[#e7ebf1] hover:border-orange-200"
                        )}
                      >
                        <div className="category-image w-14 h-14 sm:w-18 sm:h-18 mx-auto rounded-[16px] sm:rounded-[18px] bg-[#f2f4f8] overflow-hidden shadow-inner transition-transform group-hover:scale-105">
                          <img
                            src={cat.image}
                            alt={cat.name}
                            loading="lazy"
                            className="w-full h-full object-cover"
                            onError={event => {
                              event.currentTarget.style.display = 'none';
                            }}
                          />
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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
                  {filteredProducts.map((product, idx) => {
                    // Mobile (2 colunas): Exibição ÚNICA após as 3 primeiras filas (após 6 produtos)
                    const isMobileTrigger = idx === 5 || (filteredProducts.length < 6 && idx === filteredProducts.length - 1);
                    // PC (3 ou 4 colunas): Exibição ÚNICA após 12 produtos (fecha filas completas em 3 e em 4 colunas)
                    const isPcTrigger = idx === 11 || (filteredProducts.length < 12 && idx === filteredProducts.length - 1);

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
                        {/* Modo PC: Exibição única após os 12 primeiros produtos */}
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
                  whatsappNumber={settings.whatsappNumber}
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
