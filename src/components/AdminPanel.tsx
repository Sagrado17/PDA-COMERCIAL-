import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  doc, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { signOut, User as FirebaseUser } from 'firebase/auth';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Clock, 
  Users, 
  Star, 
  DollarSign, 
  Settings, 
  Menu, 
  X, 
  Bell, 
  Check,
  CheckCircle2,
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  History, 
  Eye, 
  Settings2, 
  ShoppingCart, 
  Phone, 
  Mail, 
  Layout, 
  Monitor, 
  RotateCcw, 
  Save, 
  ImageIcon, 
  ArrowLeft, 
  AlertCircle, 
  TrendingUp,
  Sparkles,
  Layers,
  MessageSquare,
  MessageCircle,
  Tag,
  Percent,
  CheckSquare,
  Square
} from 'lucide-react';

import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { cn } from '../lib/utils';
import { 
  Product, 
  Stock, 
  Sale, 
  Customer, 
  Debt, 
  SiteSettings, 
  Stats, 
  Coupon,
  BannerSlide,
  DiscountSettings
} from '../types';
import { getVariationStock, getVariationStockDetails } from '../lib/stockUtils';
import { SafeImage, safeFormatDate } from './SafeImage';
import { PdaLogo } from './PdaLogo';

interface AdminPanelProps {
  user: FirebaseUser | null;
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  products: Product[];
  stock: Stock[];
  sales: Sale[];
  coupons: Coupon[];
  stats: Stats | null;
  initialTab?: string;
  unseenReservations?: Sale[];
  onMarkNotificationsAsRead?: () => void;
  onDismissNotification?: (id: string) => void;
  onBackToStore: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  user,
  settings,
  setSettings,
  products,
  stock,
  sales,
  coupons,
  stats,
  initialTab = 'dashboard',
  unseenReservations = [],
  onMarkNotificationsAsRead,
  onDismissNotification,
  onBackToStore,
}) => {
  const [adminTab, setAdminTab] = useState(initialTab);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationsDropdownOpen, setIsNotificationsDropdownOpen] = useState(false);
  const [selectedInventoryCategory, setSelectedInventoryCategory] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [showArchived, setShowArchived] = useState(false);

  // Dedicated Firestore listeners for Admin only
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);

  useEffect(() => {
    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snap) => {
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'customers'));

    const unsubDebts = onSnapshot(collection(db, 'debts'), (snap) => {
      setDebts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Debt)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'debts'));

    return () => {
      unsubCustomers();
      unsubDebts();
    };
  }, []);

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: 0,
    category: '',
    images: [''],
    attributes: { colors: [''], sizes: ['S', 'M', 'L'] },
    colorImages: {} as Record<string, string>,
    isFeatured: false
  });

  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState<any | null>(null);
  const [stockForm, setStockForm] = useState({
    Cunene: 0,
    Huíla: 0
  });

  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [debtForm, setDebtForm] = useState({
    customerName: '',
    customerPhone: '',
    amount: 0,
    remainingAmount: 0,
    dueDate: ''
  });

  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [couponForm, setCouponForm] = useState({
    code: '',
    type: 'percentage' as 'percentage' | 'fixed',
    value: 0,
    active: true,
    productId: ''
  });

  const [settingsForm, setSettingsForm] = useState<SiteSettings>(settings);

  useEffect(() => {
    setSettingsForm(settings);
  }, [settings]);

  const [discountSettingsForm, setDiscountSettingsForm] = useState<DiscountSettings>({
    enabled: settings.discountSettings?.enabled ?? true,
    percentage: settings.discountSettings?.percentage ?? 20,
    applyToAll: settings.discountSettings?.applyToAll ?? true,
    selectedProductIds: settings.discountSettings?.selectedProductIds ?? []
  });
  const [isSavingDiscount, setIsSavingDiscount] = useState(false);
  const [discountProductFilter, setDiscountProductFilter] = useState('');

  useEffect(() => {
    if (settings.discountSettings) {
      setDiscountSettingsForm({
        enabled: settings.discountSettings.enabled ?? true,
        percentage: settings.discountSettings.percentage ?? 20,
        applyToAll: settings.discountSettings.applyToAll ?? true,
        selectedProductIds: settings.discountSettings.selectedProductIds ?? []
      });
    }
  }, [settings.discountSettings]);

  const handleSaveDiscountSettings = async () => {
    setIsSavingDiscount(true);
    try {
      await setDoc(doc(db, 'settings', 'site'), {
        discountSettings: discountSettingsForm
      }, { merge: true });
      const updated: SiteSettings = {
        ...settings,
        ...settingsForm,
        discountSettings: discountSettingsForm
      };
      setSettings(updated);
      setSettingsForm(updated);
      alert('Configurações de desconto salvas com sucesso!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/site');
    } finally {
      setIsSavingDiscount(false);
    }
  };

  const handleToggleAllDiscountProducts = () => {
    const allIds = products.map(p => p.id);
    if (discountSettingsForm.selectedProductIds.length === products.length) {
      setDiscountSettingsForm(prev => ({ ...prev, selectedProductIds: [] }));
    } else {
      setDiscountSettingsForm(prev => ({ ...prev, selectedProductIds: allIds }));
    }
  };

  const handleToggleSingleDiscountProduct = (productId: string) => {
    setDiscountSettingsForm(prev => {
      const isSelected = prev.selectedProductIds.includes(productId);
      return {
        ...prev,
        selectedProductIds: isSelected
          ? prev.selectedProductIds.filter(id => id !== productId)
          : [...prev.selectedProductIds, productId]
      };
    });
  };

  // Grouped stock computation for inventory management
  const groupedStock = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    
    products.forEach(product => {
      const category = product.category || 'Sem Categoria';
      if (!groups[category]) groups[category] = [];
      
      const colors = product.attributes.colors.length > 0 ? product.attributes.colors : ['Padrão'];
      const sizes = product.attributes.sizes.length > 0 ? product.attributes.sizes : ['Padrão'];
      
      colors.forEach(color => {
        sizes.forEach(size => {
          const stockItem = stock.find(s => 
            s.productId === product.id && 
            s.variation.color === color && 
            s.variation.size === size
          );
          
          const details = getVariationStockDetails(stockItem);

          groups[category].push({
            id: stockItem?.id,
            productId: product.id,
            productName: product.name,
            category: category,
            variation: { color, size },
            quantity: details.total,
            quantitiesByProvince: { Cunene: details.cunene, Huíla: details.huila },
            lastUpdated: stockItem?.lastUpdated
          });
        });
      });
    });

    const sortedCategories = Object.keys(groups).sort((a, b) => a.localeCompare(b));
    sortedCategories.forEach(cat => {
      groups[cat].sort((a, b) => a.productName.localeCompare(b.productName));
    });

    return { sortedCategories, groups };
  }, [stock, products]);

  // Notifications calculation
  const pendingReservationsCount = useMemo(() => {
    return sales.filter(s => s.type === 'reservation' && s.status === 'pending').length;
  }, [sales]);

  const lastSeenTime = useMemo(() => {
    return localStorage.getItem('last_seen_reservations_time') || '';
  }, [unseenReservations]);

  const relevantReservations = useMemo(() => {
    return sales
      .filter(s => s.type === 'reservation')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [sales]);

  // Handlers
  const handleSaveProduct = async () => {
    try {
      const finalColors = productForm.attributes.colors.filter(c => c.trim() !== '');
      const finalSizes = productForm.attributes.sizes.filter(s => s.trim() !== '');
      const sanitizedColorImages: Record<string, string> = {};
      if (productForm.colorImages) {
        Object.entries(productForm.colorImages).forEach(([color, imgUrl]) => {
          if (finalColors.includes(color) && imgUrl) {
            sanitizedColorImages[color] = imgUrl as string;
          }
        });
      }

      const data = {
        ...productForm,
        price: Number(productForm.price),
        images: productForm.images.filter(img => img.trim() !== ''),
        attributes: {
          colors: finalColors,
          sizes: finalSizes
        },
        colorImages: sanitizedColorImages,
        isFeatured: productForm.isFeatured || false,
        createdAt: editingProduct?.createdAt || new Date().toISOString(),
        lastStockedAt: new Date().toISOString()
      };

      let productId = '';
      if (editingProduct) {
        productId = editingProduct.id;
        await setDoc(doc(db, 'products', productId), data, { merge: true });
      } else {
        const docRef = await addDoc(collection(db, 'products'), data);
        productId = docRef.id;
      }

      // Ensure stock entries exist for all variations
      const colors = data.attributes.colors.length > 0 ? data.attributes.colors : ['Padrão'];
      const sizes = data.attributes.sizes.length > 0 ? data.attributes.sizes : ['Padrão'];

      for (const color of colors) {
        for (const size of sizes) {
          const existing = stock.find(s => s.productId === productId && s.variation.color === color && s.variation.size === size);
          if (!existing) {
            await addDoc(collection(db, 'stock'), {
              productId,
              variation: { color, size },
              quantity: 0,
              quantitiesByProvince: { Cunene: 0, Huíla: 0 },
              lastUpdated: new Date().toISOString()
            });
          }
        }
      }

      setIsProductModalOpen(false);
      setEditingProduct(null);
      setProductForm({ 
        name: '', 
        description: '', 
        price: 0, 
        category: '', 
        images: [''], 
        attributes: { colors: [''], sizes: ['S', 'M', 'L'] },
        colorImages: {} as Record<string, string>,
        isFeatured: false 
      });
    } catch (err) {
      handleFirestoreError(err, editingProduct ? OperationType.UPDATE : OperationType.CREATE, 'products');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto? Isso também removerá o estoque associado.')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      const stockToDelete = stock.filter(s => s.productId === id);
      for (const s of stockToDelete) {
        await deleteDoc(doc(db, 'stock', s.id));
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'products');
    }
  };

  const handleUpdateStock = async () => {
    if (!selectedStockItem) return;
    try {
      const cuneneQty = Math.max(0, Math.floor(Number(stockForm.Cunene) || 0));
      const huilaQty = Math.max(0, Math.floor(Number(stockForm.Huíla) || 0));
      const quantitiesByProvince = {
        Cunene: cuneneQty,
        Huíla: huilaQty
      };
      const totalQuantity = cuneneQty + huilaQty;

      if (selectedStockItem.id) {
        await setDoc(doc(db, 'stock', selectedStockItem.id), {
          quantity: totalQuantity,
          quantitiesByProvince,
          lastUpdated: new Date().toISOString()
        }, { merge: true });
      } else {
        await addDoc(collection(db, 'stock'), {
          productId: selectedStockItem.productId,
          variation: selectedStockItem.variation,
          quantity: totalQuantity,
          quantitiesByProvince,
          lastUpdated: new Date().toISOString()
        });
      }

      if (selectedStockItem.productId) {
        await setDoc(doc(db, 'products', selectedStockItem.productId), {
          lastStockedAt: new Date().toISOString()
        }, { merge: true });
      }
      setIsStockModalOpen(false);
      setSelectedStockItem(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'stock');
    }
  };

  const handleSaveCoupon = async () => {
    try {
      const data = {
        ...couponForm,
        code: couponForm.code.toUpperCase().trim(),
        value: Number(couponForm.value),
        productId: couponForm.productId || null,
        usageCount: editingCoupon ? editingCoupon.usageCount : 0,
        createdAt: editingCoupon ? editingCoupon.createdAt : new Date().toISOString()
      };

      if (editingCoupon) {
        await updateDoc(doc(db, 'coupons', editingCoupon.id), data);
      } else {
        await addDoc(collection(db, 'coupons'), data);
      }
      setIsCouponModalOpen(false);
      setEditingCoupon(null);
      setCouponForm({ code: '', type: 'percentage', value: 0, active: true, productId: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'coupons');
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este cupom?')) {
      try {
        await deleteDoc(doc(db, 'coupons', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, 'coupons');
      }
    }
  };

  const handleSaveSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'site'), settingsForm);
      setSettings(settingsForm);
      alert('Configurações salvas com sucesso!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/site');
    }
  };

  const handleSaveDebt = async () => {
    try {
      if (editingDebt) {
        const isPaid = Number(debtForm.remainingAmount) <= 0;
        await updateDoc(doc(db, 'debts', editingDebt.id), {
          remainingAmount: Number(debtForm.remainingAmount),
          dueDate: debtForm.dueDate,
          status: isPaid ? 'paid' : 'active',
          paidAt: isPaid ? new Date().toISOString() : null
        });
      } else {
        let customerId = '';
        const nameToSearch = (debtForm.customerName || 'Cliente Avulso').toLowerCase();
        const existingCustomer = customers.find(c => c.name.toLowerCase() === nameToSearch);
        
        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          const custRef = await addDoc(collection(db, 'customers'), {
            name: debtForm.customerName || 'Cliente Avulso',
            phone: debtForm.customerPhone || 'N/A',
            email: '',
            address: '',
            createdAt: new Date().toISOString()
          });
          customerId = custRef.id;
        }

        await addDoc(collection(db, 'debts'), {
          customerId,
          amount: Number(debtForm.amount),
          remainingAmount: Number(debtForm.remainingAmount),
          dueDate: debtForm.dueDate,
          status: Number(debtForm.remainingAmount) <= 0 ? 'paid' : 'active',
          createdAt: new Date().toISOString(),
          paidAt: Number(debtForm.remainingAmount) <= 0 ? new Date().toISOString() : null
        });
      }
      setIsDebtModalOpen(false);
      setEditingDebt(null);
      setDebtForm({ customerName: '', customerPhone: '', amount: 0, remainingAmount: 0, dueDate: '' });
    } catch (err) {
      handleFirestoreError(err, editingDebt ? OperationType.UPDATE : OperationType.CREATE, 'debts');
    }
  };

  const handleDeleteDebt = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta dívida?')) return;
    try {
      await deleteDoc(doc(db, 'debts', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'debts');
    }
  };

  const handleDeleteCancelledReservation = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja apagar esta reserva cancelada do histórico permanentemente?')) return;
    try {
      await deleteDoc(doc(db, 'sales', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'sales');
    }
  };

  const handleClearAllCancelledReservations = async () => {
    const cancelled = sales.filter(s => s.type === 'reservation' && s.status === 'cancelled');
    if (cancelled.length === 0) return;
    if (!window.confirm(`Tem certeza que deseja apagar permanentemente todas as ${cancelled.length} reservas canceladas do histórico?`)) return;
    try {
      for (const res of cancelled) {
        await deleteDoc(doc(db, 'sales', res.id));
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'sales');
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

  const exportToPDF = (type: 'sales' | 'debts') => {
    const doc = new jsPDF();
    const now = format(new Date(), 'dd/MM/yyyy HH:mm');
    
    doc.setFontSize(20);
    doc.text('PDA COMERCIAL', 105, 15, { align: 'center' });
    doc.setFontSize(14);
    doc.text(type === 'sales' ? 'Relatório de Vendas' : 'Relatório de Devedores', 105, 25, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Gerado em: ${now}`, 105, 32, { align: 'center' });

    if (type === 'sales') {
      const filteredSales = sales.filter(s => {
        const date = new Date(s.createdAt);
        const [year, month] = selectedMonth.split('-');
        const matchesMonth = s.type === 'sale' && date.getFullYear() === parseInt(year) && (date.getMonth() + 1) === parseInt(month);
        if (!matchesMonth) return false;
        return showArchived ? true : !s.archived;
      });

      const tableData = filteredSales.map(s => [
        format(new Date(s.createdAt), 'dd/MM/yyyy'),
        s.customerName || 'N/A',
        s.items.map(i => `${i.productName} (x${i.quantity})`).join(', '),
        `KZ ${s.totalAmount.toLocaleString()}`,
        s.archived ? 'Arquivada' : 'Ativa'
      ]);

      autoTable(doc, {
        startY: 40,
        head: [['Data', 'Cliente', 'Itens', 'Total', 'Status']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [234, 88, 12] }
      });

      const total = filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);
      doc.text(`Total do Período: KZ ${total.toLocaleString()}`, 14, (doc as any).lastAutoTable.finalY + 10);
    } else {
      const tableData = debts.map(d => {
        const customer = customers.find(c => c.id === d.customerId);
        return [
          customer?.name || 'N/A',
          `KZ ${d.amount.toLocaleString()}`,
          `KZ ${d.remainingAmount.toLocaleString()}`,
          format(new Date(d.dueDate), 'dd/MM/yyyy'),
          d.status === 'paid' ? 'Pago' : 'Pendente'
        ];
      });

      autoTable(doc, {
        startY: 40,
        head: [['Cliente', 'Valor Original', 'Saldo Devedor', 'Vencimento', 'Status']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [234, 88, 12] }
      });

      const totalPending = debts.reduce((acc, d) => acc + d.remainingAmount, 0);
      doc.text(`Total Pendente: KZ ${totalPending.toLocaleString()}`, 14, (doc as any).lastAutoTable.finalY + 10);
    }

    doc.save(`PDA_Comercial_${type}_${selectedMonth}.pdf`);
  };

  const handleArchiveMonth = async () => {
    const [year, month] = selectedMonth.split('-');
    const monthName = format(new Date(parseInt(year), parseInt(month) - 1), 'MMMM yyyy', { locale: ptBR });
    
    if (!window.confirm(`Deseja arquivar todas as vendas de ${monthName}? Elas serão removidas do histórico principal mas continuarão acessíveis via filtro.`)) return;
    
    try {
      const salesToArchive = sales.filter(s => {
        const date = new Date(s.createdAt);
        return s.type === 'sale' && date.getFullYear() === parseInt(year) && (date.getMonth() + 1) === parseInt(month);
      });

      for (const sale of salesToArchive) {
        await updateDoc(doc(db, 'sales', sale.id), { archived: true });
      }
      alert('Vendas arquivadas com sucesso!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'sales');
    }
  };

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'inventory', icon: Package, label: 'Estoque' },
    { id: 'sales', icon: ShoppingBag, label: 'Vendas' },
    { id: 'reservations', icon: Clock, label: 'Reservas' },
    { id: 'customers', icon: Users, label: 'Clientes' },
    { id: 'coupons', icon: Tag, label: 'Cupons e Descontos' },
    { id: 'finance', icon: DollarSign, label: 'Financeiro' },
    { id: 'settings', icon: Settings, label: 'Definição' },
  ];

  return (
    <div className="flex min-h-screen bg-zinc-50 text-zinc-900">
      {/* Sidebar Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            key="mobile-sidebar-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Admin Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 border-r border-zinc-200 h-screen flex flex-col p-6 bg-white transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
        !isSidebarOpen && "-translate-x-full"
      )}>
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm border border-zinc-200 bg-white p-0.5">
              <SafeImage 
                src={(settings.logoUrl && settings.logoUrl !== '/pda-logo.svg') ? settings.logoUrl : '/icon-512.png'} 
                className="w-full h-full object-contain bg-white" 
                alt="PDA Comercial"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-lg font-bold tracking-tight uppercase text-zinc-900 leading-tight">
                {settings.storeName.split(' ').map((word, i) => (
                  <span key={i} className={i === settings.storeName.split(' ').length - 1 ? "text-primary" : ""}>
                    {word}{' '}
                  </span>
                ))}
              </span>
              <span className="text-[9px] text-zinc-500 font-medium">{settings.storeDescription}</span>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-zinc-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => {
            const isReservations = item.id === 'reservations';
            const shouldBlink = isReservations && pendingReservationsCount > 0;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setAdminTab(item.id);
                  setIsSidebarOpen(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all",
                  adminTab === item.id 
                    ? "bg-primary text-white shadow-lg" 
                    : shouldBlink
                      ? "bg-amber-50 text-amber-900 border border-amber-300 shadow-sm animate-blink"
                      : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                )}
                style={adminTab === item.id ? { boxShadow: `0 10px 15px -3px ${settings.primaryColor}33` } : {}}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={cn("w-5 h-5", shouldBlink && "text-amber-600 animate-pulse")} />
                  <span className={cn(shouldBlink && "font-bold text-amber-800 animate-pulse")}>{item.label}</span>
                </div>
                {shouldBlink && (
                  <span className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full animate-pulse">
                      {pendingReservationsCount}
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="pt-6 border-t border-zinc-200">
          <div 
            onClick={() => {
              if (window.confirm('Deseja encerrar a sessão?')) {
                signOut(auth);
              }
            }}
            className="flex items-center gap-3 mb-4 cursor-pointer hover:bg-zinc-50 p-2 rounded-2xl transition-all active:scale-95 group"
          >
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold group-hover:shadow-sm transition-all"
              style={{ backgroundColor: `${settings.primaryColor}15`, color: settings.primaryColor }}
            >
              {user?.displayName?.[0] || 'A'}
            </div>
            <div className="overflow-hidden flex-1">
              <div className="text-sm font-bold truncate group-hover:text-red-500 transition-colors">{user?.displayName || 'Admin'}</div>
              <div className="text-xs text-zinc-500 truncate">Clique para sair</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Admin View */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto pb-20">
        <div className="max-w-6xl mx-auto">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 md:mb-12">
            <div className="flex items-center justify-between w-full md:w-auto">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="lg:hidden p-2.5 bg-white border border-zinc-200 rounded-2xl shadow-sm hover:bg-zinc-50 active:scale-95 transition-all"
                  aria-label="Abrir Menu"
                >
                  <Menu className="w-6 h-6" />
                </button>
                <div>
                  <h1 className="text-xl md:text-3xl font-bold mb-0.5">
                    {adminTab === 'dashboard' && 'Visão Geral'}
                    {adminTab === 'inventory' && 'Gestão de Estoque'}
                    {adminTab === 'sales' && 'Controle de Vendas'}
                    {adminTab === 'reservations' && 'Gestão de Reservas'}
                    {adminTab === 'customers' && 'Base de Clientes'}
                    {adminTab === 'coupons' && 'Gestão de Cupons e Descontos'}
                    {adminTab === 'finance' && 'Financeiro & Dívidas'}
                    {adminTab === 'settings' && 'Definições do Site'}
                  </h1>
                  <p className="text-zinc-500 text-xs md:text-sm">Bem-vindo de volta ao centro de operações.</p>
                </div>
              </div>

              {/* Mobile Bell Button */}
              <div className="md:hidden">
                <button 
                  onClick={() => setIsNotificationsDropdownOpen(!isNotificationsDropdownOpen)}
                  className="relative p-2.5 bg-white border border-zinc-200 rounded-2xl text-zinc-950 transition-all hover:bg-zinc-50 active:scale-95 flex items-center justify-center cursor-pointer shadow-sm"
                  title="Notificações de Reservas"
                  aria-label="Notificações"
                >
                  <Bell className={cn("w-5 h-5", unseenReservations.length > 0 && "text-orange-600")} />
                  {unseenReservations.length > 0 && (
                    <span 
                      className="absolute -top-1 -right-1 w-4 h-4 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white bg-primary animate-pulse"
                    >
                      {unseenReservations.length > 9 ? '9+' : unseenReservations.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              {/* Desktop Notifications Bell */}
              <div className="relative hidden md:block">
                <button 
                  onClick={() => setIsNotificationsDropdownOpen(!isNotificationsDropdownOpen)}
                  className="relative p-3 bg-white border border-zinc-200 rounded-2xl text-zinc-950 transition-all hover:bg-zinc-50 active:scale-95 flex items-center justify-center cursor-pointer shadow-sm"
                  title="Notificações de Reservas"
                >
                  <Bell className={cn("w-5 h-5", unseenReservations.length > 0 && "text-orange-600")} />
                  {unseenReservations.length > 0 && (
                    <span 
                      className="absolute top-1 right-1 w-4 h-4 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white bg-primary animate-pulse"
                    >
                      {unseenReservations.length > 9 ? '9+' : unseenReservations.length}
                    </span>
                  )}
                </button>
              </div>

              <button 
                onClick={onBackToStore}
                className="glass px-5 md:px-6 py-2.5 md:py-3 rounded-2xl text-xs md:text-sm font-bold flex items-center gap-2 hover:bg-zinc-100 transition-all w-full md:w-auto justify-center bg-white border border-zinc-200 shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para Loja
              </button>
            </div>
          </header>

          {/* Responsive Notifications Dropdown / Dialog (Mobile & Desktop) */}
          <AnimatePresence>
            {isNotificationsDropdownOpen && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:bg-transparent" 
                  onClick={() => setIsNotificationsDropdownOpen(false)} 
                />
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="fixed top-20 right-4 left-4 sm:left-auto sm:right-6 md:right-8 sm:w-88 md:w-96 bg-white rounded-2xl shadow-2xl border border-zinc-100 overflow-hidden z-50 p-2 max-h-[80vh] flex flex-col"
                >
                  <div className="px-4 py-3 border-b border-zinc-100 mb-1 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">Notificações</div>
                      <div className="text-[11px] text-zinc-600 mt-1 font-semibold">
                        {unseenReservations.length > 0 
                          ? `${unseenReservations.length} não lida(s)`
                          : 'Todas lidas'
                        }
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {unseenReservations.length > 0 && onMarkNotificationsAsRead && (
                        <button
                          onClick={onMarkNotificationsAsRead}
                          className="text-[10px] font-bold uppercase tracking-wider text-orange-600 hover:text-orange-700 bg-orange-50 px-2 py-1 rounded-lg transition-colors"
                          title="Marcar todas como lidas"
                        >
                          Limpar todas
                        </button>
                      )}
                      <button
                        onClick={() => setIsNotificationsDropdownOpen(false)}
                        className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-1.5 p-1">
                    {unseenReservations.length === 0 ? (
                      <div className="py-8 text-center text-zinc-400 text-xs flex flex-col items-center justify-center gap-2">
                        <CheckCircle2 className="w-9 h-9 text-emerald-500 opacity-90" />
                        <span className="font-bold text-zinc-700 text-sm">Tudo em dia!</span>
                        <span className="text-[11px] text-zinc-400 max-w-xs">
                          Todas as notificações abertas foram arquivadas. Novas reservas aparecerão aqui automaticamente.
                        </span>
                      </div>
                    ) : (
                      unseenReservations.map(res => {
                        return (
                          <div
                            key={res.id}
                            onClick={() => {
                              onDismissNotification?.(res.id);
                              setIsNotificationsDropdownOpen(false);
                              setAdminTab('reservations');
                            }}
                            className="w-full text-left p-3 rounded-xl transition-all flex items-start gap-2.5 bg-orange-50/50 hover:bg-orange-50 border border-orange-100 cursor-pointer group relative"
                          >
                            <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-primary" />
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-baseline mb-0.5">
                                <span className="font-bold text-xs text-zinc-900 truncate pr-2">
                                  {res.customerName || 'Cliente'}
                                </span>
                                <span className="text-[9px] text-zinc-400 flex-shrink-0">
                                  {new Date(res.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-[10px] text-zinc-500 truncate font-normal">
                                {res.items.map(i => `${i.productName} (x${i.quantity})`).join(', ')}
                              </p>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-[9px] font-black uppercase text-zinc-400 font-mono">
                                  #{res.id.slice(-6).toUpperCase()}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-zinc-900">
                                    KZ {res.totalAmount.toLocaleString()}
                                  </span>
                                  <span className="text-[9px] font-bold text-orange-600 flex items-center group-hover:underline">
                                    Ver &rarr;
                                  </span>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDismissNotification?.(res.id);
                              }}
                              className="p-1 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors ml-1"
                              title="Marcar como lida e dispensar"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="p-2 border-t border-zinc-100 mt-auto">
                    <button
                      onClick={() => {
                        setIsNotificationsDropdownOpen(false);
                        setAdminTab('reservations');
                      }}
                      className="w-full py-2 bg-zinc-50 hover:bg-zinc-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-700 transition-colors text-center"
                    >
                      Ir para Gestão de Reservas
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Admin Tabs Content */}
          <AnimatePresence mode="wait">
            {adminTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                  {[
                    { 
                      label: 'Vendas (Mês)', 
                      value: `KZ ${sales.filter(s => {
                        const date = new Date(s.createdAt);
                        const now = new Date();
                        const isCurrentMonth = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                        if (!isCurrentMonth) return false;
                        if (settings.salesResetDate) {
                          return s.type === 'sale' && date.getTime() >= new Date(settings.salesResetDate).getTime();
                        }
                        return s.type === 'sale';
                      }).reduce((acc, s) => acc + s.totalAmount, 0).toLocaleString()}`, 
                      icon: TrendingUp, 
                      color: 'text-emerald-400' 
                    },
                    { 
                      label: 'Recebido (Mês)', 
                      value: `KZ ${(
                        sales.filter(s => {
                          if (!s.paidAt) return false;
                          const date = new Date(s.paidAt);
                          const now = new Date();
                          const isCurrentMonth = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                          if (!isCurrentMonth) return false;
                          if (settings.salesResetDate) {
                            return s.status === 'paid' && date.getTime() >= new Date(settings.salesResetDate).getTime();
                          }
                          return s.status === 'paid';
                        }).reduce((acc, s) => acc + s.totalAmount, 0) +
                        debts.filter(d => {
                          if (!d.paidAt) return false;
                          const date = new Date(d.paidAt);
                          const now = new Date();
                          const isCurrentMonth = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                          if (!isCurrentMonth) return false;
                          if (settings.salesResetDate) {
                            return d.status === 'paid' && date.getTime() >= new Date(settings.salesResetDate).getTime();
                          }
                          return d.status === 'paid';
                        }).reduce((acc, d) => acc + d.amount, 0)
                      ).toLocaleString()}`, 
                      icon: DollarSign, 
                      color: 'text-emerald-500' 
                    },
                    { label: 'Reservas Ativas', value: sales.filter(s => s.type === 'reservation' && s.status === 'pending').length, icon: Clock, color: 'text-orange-400' },
                    { label: 'Dívidas Pendentes', value: `KZ ${debts.reduce((acc, d) => acc + d.remainingAmount, 0).toLocaleString()}`, icon: AlertCircle, color: 'text-red-400' },
                    { label: 'Total Clientes', value: customers.length, icon: Users, color: 'text-blue-400' },
                    { label: 'Total Visitas', value: stats?.visitorCount || 0, icon: Eye, color: 'text-purple-400' },
                  ].map((stat) => (
                    <div key={stat.label} className="glass p-6 rounded-3xl bg-white border border-zinc-200">
                      <div className="flex justify-between items-start mb-4">
                        <div className={cn("p-3 rounded-2xl bg-zinc-100", stat.color)}>
                          <stat.icon className="w-6 h-6" />
                        </div>
                      </div>
                      <div className="text-2xl font-bold mb-1">{stat.value}</div>
                      <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Charts */}
                <div className="grid lg:grid-cols-2 gap-8">
                  <div className="glass p-8 rounded-[40px] bg-white border border-zinc-200">
                    <h3 className="text-lg font-bold mb-6">Fluxo de Vendas</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sales.slice(0, 7).reverse().map(s => ({ date: safeFormatDate(s.createdAt, 'dd/MM'), amount: s.totalAmount }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#00000010" vertical={false} />
                          <XAxis dataKey="date" stroke="#00000040" fontSize={12} />
                          <YAxis stroke="#00000040" fontSize={12} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '12px', color: '#fff' }}
                            itemStyle={{ color: '#ea580c' }}
                          />
                          <Line type="monotone" dataKey="amount" stroke="#ea580c" strokeWidth={3} dot={{ fill: '#ea580c', r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="glass p-8 rounded-[40px] bg-white border border-zinc-200">
                    <h3 className="text-lg font-bold mb-6">Estoque Crítico</h3>
                    <div className="space-y-4">
                      {stock.map(s => ({
                        ...s,
                        realQuantity: getVariationStock(s)
                      })).filter(s => s.realQuantity < 5).slice(0, 5).map(item => {
                        const product = products.find(p => p.id === item.productId);
                        return (
                          <div key={item.id} className="flex items-center justify-between p-4 bg-zinc-50 border border-zinc-100 rounded-2xl">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-red-400/10 flex items-center justify-center text-red-400">
                                <AlertCircle className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="text-sm font-bold">{product?.name}</div>
                                <div className="text-xs text-zinc-500">{item.variation.color} / {item.variation.size}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-red-400">{item.realQuantity} un</div>
                              <div className="text-[10px] text-zinc-500 uppercase font-bold">
                                {item.realQuantity === 0 ? 'Esgotado' : 'Saldo Baixo'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {adminTab === 'inventory' && (
              <motion.div 
                key="inventory"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center bg-zinc-100 p-6 rounded-3xl">
                  <div className="flex gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                      <input type="text" placeholder="Filtrar estoque..." className="bg-zinc-50 border border-zinc-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-orange-500" />
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setEditingProduct(null);
                      setProductForm({ 
                        name: '', 
                        description: '', 
                        price: 0, 
                        category: '', 
                        images: [''], 
                        attributes: { colors: [''], sizes: ['S', 'M', 'L'] },
                        colorImages: {},
                        isFeatured: false 
                      });
                      setIsProductModalOpen(true);
                    }}
                    className="bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Novo Produto
                  </button>
                </div>

                {/* Category Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  <button
                    onClick={() => setSelectedInventoryCategory('all')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                      selectedInventoryCategory === 'all' ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                    )}
                  >
                    Todos
                  </button>
                  {groupedStock.sortedCategories.map(category => (
                    <button
                      key={category}
                      onClick={() => setSelectedInventoryCategory(category)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                        selectedInventoryCategory === category ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                      )}
                    >
                      {category}
                    </button>
                  ))}
                </div>

                <div className="glass rounded-[32px] overflow-hidden bg-white border border-zinc-200">
                  {/* Desktop View */}
                  <div className="hidden md:block">
                    <table className="w-full text-left">
                      <thead className="bg-zinc-50 text-xs font-bold uppercase tracking-widest text-zinc-500">
                        <tr>
                          <th className="px-6 py-4">Produto</th>
                          <th className="px-6 py-4">Variação</th>
                          <th className="px-6 py-4">Saldo Atual</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {groupedStock.sortedCategories
                          .filter(cat => selectedInventoryCategory === 'all' || selectedInventoryCategory === cat)
                          .map(category => (
                          <React.Fragment key={category}>
                            {selectedInventoryCategory === 'all' && (
                              <tr className="bg-zinc-50/50">
                                <td colSpan={5} className="px-6 py-2 text-[10px] font-bold uppercase tracking-widest text-orange-600 bg-orange-50/30">
                                  {category}
                                </td>
                              </tr>
                            )}
                            {groupedStock.groups[category].map(item => {
                              const product = products.find(p => p.id === item.productId);
                              const itemKey = item.id || `${item.productId}-${item.variation.color}-${item.variation.size}`;
                              return (
                                <tr key={itemKey} className="hover:bg-zinc-50 transition-colors">
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="font-bold">{item.productName}</div>
                                      <div className="flex gap-1">
                                        <button 
                                          onClick={() => {
                                            if (product) {
                                              setEditingProduct(product);
                                              setProductForm({
                                                name: product.name || '',
                                                description: product.description || '',
                                                price: product.price || 0,
                                                category: product.category || '',
                                                images: product.images || [''],
                                                attributes: product.attributes || { colors: [''], sizes: ['S', 'M', 'L'] },
                                                colorImages: product.colorImages || {},
                                                isFeatured: product.isFeatured || false
                                              });
                                              setIsProductModalOpen(true);
                                            }
                                          }}
                                          className="p-1 hover:bg-zinc-100 rounded text-zinc-500 hover:text-orange-600"
                                        >
                                          <Edit className="w-3 h-3" />
                                        </button>
                                        <button 
                                          onClick={() => product && handleDeleteProduct(product.id)}
                                          className="p-1 hover:bg-zinc-100 rounded text-zinc-500 hover:text-red-400"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                    <div className="text-xs text-zinc-500">{item.category}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex gap-2">
                                      <span className="px-2 py-1 bg-zinc-100 rounded text-[10px] font-bold uppercase">{item.variation.color}</span>
                                      <span className="px-2 py-1 bg-zinc-100 rounded text-[10px] font-bold uppercase">{item.variation.size}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 font-mono font-bold">
                                    <div className="flex flex-col gap-1">
                                      <span className="text-[10px] text-zinc-400">Total: {item.quantity}</span>
                                      <div className="flex gap-2">
                                        <span className="text-xs">Cunene: {item.quantitiesByProvince?.Cunene || 0}</span>
                                        <span className="text-xs">Huíla: {item.quantitiesByProvince?.Huíla || 0}</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    {item.quantity <= 0 ? (
                                      <span className="text-[10px] font-bold uppercase bg-red-400/10 text-red-400 px-2 py-1 rounded-lg">Esgotado</span>
                                    ) : item.quantity < 5 ? (
                                      <span className="text-[10px] font-bold uppercase bg-orange-400/10 text-orange-400 px-2 py-1 rounded-lg">Crítico</span>
                                    ) : (
                                      <span className="text-[10px] font-bold uppercase bg-emerald-400/10 text-emerald-400 px-2 py-1 rounded-lg">Ok</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <button 
                                      onClick={() => {
                                        setSelectedStockItem(item);
                                        setStockForm({ 
                                          Cunene: item.quantitiesByProvince?.Cunene || 0,
                                          Huíla: item.quantitiesByProvince?.Huíla || 0
                                        });
                                        setIsStockModalOpen(true);
                                      }}
                                      className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-orange-600 transition-all"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile View */}
                  <div className="md:hidden divide-y divide-zinc-100">
                    {groupedStock.sortedCategories
                      .filter(cat => selectedInventoryCategory === 'all' || selectedInventoryCategory === cat)
                      .map(category => (
                        <div key={category} className="p-4 space-y-4">
                          {selectedInventoryCategory === 'all' && (
                             <div className="text-[10px] font-bold uppercase tracking-widest text-orange-600 bg-orange-50 px-3 py-1 rounded-full w-fit">
                                {category}
                              </div>
                          )}
                          <div className="space-y-4">
                            {groupedStock.groups[category].map(item => {
                              const product = products.find(p => p.id === item.productId);
                              const itemKey = item.id || `${item.productId}-${item.variation.color}-${item.variation.size}`;
                              return (
                                <div key={itemKey} className="bg-zinc-50/50 p-4 rounded-2xl space-y-3">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <div className="font-bold text-sm">{item.productName}</div>
                                      <div className="text-[10px] text-zinc-500">{item.variation.color} / {item.variation.size}</div>
                                    </div>
                                    <div className="flex gap-2">
                                      <button 
                                        onClick={() => {
                                          if (product) {
                                            setEditingProduct(product);
                                            setProductForm({
                                              name: product.name || '',
                                              description: product.description || '',
                                              price: product.price || 0,
                                              category: product.category || '',
                                              images: product.images || [''],
                                              attributes: product.attributes || { colors: [''], sizes: ['S', 'M', 'L'] },
                                              colorImages: product.colorImages || {},
                                              isFeatured: product.isFeatured || false
                                            });
                                            setIsProductModalOpen(true);
                                          }
                                        }}
                                        className="p-2 bg-white rounded-lg shadow-sm text-zinc-400 hover:text-orange-600"
                                      >
                                        <Settings2 className="w-4 h-4" />
                                      </button>
                                      <button 
                                         onClick={() => {
                                          setSelectedStockItem(item);
                                          setStockForm({ 
                                            Cunene: item.quantitiesByProvince?.Cunene || 0,
                                            Huíla: item.quantitiesByProvince?.Huíla || 0
                                          });
                                          setIsStockModalOpen(true);
                                        }}
                                        className="p-2 bg-white rounded-lg shadow-sm text-orange-600"
                                      >
                                         <Edit className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-200/50">
                                    <div className="flex flex-col">
                                      <span className="text-[8px] font-bold text-zinc-400 uppercase">Cunene</span>
                                      <span className="text-xs font-bold">{item.quantitiesByProvince?.Cunene || 0}</span>
                                    </div>
                                    <div className="flex flex-col border-l border-zinc-200/50 pl-3">
                                      <span className="text-[8px] font-bold text-zinc-400 uppercase">Huíla</span>
                                      <span className="text-xs font-bold">{item.quantitiesByProvince?.Huíla || 0}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </motion.div>
            )}

            {adminTab === 'finance' && (
              <motion.div 
                key="finance"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="glass p-6 rounded-3xl border-red-500/20 bg-red-500/5 border">
                    <div className="text-xs font-bold text-red-400 uppercase tracking-widest mb-2">Total em Dívidas</div>
                    <div className="text-3xl font-bold">KZ {debts.reduce((acc, d) => acc + d.remainingAmount, 0).toLocaleString()}</div>
                  </div>
                  <div className="glass p-6 rounded-3xl border-emerald-500/20 bg-emerald-500/5 border">
                    <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Recebido (Mês)</div>
                    <div className="text-3xl font-bold">KZ {sales.filter(s => s.status === 'paid').reduce((acc, s) => acc + s.paidAmount, 0).toLocaleString()}</div>
                  </div>
                  <div className="glass p-6 rounded-3xl border-orange-200 bg-orange-50/50 border">
                    <div className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-2">Clientes Devedores</div>
                    <div className="text-3xl font-bold">{new Set(debts.filter(d => d.status === 'active').map(d => d.customerId)).size}</div>
                  </div>
                </div>

                <div className="glass rounded-[32px] overflow-hidden bg-white border border-zinc-200">
                  <div className="p-6 border-b border-zinc-200 flex flex-col md:flex-row justify-between items-center gap-4">
                    <h3 className="font-bold">Controle de Devedores</h3>
                    <div className="flex flex-wrap gap-4">
                      <button 
                        onClick={() => exportToPDF('debts')}
                        className="text-xs font-bold text-orange-400 uppercase tracking-widest hover:text-orange-300 flex items-center gap-2"
                      >
                        <DollarSign className="w-4 h-4" />
                        Exportar Relatório
                      </button>
                      <button 
                        onClick={() => {
                          setEditingDebt(null);
                          setDebtForm({ customerName: '', customerPhone: '', amount: 0, remainingAmount: 0, dueDate: '' });
                          setIsDebtModalOpen(true);
                        }}
                        className="bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-orange-700 transition-all flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Nova Dívida
                      </button>
                    </div>
                  </div>
                  <table className="w-full text-left">
                    <thead className="bg-zinc-50 text-xs font-bold uppercase tracking-widest text-zinc-500">
                      <tr>
                        <th className="px-6 py-4">Cliente</th>
                        <th className="px-6 py-4">Valor Original</th>
                        <th className="px-6 py-4">Saldo Devedor</th>
                        <th className="px-6 py-4">Vencimento</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {debts.map(debt => {
                        const customer = customers.find(c => c.id === debt.customerId);
                        return (
                          <tr key={debt.id} className="hover:bg-zinc-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-bold">{customer?.name}</div>
                              <div className="text-xs text-zinc-500">{customer?.phone}</div>
                            </td>
                            <td className="px-6 py-4 text-sm">KZ {(debt.amount || 0).toFixed(2)}</td>
                            <td className="px-6 py-4">
                              <span className="text-red-400 font-bold">KZ {(debt.remainingAmount || 0).toFixed(2)}</span>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              {safeFormatDate(debt.dueDate, 'dd/MM/yyyy')}
                            </td>
                            <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                              <button 
                                onClick={() => {
                                  setEditingDebt(debt);
                                  setDebtForm({ 
                                    customerName: customer?.name || '', 
                                    customerPhone: customer?.phone || '', 
                                    amount: debt.amount || 0, 
                                    remainingAmount: debt.remainingAmount || 0, 
                                    dueDate: debt.dueDate || '' 
                                  });
                                  setIsDebtModalOpen(true);
                                }}
                                className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-orange-600 transition-all"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteDebt(debt.id)}
                                className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-red-600 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={async () => {
                                  if (window.confirm('Deseja baixar o pagamento total desta dívida?')) {
                                    try {
                                      await updateDoc(doc(db, 'debts', debt.id), { 
                                        remainingAmount: 0, 
                                        status: 'paid',
                                        paidAt: new Date().toISOString()
                                      });
                                    } catch (err) {
                                      handleFirestoreError(err, OperationType.UPDATE, `debts/${debt.id}`);
                                    }
                                  }
                                }}
                                className="bg-emerald-600/20 text-emerald-400 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-emerald-600 hover:text-white transition-all"
                              >
                                Baixar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {adminTab === 'sales' && (
              <motion.div 
                key="sales"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <h2 className="text-xl font-bold">Histórico de Vendas</h2>
                  <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-zinc-200">
                      <Filter className="w-4 h-4 text-zinc-400" />
                      <input 
                        type="month" 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="text-xs font-bold uppercase outline-none bg-transparent"
                      />
                    </div>
                    <button 
                      onClick={() => exportToPDF('sales')}
                      className="bg-zinc-900 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all flex items-center gap-2"
                    >
                      <History className="w-4 h-4" />
                      Baixar PDF
                    </button>
                    <button 
                      onClick={handleArchiveMonth}
                      className="bg-orange-50 text-orange-600 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all flex items-center gap-2"
                    >
                      <Package className="w-4 h-4" />
                      Arquivar Mês
                    </button>
                    <button 
                      onClick={() => setShowArchived(!showArchived)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                        showArchived ? "bg-orange-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                      )}
                    >
                      <Eye className="w-4 h-4" />
                      {showArchived ? 'Ocultar Arquivados' : 'Ver Arquivados'}
                    </button>
                  </div>
                </div>
                <div className="glass rounded-[32px] overflow-hidden overflow-x-auto bg-white border border-zinc-200">
                  <table className="w-full text-left min-w-[800px]">
                    <thead className="bg-zinc-50 text-xs font-bold uppercase tracking-widest text-zinc-500">
                      <tr>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Cliente</th>
                        <th className="px-6 py-4">Itens</th>
                        <th className="px-6 py-4">Total</th>
                        <th className="px-6 py-4">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {sales.filter(s => {
                        const date = new Date(s.createdAt);
                        const [year, month] = selectedMonth.split('-');
                        const matchesMonth = s.type === 'sale' && date.getFullYear() === parseInt(year) && (date.getMonth() + 1) === parseInt(month);
                        if (!matchesMonth) return false;
                        return showArchived ? true : !s.archived;
                      }).map(sale => (
                        <tr key={sale.id} className="hover:bg-zinc-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-lg bg-emerald-400/10 text-emerald-400 w-fit">
                                Concluída
                              </span>
                              {sale.archived && (
                                <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-lg bg-zinc-100 text-zinc-500 w-fit">
                                  Arquivada
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold">{sale.customerName}</div>
                            <div className="text-xs text-zinc-500">{sale.customerPhone}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              {sale.items.map((item, idx) => (
                                <div key={idx} className="text-xs">
                                  <span className="font-bold">{item.productName}</span>
                                  <span className="text-zinc-500 ml-2">({item.variation.color}/{item.variation.size}) x{item.quantity}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-bold">KZ {(sale.totalAmount || 0).toFixed(2)}</td>
                          <td className="px-6 py-4 text-sm">{safeFormatDate(sale.createdAt, 'dd/MM/yyyy')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {adminTab === 'reservations' && (
              <motion.div 
                key="reservations"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between gap-4 flex-wrap px-1">
                  <div>
                    <h2 className="text-xl font-black text-zinc-900">Reservas de Clientes</h2>
                    <p className="text-xs text-zinc-500">Gerencie confirmações de pagamento e cancelamentos</p>
                  </div>
                  {sales.filter(s => s.type === 'reservation' && s.status === 'cancelled').length > 0 && (
                    <button
                      onClick={handleClearAllCancelledReservations}
                      className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Limpar Todas Canceladas ({sales.filter(s => s.type === 'reservation' && s.status === 'cancelled').length})</span>
                    </button>
                  )}
                </div>

                <div className="glass rounded-[32px] overflow-hidden overflow-x-auto bg-white border border-zinc-200">
                  <table className="w-full text-left min-w-[800px]">
                    <thead className="bg-zinc-50 text-xs font-bold uppercase tracking-widest text-zinc-500">
                      <tr>
                        <th className="px-6 py-4">Ações</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Cliente</th>
                        <th className="px-6 py-4">Itens</th>
                        <th className="px-6 py-4">Total</th>
                        <th className="px-6 py-4">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {sales.filter(s => s.type === 'reservation').map(res => (
                        <tr key={res.id} className="hover:bg-zinc-50 transition-colors">
                          <td className="px-6 py-4 text-center">
                            {res.status === 'pending' && (
                              <div className="flex flex-col gap-2 min-w-[140px]">
                                <button 
                                  onClick={() => handleUpdateReservationStatus(res.id, 'paid')}
                                  className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-emerald-700 transition-all shadow-sm whitespace-nowrap"
                                >
                                  Confirmar Pagamento
                                </button>
                                <button 
                                  onClick={() => handleUpdateReservationStatus(res.id, 'cancelled')}
                                  className="border border-red-200 text-red-500 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-red-50 transition-all"
                                >
                                  Cancelar
                                </button>
                              </div>
                            )}
                            {res.status === 'cancelled' && (
                              <button 
                                onClick={() => handleDeleteCancelledReservation(res.id)}
                                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all shadow-xs flex items-center justify-center gap-1.5 mx-auto whitespace-nowrap cursor-pointer active:scale-95"
                                title="Apagar esta reserva cancelada do histórico permanentemente"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Apagar Histórico</span>
                              </button>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "text-[10px] font-bold uppercase px-2 py-1 rounded-lg",
                              res.status === 'pending' ? "bg-orange-400/10 text-orange-400" : 
                              res.status === 'paid' ? "bg-emerald-400/10 text-emerald-400" : "bg-red-400/10 text-red-400"
                            )}>
                              {res.status === 'pending' ? 'Pendente' : res.status === 'paid' ? 'Confirmada' : 'Cancelada'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold">{res.customerName}</div>
                            <div className="text-xs text-zinc-500">{res.customerPhone}</div>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              {res.channel === 'sms' ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded-md">
                                  <MessageSquare className="w-2.5 h-2.5" /> SMS
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                                  <MessageCircle className="w-2.5 h-2.5" /> WhatsApp
                                </span>
                              )}
                              {res.customerProvince && (
                                <span className="text-[10px] text-orange-600 font-bold uppercase">
                                  {res.customerProvince}
                                </span>
                              )}
                            </div>
                            {(res.customerNeighborhood || res.customerAddress) && (
                              <div className="text-[10px] text-zinc-400 font-medium mt-0.5">
                                {res.customerNeighborhood && `Bairro: ${res.customerNeighborhood}`}
                                {res.customerAddress && ` • Ref: ${res.customerAddress}`}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 min-w-[200px]">
                            <div className="space-y-2">
                              {res.items.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-4 py-1.5 border-b border-zinc-50 last:border-0">
                                  <div>
                                    <div className="text-sm font-bold text-zinc-900">{item.productName}</div>
                                    <div className="flex gap-1.5 mt-0.5">
                                      <span className="text-[9px] font-bold uppercase text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-md">{item.variation.color}</span>
                                      <span className="text-[9px] font-bold uppercase text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-md">{item.variation.size}</span>
                                    </div>
                                  </div>
                                  <div className="text-xs font-bold text-zinc-700 bg-zinc-50 px-2 py-1 rounded-lg">x{item.quantity}</div>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-bold text-zinc-900">KZ {(res.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-6 py-4 text-sm text-zinc-500">{safeFormatDate(res.createdAt, 'dd/MM/yyyy')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {adminTab === 'customers' && (
              <motion.div 
                key="customers"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="glass p-6 rounded-3xl bg-white border border-zinc-200">
                    <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Total de Clientes</div>
                    <div className="text-3xl font-bold">{customers.length}</div>
                  </div>
                  <div className="glass p-6 rounded-3xl bg-white border border-zinc-200">
                    <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Novos (Mês)</div>
                    <div className="text-3xl font-bold">
                      {customers.filter(c => {
                        const date = new Date(c.createdAt);
                        const now = new Date();
                        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                      }).length}
                    </div>
                  </div>
                </div>

                <div className="glass rounded-[32px] overflow-hidden bg-white border border-zinc-200">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-50 text-xs font-bold uppercase tracking-widest text-zinc-500">
                      <tr>
                        <th className="px-6 py-4">Nome</th>
                        <th className="px-6 py-4">Contato</th>
                        <th className="px-6 py-4">Cadastro</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {customers.map(customer => (
                        <tr key={customer.id} className="hover:bg-zinc-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold">{customer.name}</div>
                            <div className="text-xs text-zinc-500">{customer.email}</div>
                          </td>
                          <td className="px-6 py-4 font-mono text-sm">{customer.phone}</td>
                          <td className="px-6 py-4 text-sm">{safeFormatDate(customer.createdAt, 'dd/MM/yyyy')}</td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => {
                                if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
                                  deleteDoc(doc(db, 'customers', customer.id)).catch(err => handleFirestoreError(err, OperationType.DELETE, 'customers'));
                                }
                              }}
                              className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-red-500 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {adminTab === 'coupons' && (
              <motion.div 
                key="coupons"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* =========================================================
                    1. GESTÃO DE % DE DESCONTO (% NO CANTO SUPERIOR DOS PRODUTOS)
                ========================================================== */}
                <div className="bg-white rounded-[32px] p-6 md:p-8 border border-zinc-200 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-100">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-9 h-9 rounded-2xl bg-orange-100 text-[#ff6900] flex items-center justify-center font-bold">
                          <Percent className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg md:text-xl font-black text-zinc-900">
                          Desconto em Destaque (% no Canto Superior)
                        </h3>
                      </div>
                      <p className="text-zinc-500 text-xs md:text-sm">
                        Defina a porcentagem de desconto promocional exibida nos produtos e selecione os itens que receberão o selo.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <span className="text-xs font-bold text-zinc-500">
                        {discountSettingsForm.enabled ? 'Promoção Ativa' : 'Promoção Pausada'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setDiscountSettingsForm(prev => ({ ...prev, enabled: !prev.enabled }))}
                        className={cn(
                          "w-14 h-8 rounded-full p-1 transition-colors relative cursor-pointer",
                          discountSettingsForm.enabled ? "bg-emerald-600" : "bg-zinc-300"
                        )}
                        aria-label="Ativar ou desativar desconto"
                      >
                        <div className={cn(
                          "w-6 h-6 rounded-full bg-white shadow-md transition-transform",
                          discountSettingsForm.enabled ? "translate-x-6" : "translate-x-0"
                        )} />
                      </button>
                    </div>
                  </div>

                  {/* Configuração da Porcentagem e Pré-visualização */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-50/80 p-5 rounded-2xl border border-zinc-200/60">
                    <div>
                      <label className="text-xs font-black uppercase tracking-wider text-zinc-700 block mb-2">
                        Porcentagem de Desconto (%)
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            min="1"
                            max="99"
                            value={discountSettingsForm.percentage}
                            onChange={(e) => {
                              const val = Math.max(1, Math.min(99, Number(e.target.value) || 0));
                              setDiscountSettingsForm(prev => ({ ...prev, percentage: val }));
                            }}
                            className="w-full h-12 bg-white border border-zinc-300 rounded-xl px-4 text-base font-black text-zinc-900 focus:border-[#ff6900] focus:outline-none transition-colors"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-zinc-400 text-sm">
                            %
                          </span>
                        </div>

                        {/* Visual Badge Preview */}
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-bold text-zinc-400 mb-1">Visual no Produto</span>
                          <span className="px-3.5 py-1.5 rounded-xl bg-[#ff6900] text-white text-sm font-black shadow-md shadow-orange-600/30">
                            -{discountSettingsForm.percentage}%
                          </span>
                        </div>
                      </div>

                      {/* Botões de atalho rápido */}
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        {[10, 15, 20, 25, 30, 40, 50].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setDiscountSettingsForm(prev => ({ ...prev, percentage: preset }))}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-xs font-black border transition-all cursor-pointer",
                              discountSettingsForm.percentage === preset
                                ? "bg-[#ff6900] text-white border-[#ff6900]"
                                : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300"
                            )}
                          >
                            {preset}%
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Escopo da Promoção */}
                    <div>
                      <label className="text-xs font-black uppercase tracking-wider text-zinc-700 block mb-2">
                        Onde aplicar o desconto:
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setDiscountSettingsForm(prev => ({ ...prev, applyToAll: true }))}
                          className={cn(
                            "p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between",
                            discountSettingsForm.applyToAll
                              ? "bg-orange-50/80 border-[#ff6900] ring-2 ring-orange-200"
                              : "bg-white border-zinc-200 hover:bg-zinc-50"
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-black text-sm text-zinc-900">Todos os Produtos</span>
                            {discountSettingsForm.applyToAll && <Check className="w-4 h-4 text-[#ff6900]" />}
                          </div>
                          <span className="text-[11px] text-zinc-500">
                            Aplica o selo de -{discountSettingsForm.percentage}% em todos os produtos
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDiscountSettingsForm(prev => ({ ...prev, applyToAll: false }))}
                          className={cn(
                            "p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between",
                            !discountSettingsForm.applyToAll
                              ? "bg-orange-50/80 border-[#ff6900] ring-2 ring-orange-200"
                              : "bg-white border-zinc-200 hover:bg-zinc-50"
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-black text-sm text-zinc-900">Produtos Selecionados</span>
                            {!discountSettingsForm.applyToAll && <Check className="w-4 h-4 text-[#ff6900]" />}
                          </div>
                          <span className="text-[11px] text-zinc-500">
                            Escolha manualmente os produtos em promoção
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Seleção de Produtos Específicos */}
                  {!discountSettingsForm.applyToAll && (
                    <div className="space-y-4 pt-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-100/70 p-3.5 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={handleToggleAllDiscountProducts}
                            className="bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-300 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                          >
                            {discountSettingsForm.selectedProductIds.length === products.length ? (
                              <>
                                <CheckSquare className="w-4 h-4 text-[#ff6900]" />
                                <span>Desmarcar Todos</span>
                              </>
                            ) : (
                              <>
                                <Square className="w-4 h-4 text-zinc-400" />
                                <span>Selecionar Todos</span>
                              </>
                            )}
                          </button>

                          <span className="text-xs font-black text-zinc-600">
                            {discountSettingsForm.selectedProductIds.length} de {products.length} selecionados
                          </span>
                        </div>

                        {/* Barra de Pesquisa de Produtos */}
                        <div className="relative flex-1 sm:max-w-xs">
                          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Buscar produto por nome..."
                            value={discountProductFilter}
                            onChange={(e) => setDiscountProductFilter(e.target.value)}
                            className="w-full bg-white border border-zinc-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-[#ff6900]"
                          />
                        </div>
                      </div>

                      {/* Lista / Grid de Produtos */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto p-1">
                        {products
                          .filter(p => p.name.toLowerCase().includes(discountProductFilter.toLowerCase()) || p.category.toLowerCase().includes(discountProductFilter.toLowerCase()))
                          .map((product) => {
                            const isSelected = discountSettingsForm.selectedProductIds.includes(product.id);
                            return (
                              <div
                                key={product.id}
                                onClick={() => handleToggleSingleDiscountProduct(product.id)}
                                className={cn(
                                  "p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 select-none",
                                  isSelected
                                    ? "bg-orange-50/60 border-[#ff6900] shadow-xs"
                                    : "bg-white border-zinc-200 hover:border-zinc-300"
                                )}
                              >
                                <div className={cn(
                                  "w-5 h-5 rounded-md flex items-center justify-center border shrink-0 transition-colors",
                                  isSelected
                                    ? "bg-[#ff6900] border-[#ff6900] text-white"
                                    : "border-zinc-300 bg-white"
                                )}>
                                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>

                                <div className="w-12 h-12 rounded-xl bg-zinc-100 overflow-hidden shrink-0">
                                  <SafeImage
                                    src={product.images[0]}
                                    alt={product.name}
                                    className="w-full h-full object-contain p-1"
                                  />
                                </div>

                                <div className="min-w-0 flex-1">
                                  <h4 className="text-xs font-bold text-zinc-900 truncate">
                                    {product.name}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[11px] font-black text-zinc-700">
                                      KZ {product.price.toLocaleString('pt-AO')}
                                    </span>
                                    {isSelected && (
                                      <span className="text-[10px] font-extrabold text-[#ff6900] bg-orange-100 px-1.5 py-0.2 rounded">
                                        -{discountSettingsForm.percentage}%
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Botão de Salvar Descontos */}
                  <div className="flex justify-end pt-3 border-t border-zinc-100">
                    <button
                      type="button"
                      disabled={isSavingDiscount}
                      onClick={handleSaveDiscountSettings}
                      className="bg-[#ff6900] hover:bg-[#ff8500] text-white font-black text-xs uppercase tracking-wider px-6 py-3.5 rounded-2xl shadow-md shadow-orange-600/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSavingDiscount ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Salvando Alterações...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Salvar Configuração de Desconto</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* =========================================================
                    2. GESTÃO DE CUPONS DE DESCONTO
                ========================================================== */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-zinc-100 p-6 rounded-3xl">
                    <div>
                      <h3 className="font-bold text-base text-zinc-900">Cupons de Desconto Promocionais</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">Crie códigos de cupom que os clientes podem inserir no carrinho.</p>
                    </div>
                    <button 
                      onClick={() => {
                        setEditingCoupon(null);
                        setCouponForm({ code: '', type: 'percentage', value: 0, active: true, productId: '' });
                        setIsCouponModalOpen(true);
                      }}
                      className="bg-zinc-900 hover:bg-black text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Novo Cupom
                    </button>
                  </div>

                  <div className="glass rounded-[32px] overflow-hidden bg-white border border-zinc-200">
                    <table className="w-full text-left">
                      <thead className="bg-zinc-50 text-xs font-bold uppercase tracking-widest text-zinc-500">
                        <tr>
                          <th className="px-6 py-4">Código</th>
                          <th className="px-6 py-4">Desconto</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">Uso</th>
                          <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {coupons.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 font-medium">Nenhum cupom cadastrado.</td>
                          </tr>
                        ) : (
                          coupons.map(coupon => (
                            <tr key={coupon.id} className="hover:bg-zinc-50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="font-mono font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg inline-block">{coupon.code}</div>
                                {coupon.productId && (
                                  <div className="text-[10px] text-zinc-400 mt-1 uppercase font-bold tracking-widest">
                                    Produto: {products.find(p => p.id === coupon.productId)?.name || 'Desconhecido'}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 font-bold">
                                {coupon.type === 'percentage' ? `${(coupon.value || 0)}% OFF` : `KZ ${(coupon.value || 0).toFixed(2)}`}
                              </td>
                              <td className="px-6 py-4">
                                {coupon.active ? (
                                  <span className="text-[10px] font-bold uppercase bg-emerald-400/10 text-emerald-500 px-2 py-1 rounded-lg">Ativo</span>
                                ) : (
                                  <span className="text-[10px] font-bold uppercase bg-zinc-200 text-zinc-500 px-2 py-1 rounded-lg">Inativo</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm text-zinc-500">{coupon.usageCount} vezes</td>
                              <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => {
                                    setEditingCoupon(coupon);
                                    setCouponForm({ 
                                      code: coupon.code || '', 
                                      type: coupon.type || 'percentage', 
                                      value: coupon.value || 0, 
                                      active: coupon.active ?? true, 
                                      productId: coupon.productId || '' 
                                    });
                                    setIsCouponModalOpen(true);
                                  }}
                                  className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-orange-600 transition-all cursor-pointer"
                                  title="Editar cupom"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteCoupon(coupon.id)}
                                  className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-red-500 transition-all cursor-pointer"
                                  title="Excluir cupom"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {adminTab === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl space-y-8"
              >
                <div className="glass rounded-[40px] p-8 md:p-12 space-y-10 bg-white border border-zinc-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <Package className="w-5 h-5 text-orange-500" />
                        Identidade Visual
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block">URL do Logotipo</label>
                            <button
                              type="button"
                              onClick={() => setSettingsForm({ ...settingsForm, logoUrl: '/icon-512.png' })}
                              className="text-xs font-bold text-[#ff6900] hover:text-[#ff8500] flex items-center gap-1 cursor-pointer bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200 transition-all hover:scale-105 active:scale-95"
                              title="Usar o logótipo oficial de alta resolução PDA Comercial"
                            >
                              <span>✨ Inserir Logótipo Oficial (/icon-512.png)</span>
                            </button>
                          </div>
                          <input 
                            type="text" 
                            placeholder="/icon-512.png"
                            value={settingsForm.logoUrl ?? '/icon-512.png'}
                            onChange={e => setSettingsForm({...settingsForm, logoUrl: e.target.value})}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-orange-500 transition-all font-mono text-xs"
                          />
                          <p className="text-[10px] text-zinc-400 mt-2">Logótipo oficial de alta resolução da PDA Comercial.</p>
                        </div>

                        <div className="pt-4">
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 block">Prévia do Logotipo</label>
                          <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-zinc-200 flex items-center justify-center overflow-hidden bg-white p-2 shadow-sm">
                            <SafeImage 
                              src={(settingsForm.logoUrl && settingsForm.logoUrl !== '/pda-logo.svg') ? settingsForm.logoUrl : '/icon-512.png'} 
                              className="w-full h-full object-contain p-1" 
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <Edit className="w-5 h-5 text-orange-500" />
                        Informações da Loja
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Nome da Loja</label>
                          <input 
                            type="text" 
                            value={settingsForm.storeName || ''}
                            onChange={e => setSettingsForm({...settingsForm, storeName: e.target.value})}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-orange-500 transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Slogan / Descrição Curta</label>
                          <textarea 
                            value={settingsForm.storeDescription || ''}
                            onChange={e => setSettingsForm({...settingsForm, storeDescription: e.target.value})}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-orange-500 transition-all h-32 resize-none"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 block">WhatsApp para Notificações</label>
                          <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                            <input 
                              type="text" 
                              placeholder="Ex: 244921000000"
                              value={settingsForm.whatsappNumber || ''}
                              onChange={e => setSettingsForm({...settingsForm, whatsappNumber: e.target.value})}
                              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl pl-12 pr-6 py-4 focus:outline-none focus:border-orange-500 transition-all font-mono"
                            />
                          </div>
                          <p className="text-[9px] text-zinc-400 mt-2">DICA: Insira com código do país (Angola: 244) sem o sinal +</p>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 block">E-mail para Notificações</label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                            <input 
                              type="email" 
                              placeholder="seuemail@exemplo.com"
                              value={settingsForm.emailForNotifications || ''}
                              onChange={e => setSettingsForm({...settingsForm, emailForNotifications: e.target.value})}
                              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl pl-12 pr-6 py-4 focus:outline-none focus:border-orange-500 transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-10 border-t border-zinc-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-8">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <Filter className="w-5 h-5 text-orange-500" />
                        Personalização de Cores da Loja
                      </h3>
                      <span className="text-xs text-zinc-500">
                        Cor do Preço definida por defeito no <strong className="text-[#ff6900]">Laranja da PDA</strong>
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Cor do Preço - Em Laranja da PDA por defeito */}
                      <div className="p-6 bg-zinc-50 rounded-[32px] border border-zinc-100 flex flex-col justify-between">
                        <div className="flex items-center gap-6 mb-3">
                          <div className="relative">
                            <input 
                              type="color" 
                              value={settingsForm.priceColor || '#ff6900'}
                              onChange={e => setSettingsForm({...settingsForm, priceColor: e.target.value})}
                              className="w-16 h-16 rounded-2xl cursor-pointer border-none p-0 overflow-hidden shadow-sm"
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <label className="text-xs font-bold text-zinc-700 uppercase tracking-widest block">Cor do Preço</label>
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-100 text-[#ff6900] border border-orange-200">Laranja PDA</span>
                            </div>
                            <span className="font-mono text-sm font-bold block mt-0.5" style={{ color: settingsForm.priceColor || '#ff6900' }}>
                              {(settingsForm.priceColor || '#ff6900').toUpperCase()}
                            </span>
                            <span className="text-[10px] text-zinc-400">Preço em KZ nos cards, destaques e carrinho</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-zinc-200/60">
                          <span className="text-[10px] text-zinc-400 font-bold uppercase mr-1">Presets:</span>
                          {[
                            { name: 'Laranja PDA Oficial', color: '#ff6900' },
                            { name: 'Laranja Vibrante', color: '#ff5a00' },
                            { name: 'Azul PDA', color: '#062b5c' },
                            { name: 'Verde Esmeralda', color: '#059669' },
                            { name: 'Preto Ônix', color: '#09090b' },
                            { name: 'Dourado', color: '#d97706' }
                          ].map(preset => (
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() => setSettingsForm({ ...settingsForm, priceColor: preset.color })}
                              className="px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all hover:scale-105 active:scale-95 cursor-pointer"
                              style={{ borderColor: preset.color, color: preset.color }}
                            >
                              {preset.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Cor do Cabeçalho (Header / Barra Superior) */}
                      <div className="p-6 bg-zinc-50 rounded-[32px] border border-zinc-100 flex flex-col justify-between">
                        <div className="flex items-center gap-6 mb-3">
                          <div className="relative">
                            <input 
                              type="color" 
                              value={settingsForm.headerColor || '#062b5c'}
                              onChange={e => setSettingsForm({...settingsForm, headerColor: e.target.value})}
                              className="w-16 h-16 rounded-2xl cursor-pointer border-none p-0 overflow-hidden shadow-sm"
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <label className="text-xs font-bold text-zinc-700 uppercase tracking-widest block">Barra Superior (Cabeçalho)</label>
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-[#062b5c] border border-blue-200">Azul PDA</span>
                            </div>
                            <span className="font-mono text-sm font-bold block mt-0.5">{(settingsForm.headerColor || '#062b5c').toUpperCase()}</span>
                            <span className="text-[10px] text-zinc-400">Barra superior com logótipo e busca (-20% compacta)</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-zinc-200/60">
                          <span className="text-[10px] text-zinc-400 font-bold uppercase mr-1">Presets:</span>
                          {[
                            { name: 'Azul PDA', color: '#062b5c' },
                            { name: 'Azul Noturno', color: '#031d40' },
                            { name: 'Azul Real', color: '#0f2b59' },
                            { name: 'Preto Ônix', color: '#09090b' },
                            { name: 'Laranja PDA', color: '#ff6900' }
                          ].map(preset => (
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() => setSettingsForm({ ...settingsForm, headerColor: preset.color })}
                              className="px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all hover:scale-105 active:scale-95 cursor-pointer"
                              style={{ borderColor: preset.color, color: preset.color }}
                            >
                              {preset.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Cor Primária dos Botões de Ação */}
                      <div className="p-6 bg-zinc-50 rounded-[32px] border border-zinc-100 flex flex-col justify-between">
                        <div className="flex items-center gap-6 mb-3">
                          <div className="relative">
                            <input 
                              type="color" 
                              value={settingsForm.primaryColor || '#ff6900'}
                              onChange={e => setSettingsForm({...settingsForm, primaryColor: e.target.value})}
                              className="w-16 h-16 rounded-2xl cursor-pointer border-none p-0 overflow-hidden shadow-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-zinc-700 uppercase tracking-widest mb-1 block">Botões de Ação (Comprar / Adicionar)</label>
                            <span className="font-mono text-sm font-bold">{(settingsForm.primaryColor || '#ff6900').toUpperCase()}</span>
                            <span className="text-[10px] text-zinc-400 block">Botão +, finalizar compra e confirmações</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-zinc-200/60">
                          <span className="text-[10px] text-zinc-400 font-bold uppercase mr-1">Presets:</span>
                          {[
                            { name: 'Laranja PDA', color: '#ff6900' },
                            { name: 'Laranja Queimado', color: '#ea580c' },
                            { name: 'Azul PDA', color: '#062b5c' },
                            { name: 'Verde', color: '#10b981' },
                            { name: 'Preto', color: '#09090b' }
                          ].map(preset => (
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() => setSettingsForm({ ...settingsForm, primaryColor: preset.color })}
                              className="px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all hover:scale-105 active:scale-95 cursor-pointer"
                              style={{ borderColor: preset.color, color: preset.color }}
                            >
                              {preset.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Cor de Destaque (Badges & Tags) */}
                      <div className="p-6 bg-zinc-50 rounded-[32px] border border-zinc-100 flex flex-col justify-between">
                        <div className="flex items-center gap-6 mb-3">
                          <div className="relative">
                            <input 
                              type="color" 
                              value={settingsForm.accentColor || '#ff8500'}
                              onChange={e => setSettingsForm({...settingsForm, accentColor: e.target.value})}
                              className="w-16 h-16 rounded-2xl cursor-pointer border-none p-0 overflow-hidden shadow-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-zinc-700 uppercase tracking-widest mb-1 block">Destaques & Badges Promocionais</label>
                            <span className="font-mono text-sm font-bold">{(settingsForm.accentColor || '#ff8500').toUpperCase()}</span>
                            <span className="text-[10px] text-zinc-400 block">Badges de categoria, tags e realces</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-zinc-200/60">
                          <span className="text-[10px] text-zinc-400 font-bold uppercase mr-1">Presets:</span>
                          {[
                            { name: 'Laranja Claro', color: '#ff8500' },
                            { name: 'Âmbar', color: '#f59e0b' },
                            { name: 'Azul Céu', color: '#0284c7' },
                            { name: 'Esmeralda', color: '#34d399' }
                          ].map(preset => (
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() => setSettingsForm({ ...settingsForm, accentColor: preset.color })}
                              className="px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all hover:scale-105 active:scale-95 cursor-pointer"
                              style={{ borderColor: preset.color, color: preset.color }}
                            >
                              {preset.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Cor de Fundo da Loja */}
                      <div className="p-6 bg-zinc-50 rounded-[32px] border border-zinc-100 flex flex-col justify-between">
                        <div className="flex items-center gap-6 mb-3">
                          <div className="relative">
                            <input 
                              type="color" 
                              value={settingsForm.backgroundColor || '#f5f7fb'}
                              onChange={e => setSettingsForm({
                                ...settingsForm, 
                                backgroundColor: e.target.value
                              })}
                              className="w-16 h-16 rounded-2xl cursor-pointer border-none p-0 overflow-hidden shadow-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-zinc-700 uppercase tracking-widest mb-1 block">Cor de Fundo da Loja</label>
                            <span className="font-mono text-sm font-bold">{(settingsForm.backgroundColor || '#f5f7fb').toUpperCase()}</span>
                            <span className="text-[10px] text-zinc-400 block">Fundo geral da página e catálogo</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-zinc-200/60">
                          <span className="text-[10px] text-zinc-400 font-bold uppercase mr-1">Presets:</span>
                          {[
                            { name: 'Fundo PDA', color: '#f5f7fb' },
                            { name: 'Branco Puro', color: '#ffffff' },
                            { name: 'Cinza Suave', color: '#f8fafc' },
                            { name: 'Cinza Gelo', color: '#f1f5f9' },
                            { name: 'Creme', color: '#fafaf9' }
                          ].map(preset => (
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() => setSettingsForm({ ...settingsForm, backgroundColor: preset.color })}
                              className="px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all hover:scale-105 active:scale-95 cursor-pointer"
                              style={{ borderColor: preset.color, color: preset.color === '#ffffff' ? '#64748b' : preset.color }}
                            >
                              {preset.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Cor dos Textos e Títulos */}
                      <div className="p-6 bg-zinc-50 rounded-[32px] border border-zinc-100 flex flex-col justify-between">
                        <div className="flex items-center gap-6 mb-3">
                          <div className="relative">
                            <input 
                              type="color" 
                              value={settingsForm.textColor || '#142238'}
                              onChange={e => setSettingsForm({
                                ...settingsForm, 
                                textColor: e.target.value
                              })}
                              className="w-16 h-16 rounded-2xl cursor-pointer border-none p-0 overflow-hidden shadow-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-zinc-700 uppercase tracking-widest mb-1 block">Cor dos Textos e Títulos</label>
                            <span className="font-mono text-sm font-bold">{(settingsForm.textColor || '#142238').toUpperCase()}</span>
                            <span className="text-[10px] text-zinc-400 block">Títulos de produtos, seções e categorias</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-zinc-200/60">
                          <span className="text-[10px] text-zinc-400 font-bold uppercase mr-1">Presets:</span>
                          {[
                            { name: 'Azul Escuro PDA', color: '#142238' },
                            { name: 'Preto Puro', color: '#09090b' },
                            { name: 'Grafite', color: '#1e293b' },
                            { name: 'Azul Meia-Noite', color: '#0f172a' }
                          ].map(preset => (
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() => setSettingsForm({ ...settingsForm, textColor: preset.color })}
                              className="px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all hover:scale-105 active:scale-95 cursor-pointer"
                              style={{ borderColor: preset.color, color: preset.color }}
                            >
                              {preset.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Cor da Barra de Pesquisa */}
                      <div className="p-6 bg-zinc-50 rounded-[32px] border border-zinc-100 flex flex-col justify-between">
                        <div className="flex items-center gap-6 mb-3">
                          <div className="relative">
                            <input 
                              type="color" 
                              value={settingsForm.searchBarColor || '#ffffff'}
                              onChange={e => setSettingsForm({
                                ...settingsForm, 
                                searchBarColor: e.target.value,
                                searchBorderColor: e.target.value
                              })}
                              className="w-16 h-16 rounded-2xl cursor-pointer border-none p-0 overflow-hidden shadow-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-zinc-700 uppercase tracking-widest mb-1 block">Cor da Barra de Pesquisa</label>
                            <span className="font-mono text-sm font-bold">{(settingsForm.searchBarColor || '#ffffff').toUpperCase()}</span>
                            <span className="text-[10px] text-zinc-400 block">Fundo do campo de pesquisa no cabeçalho</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-zinc-200/60">
                          <span className="text-[10px] text-zinc-400 font-bold uppercase mr-1">Presets:</span>
                          {[
                            { name: 'Branco Neve', color: '#ffffff' },
                            { name: 'Cinza Suave', color: '#f1f5f9' },
                            { name: 'Deep Navy', color: '#07172e' },
                            { name: 'Azul Meia-Noite', color: '#1e3a8a' },
                            { name: 'Preto Ônix', color: '#09090b' }
                          ].map(preset => (
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() => setSettingsForm({ 
                                ...settingsForm, 
                                searchBarColor: preset.color,
                                searchBorderColor: preset.color
                              })}
                              className="px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all hover:scale-105 active:scale-95"
                              style={{ borderColor: preset.color, color: preset.color === '#ffffff' ? '#64748b' : preset.color }}
                            >
                              {preset.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Cor do Banner de Ofertas */}
                      <div className="p-6 bg-zinc-50 rounded-[32px] border border-zinc-100 flex flex-col justify-between">
                        <div className="flex items-center gap-6 mb-3">
                          <div className="relative">
                            <input 
                              type="color" 
                              value={settingsForm.showcaseColor || '#062b5c'}
                              onChange={e => setSettingsForm({
                                ...settingsForm, 
                                showcaseColor: e.target.value,
                                showcaseBorderColor: e.target.value
                              })}
                              className="w-16 h-16 rounded-2xl cursor-pointer border-none p-0 overflow-hidden shadow-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-zinc-700 uppercase tracking-widest mb-1 block">Cor do Banner de Ofertas</label>
                            <span className="font-mono text-sm font-bold">{(settingsForm.showcaseColor || '#062b5c').toUpperCase()}</span>
                            <span className="text-[10px] text-zinc-400 block">Banner de ofertas especiais abaixo dos produtos</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-zinc-200/60">
                          <span className="text-[10px] text-zinc-400 font-bold uppercase mr-1">Presets:</span>
                          {[
                            { name: 'Azul PDA', color: '#062b5c' },
                            { name: 'Azul Noturno', color: '#020a17' },
                            { name: 'Deep Navy', color: '#07172e' },
                            { name: 'Índigo', color: '#1e1b4b' },
                            { name: 'Laranja PDA', color: '#ff6900' }
                          ].map(preset => (
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() => setSettingsForm({ 
                                ...settingsForm, 
                                showcaseColor: preset.color,
                                showcaseBorderColor: preset.color
                              })}
                              className="px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all hover:scale-105 active:scale-95"
                              style={{ borderColor: preset.color, color: preset.color }}
                            >
                              {preset.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-10 border-t border-zinc-100">
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-8">
                      <Layout className="w-5 h-5 text-orange-500" />
                      Estilo & Tipografia
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Arredondamento (Border Radius)</label>
                        <select 
                          value={settingsForm.borderRadius}
                          onChange={e => setSettingsForm({...settingsForm, borderRadius: e.target.value})}
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-orange-500 transition-all appearance-none"
                        >
                          <option value="0px">Quadrado (0px)</option>
                          <option value="8px">Suave (8px)</option>
                          <option value="16px">Moderno (16px)</option>
                          <option value="24px">Arredondado (24px)</option>
                          <option value="40px">Extra Arredondado (40px)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Fonte do Site</label>
                        <select 
                          value={settingsForm.fontFamily}
                          onChange={e => setSettingsForm({...settingsForm, fontFamily: e.target.value})}
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-orange-500 transition-all appearance-none"
                        >
                          <option value="'Inter', sans-serif">Inter (Padrão)</option>
                          <option value="'Outfit', sans-serif">Outfit (Moderno)</option>
                          <option value="'Space Grotesk', sans-serif">Space Grotesk (Tech)</option>
                          <option value="'JetBrains Mono', monospace">JetBrains Mono (Técnico)</option>
                          <option value="'Playfair Display', serif">Playfair Display (Elegante)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Configuração do Carrossel de Destaques & Legendas */}
                  <div className="pt-10 border-t border-zinc-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div>
                        <h3 className="text-lg font-bold flex items-center gap-2 text-zinc-900">
                          <Sparkles className="w-5 h-5 text-[#ff6900]" />
                          Carrossel de Destaques & Legendas dos Anúncios
                        </h3>
                        <p className="text-xs text-zinc-400 mt-1">
                          Configure a capa ("Tudo o que você precisa num só lugar!") e as legendas dos anúncios com imagens em destaque.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const newSlide: BannerSlide = {
                            id: `slide_${Date.now()}`,
                            tag: '✨ NOVIDADE EM DESTAQUE',
                            title: 'Os Melhores Produtos',
                            highlightText: 'ao melhor preço!',
                            subtitle: 'Qualidade superior, estoque disponível e entregas rápidas na Huíla e Cunene.',
                            buttonText: 'Ver Detalhes →',
                            imageUrl: products[0]?.images[0] || '',
                            productId: products[0]?.id || ''
                          };
                          setSettingsForm({
                            ...settingsForm,
                            bannerSlides: [...(settingsForm.bannerSlides || []), newSlide]
                          });
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Adicionar Anúncio de Destaque</span>
                      </button>
                    </div>

                    {/* Informação sobre a Capa (Slide 1) */}
                    <div className="bg-orange-50/70 border border-orange-100 p-5 rounded-2xl mb-6">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-black uppercase tracking-wider text-orange-700 bg-orange-100 px-2 py-0.5 rounded-md">
                          Banner 1 (Capa Principal)
                        </span>
                        <span className="text-xs text-zinc-500 font-medium">Exibe o ícone 👟 no canto inferior direito</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Título Fixo da Capa</label>
                          <div className="p-3 bg-white rounded-xl border border-orange-200 text-xs font-bold text-zinc-800">
                            Tudo o que você precisa <span className="text-[#ff6900]">num só lugar!</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Legenda / Subtítulo da Capa</label>
                          <input
                            type="text"
                            placeholder="Roupas • Calçados • Computadores e muito mais..."
                            value={settingsForm.storeDescription || ''}
                            onChange={e => setSettingsForm({ ...settingsForm, storeDescription: e.target.value })}
                            className="w-full bg-white border border-orange-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-orange-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Lista de Anúncios Adicionais (com imagem do produto no canto inferior direito) */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-widest text-zinc-500">
                          Banners Seguintes ({(settingsForm.bannerSlides || []).length} anúncios personalizados)
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          Se não adicionar nenhum anúncio personalizado, a loja exibe automaticamente os produtos em destaque do catálogo.
                        </span>
                      </div>

                      {(!settingsForm.bannerSlides || settingsForm.bannerSlides.length === 0) ? (
                        <div className="p-6 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200 text-center">
                          <Layers className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                          <p className="text-xs font-bold text-zinc-600">Modo Automático Ativo</p>
                          <p className="text-[11px] text-zinc-400 mt-0.5">
                            Os produtos marcados como <strong>Destaque</strong> no Catálogo de Produtos aparecerão automaticamente como slides no carrossel com suas fotos e legendas.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {settingsForm.bannerSlides.map((slide, sIdx) => (
                            <div key={slide.id || sIdx} className="bg-zinc-50 p-5 rounded-2xl border border-zinc-200 space-y-4 relative">
                              <div className="flex items-center justify-between border-b border-zinc-200/80 pb-3">
                                <span className="text-xs font-bold text-orange-600">
                                  Banner #{sIdx + 2} (Anúncio com Imagem)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = (settingsForm.bannerSlides || []).filter((_, i) => i !== sIdx);
                                    setSettingsForm({ ...settingsForm, bannerSlides: updated });
                                  }}
                                  className="text-zinc-400 hover:text-red-500 p-1.5 transition-colors cursor-pointer"
                                  title="Remover este anúncio"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Tag / Selo</label>
                                  <input
                                    type="text"
                                    value={slide.tag || ''}
                                    placeholder="Ex: 🔥 OFERTA EXCLUSIVA"
                                    onChange={e => {
                                      const updated = [...(settingsForm.bannerSlides || [])];
                                      updated[sIdx] = { ...slide, tag: e.target.value };
                                      setSettingsForm({ ...settingsForm, bannerSlides: updated });
                                    }}
                                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Título do Anúncio</label>
                                  <input
                                    type="text"
                                    value={slide.title || ''}
                                    placeholder="Ex: Tudo o que você precisa"
                                    onChange={e => {
                                      const updated = [...(settingsForm.bannerSlides || [])];
                                      updated[sIdx] = { ...slide, title: e.target.value };
                                      setSettingsForm({ ...settingsForm, bannerSlides: updated });
                                    }}
                                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Destaque em Laranja</label>
                                  <input
                                    type="text"
                                    value={slide.highlightText || ''}
                                    placeholder="Ex: num só lugar!"
                                    onChange={e => {
                                      const updated = [...(settingsForm.bannerSlides || [])];
                                      updated[sIdx] = { ...slide, highlightText: e.target.value };
                                      setSettingsForm({ ...settingsForm, bannerSlides: updated });
                                    }}
                                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Legenda / Subtítulo</label>
                                  <textarea
                                    rows={2}
                                    value={slide.subtitle || ''}
                                    placeholder="Legenda informativa do anúncio em destaque..."
                                    onChange={e => {
                                      const updated = [...(settingsForm.bannerSlides || [])];
                                      updated[sIdx] = { ...slide, subtitle: e.target.value };
                                      setSettingsForm({ ...settingsForm, bannerSlides: updated });
                                    }}
                                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs resize-none"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <div>
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Vincular a um Produto (Opcional)</label>
                                    <select
                                      value={slide.productId || ''}
                                      onChange={e => {
                                        const pId = e.target.value;
                                        const prod = products.find(p => p.id === pId);
                                        const updated = [...(settingsForm.bannerSlides || [])];
                                        updated[sIdx] = { 
                                          ...slide, 
                                          productId: pId,
                                          imageUrl: prod?.images[0] || slide.imageUrl || ''
                                        };
                                        setSettingsForm({ ...settingsForm, bannerSlides: updated });
                                      }}
                                      className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs"
                                    >
                                      <option value="">Nenhum (usar URL de imagem direta)</option>
                                      {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} - KZ {p.price.toLocaleString('pt-AO')}</option>
                                      ))}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">URL da Imagem no Destaque (Inferior Direito)</label>
                                    <div className="flex gap-2">
                                      <input
                                        type="text"
                                        value={slide.imageUrl || ''}
                                        placeholder="https://exemplo.com/imagem.png"
                                        onChange={e => {
                                          const updated = [...(settingsForm.bannerSlides || [])];
                                          updated[sIdx] = { ...slide, imageUrl: e.target.value };
                                          setSettingsForm({ ...settingsForm, bannerSlides: updated });
                                        }}
                                        className="flex-1 bg-white border border-zinc-200 rounded-xl px-3 py-2 text-xs"
                                      />
                                      {slide.imageUrl && (
                                        <div className="w-9 h-9 rounded-lg bg-zinc-200 overflow-hidden shrink-0 border border-zinc-300">
                                          <SafeImage src={slide.imageUrl} className="w-full h-full object-contain" />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-10 border-t border-zinc-100">
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-8">
                      <Monitor className="w-5 h-5 text-orange-500" />
                      Publicidade (Anúncio Popup)
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-6">
                        <div className="bg-zinc-50 p-6 rounded-[32px] border border-zinc-100 flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-zinc-700">Ativar Painel de Vantagens</span>
                            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">"Conheça as vantagens exclusivas..."</span>
                          </div>
                          <button 
                            onClick={() => setSettingsForm({...settingsForm, showBenefitsModal: !settingsForm.showBenefitsModal})}
                            className={cn(
                              "relative w-12 h-6 rounded-full transition-all duration-300",
                              settingsForm.showBenefitsModal !== false ? "bg-orange-500" : "bg-zinc-300"
                            )}
                          >
                            <div className={cn(
                              "absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300",
                              settingsForm.showBenefitsModal !== false ? "right-1" : "left-1"
                            )} />
                          </button>
                        </div>

                        <div className="bg-zinc-50 p-6 rounded-[32px] border border-zinc-100 flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-zinc-700">Ativar Anúncio Popup</span>
                            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Exibido na entrada do site</span>
                          </div>
                          <button 
                            onClick={() => setSettingsForm({...settingsForm, showAd: !settingsForm.showAd})}
                            className={cn(
                              "relative w-12 h-6 rounded-full transition-all duration-300",
                              settingsForm.showAd ? "bg-orange-500" : "bg-zinc-300"
                            )}
                          >
                            <div className={cn(
                              "absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300",
                              settingsForm.showAd ? "right-1" : "left-1"
                            )} />
                          </button>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 block">URL da Imagem do Anúncio</label>
                          <input 
                            type="text" 
                            placeholder="https://exemplo.com/promo.jpg"
                            value={settingsForm.adImageUrl || ''}
                            onChange={e => setSettingsForm({...settingsForm, adImageUrl: e.target.value})}
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-orange-500 transition-all font-mono text-sm"
                          />
                          <p className="text-[10px] text-zinc-400 mt-2 italic">Dica: Use imagens atraentes para promoções ou avisos.</p>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 block">Prévia do Anúncio</label>
                        <div className="aspect-[3/4] w-full max-w-[240px] mx-auto rounded-[32px] border-2 border-dashed border-zinc-200 flex items-center justify-center overflow-hidden bg-zinc-50">
                          {settingsForm.adImageUrl ? (
                            <SafeImage src={settingsForm.adImageUrl} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-12 h-12 text-zinc-200" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-10 border-t border-zinc-100">
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-8">
                      <RotateCcw className="w-5 h-5 text-orange-500" />
                      Controle de Caixa e Métricas
                    </h3>
                    
                    <div className="bg-zinc-50 p-6 rounded-[32px] border border-zinc-100 space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-1">
                          <span className="text-sm font-bold text-zinc-700 block">Zerar Vendas e Recebidos (Mês)</span>
                          <div className="text-xs text-zinc-500 leading-relaxed">
                            {settingsForm.salesResetDate ? (
                              <span className="flex flex-wrap items-center gap-1.5 mt-1">
                                Atualmente somando apenas a partir de: 
                                <strong className="font-mono text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg text-[10px] inline-block">
                                  {new Date(settingsForm.salesResetDate).toLocaleString('pt-PT')}
                                </strong>
                              </span>
                            ) : (
                              "Calcular o acumulado de vendas com base no mês cheio atual."
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2.5">
                          {settingsForm.salesResetDate && (
                            <button
                              onClick={() => {
                                if (window.confirm("Deseja restaurar a contagem integral das vendas para o mês inteiro?")) {
                                  setSettingsForm({ ...settingsForm, salesResetDate: "" });
                                }
                              }}
                              className="bg-zinc-200 text-zinc-700 px-5 py-3 rounded-2xl font-bold hover:bg-zinc-300 transition-all text-xs"
                            >
                              Restaurar Mês Inteiro
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (window.confirm("Tem certeza que deseja zerar os totais de vendas e recebidos do mês? Esta ação definirá a data de início da soma para o momento atual.")) {
                                setSettingsForm({ ...settingsForm, salesResetDate: new Date().toISOString() });
                              }
                            }}
                            className="bg-orange-600 text-white px-5 py-3 rounded-2xl font-bold hover:bg-orange-700 transition-all flex items-center gap-2 text-xs shadow-md shadow-orange-600/10"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Zerar Vendas do Mês
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-10 border-t border-zinc-100 text-right">
                    <button 
                      onClick={handleSaveSettings}
                      className="bg-orange-600 text-white px-10 py-5 rounded-[24px] font-bold hover:bg-orange-700 transition-all shadow-xl shadow-orange-600/20 flex items-center gap-3 ml-auto"
                    >
                      <Save className="w-5 h-5" />
                      Salvar Todas as Definições
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Product Modal */}
          <AnimatePresence>
            {isProductModalOpen && (
              <>
                <motion.div 
                  key="product-admin-overlay"
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }} 
                  onClick={() => setIsProductModalOpen(false)} 
                  className="fixed inset-0 bg-white/90 backdrop-blur-sm z-[100]" 
                />
                <motion.div 
                  key="product-admin-modal"
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.9 }} 
                  className="glass fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-auto md:left-1/2 md:-translate-x-1/2 w-full max-w-2xl rounded-[40px] p-8 z-[101] max-h-[90vh] overflow-y-auto bg-white border border-zinc-200"
                >
                  <h2 className="text-2xl font-bold mb-6">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
                  <div className="space-y-4">
                    <input type="text" placeholder="Nome do Produto" value={productForm.name || ''} onChange={e => setProductForm({...productForm, name: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500" />
                    <textarea placeholder="Descrição" value={productForm.description || ''} onChange={e => setProductForm({...productForm, description: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 h-24" />
                    <div className="grid grid-cols-2 gap-4">
                      <input type="number" placeholder="Preço" value={productForm.price ?? 0} onChange={e => setProductForm({...productForm, price: Number(e.target.value)})} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500" />
                      <input type="text" placeholder="Categoria" value={productForm.category || ''} onChange={e => setProductForm({...productForm, category: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Cores (separadas por vírgula)</label>
                      <input type="text" placeholder="Ex: Azul, Preto, Branco" value={productForm.attributes.colors.join(', ')} onChange={e => setProductForm({...productForm, attributes: {...productForm.attributes, colors: e.target.value.split(',').map(s => s.trim())}})} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Tamanhos (separados por vírgula)</label>
                      <input type="text" placeholder="Ex: S, M, L" value={productForm.attributes.sizes.join(', ')} onChange={e => setProductForm({...productForm, attributes: {...productForm.attributes, sizes: e.target.value.split(',').map(s => s.trim())}})} className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Imagens do Produto (URLs separadas por vírgula)</label>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        {productForm.images.filter(img => img.trim() !== '').map((img, idx) => (
                          <div key={`${img}-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border border-zinc-200 bg-white">
                            <SafeImage src={img} alt="" className="w-full h-full object-contain" />
                            <button 
                              onClick={() => setProductForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))}
                              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <input 
                        type="text" 
                        placeholder="https://imagem1.jpg, https://imagem2.jpg" 
                        value={productForm.images.join(', ')} 
                        onChange={e => setProductForm({...productForm, images: e.target.value.split(',').map(s => s.trim())})} 
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500" 
                      />
                    </div>

                    {/* Color to Image Association */}
                    {productForm.attributes.colors.filter(c => c.trim() !== '').length > 0 && 
                     productForm.images.filter(img => img.trim() !== '').length > 0 && (
                      <div className="bg-zinc-50 p-6 rounded-[24px] border border-zinc-200 space-y-4">
                        <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider block">
                          Vincular Cor à Foto do Produto
                        </label>
                        <p className="text-[10px] text-zinc-500 -mt-2 leading-relaxed">
                          Selecione qual imagem cadastrada acima corresponde a cada cor do produto. Ao clicar na cor na loja, o sistema exibirá automaticamente a foto selecionada.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {productForm.attributes.colors.filter(c => c.trim() !== '').map(color => {
                            const mappedUrl = productForm.colorImages?.[color] || '';
                            const validImages = productForm.images.filter(img => img.trim() !== '');
                            return (
                              <div key={color} className="flex flex-col gap-1.5 bg-white p-3 rounded-xl border border-zinc-100 shadow-sm">
                                <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                  Cor: {color}
                                </span>
                                <div className="flex items-center gap-2 mt-1">
                                  {mappedUrl && (
                                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-zinc-100 shrink-0 bg-zinc-50 flex items-center justify-center">
                                      <SafeImage src={mappedUrl} alt="" className="w-full h-full object-contain" />
                                    </div>
                                  )}
                                  <select
                                    value={mappedUrl}
                                    onChange={e => {
                                      const newUrl = e.target.value;
                                      setProductForm(prev => ({
                                        ...prev,
                                        colorImages: {
                                          ...prev.colorImages,
                                          [color]: newUrl
                                        }
                                      }));
                                    }}
                                    className="flex-1 text-[11px] bg-zinc-50 border border-zinc-200 rounded-lg p-2 focus:outline-none focus:border-orange-500"
                                  >
                                    <option value="">Sem Imagem Vinculada</option>
                                    {validImages.map((img, idx) => (
                                      <option key={idx} value={img}>
                                        Foto {idx + 1}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-zinc-700">Destacar na Loja</span>
                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Exibir no carrossel do início</span>
                      </div>
                      <button 
                        onClick={() => setProductForm({...productForm, isFeatured: !productForm.isFeatured})}
                        className={cn(
                          "relative w-12 h-6 rounded-full transition-all duration-300",
                          productForm.isFeatured ? "bg-orange-500" : "bg-zinc-300"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300",
                          productForm.isFeatured ? "right-1" : "left-1"
                        )} />
                      </button>
                    </div>
                    <div className="flex gap-4 pt-4">
                      <button onClick={() => setIsProductModalOpen(false)} className="flex-1 bg-zinc-100 py-4 rounded-2xl font-bold hover:bg-zinc-200 transition-all">Cancelar</button>
                      <button onClick={handleSaveProduct} className="flex-1 bg-orange-600 text-white py-4 rounded-2xl font-bold hover:bg-orange-700 transition-all">Salvar Produto</button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Debt Modal */}
          <AnimatePresence>
            {isDebtModalOpen && (
              <>
                <motion.div 
                  key="debt-overlay"
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }} 
                  onClick={() => setIsDebtModalOpen(false)} 
                  className="fixed inset-0 bg-white/90 backdrop-blur-sm z-[100]" 
                />
                <motion.div 
                  key="debt-modal"
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.9 }} 
                  className="glass fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-auto md:left-1/2 md:-translate-x-1/2 w-full max-w-md rounded-[40px] p-8 z-[101] bg-white border border-zinc-200"
                >
                  <h2 className="text-2xl font-bold mb-6">{editingDebt ? 'Editar Dívida' : 'Nova Dívida'}</h2>
                  <div className="space-y-4">
                    {!editingDebt && (
                      <>
                        <div>
                          <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Nome do Cliente (Opcional)</label>
                          <input 
                            type="text" 
                            value={debtForm.customerName || ''} 
                            onChange={e => setDebtForm({...debtForm, customerName: e.target.value})} 
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500" 
                            placeholder="Ex: João Silva"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Telefone (Opcional)</label>
                          <input 
                            type="text" 
                            value={debtForm.customerPhone || ''} 
                            onChange={e => setDebtForm({...debtForm, customerPhone: e.target.value})} 
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500" 
                            placeholder="Ex: 9xx xxx xxx"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Valor Total (KZ)</label>
                          <input 
                            type="number" 
                            value={debtForm.amount ?? 0} 
                            onChange={e => setDebtForm({...debtForm, amount: Number(e.target.value), remainingAmount: Number(e.target.value)})} 
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500" 
                          />
                        </div>
                      </>
                    )}
                    {editingDebt && (
                      <div className="p-4 bg-zinc-50 rounded-2xl mb-4">
                        <div className="text-xs font-bold text-zinc-500 uppercase mb-1">Cliente</div>
                        <div className="font-bold">{debtForm.customerName}</div>
                      </div>
                    )}
                    <div>
                      <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Saldo Devedor (KZ)</label>
                      <input 
                        type="number" 
                        value={debtForm.remainingAmount ?? 0} 
                        onChange={e => setDebtForm({...debtForm, remainingAmount: Number(e.target.value)})} 
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500" 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block">Data de Vencimento</label>
                      <input 
                        type="date" 
                        value={debtForm.dueDate || ''} 
                        onChange={e => setDebtForm({...debtForm, dueDate: e.target.value})} 
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500" 
                      />
                    </div>
                    <div className="flex gap-4 pt-4">
                      <button onClick={() => setIsDebtModalOpen(false)} className="flex-1 bg-zinc-100 py-4 rounded-2xl font-bold hover:bg-zinc-200 transition-all">Cancelar</button>
                      <button onClick={handleSaveDebt} className="flex-1 bg-orange-600 text-white py-4 rounded-2xl font-bold hover:bg-orange-700 transition-all">
                        {editingDebt ? 'Salvar Alterações' : 'Adicionar Dívida'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Stock Modal */}
          <AnimatePresence>
            {isStockModalOpen && selectedStockItem && (
              <>
                <motion.div 
                  key="stock-overlay"
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }} 
                  onClick={() => setIsStockModalOpen(false)} 
                  className="fixed inset-0 bg-white/90 backdrop-blur-sm z-[100]" 
                />
                <motion.div 
                  key="stock-modal"
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.9 }} 
                  className="glass fixed inset-x-4 top-1/2 -translate-y-1/2 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md rounded-[40px] p-8 z-[101] bg-white border border-zinc-200"
                >
                  <h2 className="text-2xl font-bold mb-2">Ajustar Estoque</h2>
                  <p className="text-zinc-400 mb-6">{products.find(p => p.id === selectedStockItem.productId)?.name} - {selectedStockItem.variation.color} / {selectedStockItem.variation.size}</p>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block text-center">Cunene</label>
                        <input 
                          type="number" 
                          value={stockForm.Cunene} 
                          onChange={e => setStockForm({ ...stockForm, Cunene: Number(e.target.value) })} 
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-xl font-bold text-center focus:outline-none focus:border-orange-500" 
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block text-center">Huíla</label>
                        <input 
                          type="number" 
                          value={stockForm.Huíla} 
                          onChange={e => setStockForm({ ...stockForm, Huíla: Number(e.target.value) })} 
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-xl font-bold text-center focus:outline-none focus:border-orange-500" 
                        />
                      </div>
                    </div>
                    <div className="bg-zinc-50 p-4 rounded-xl text-center">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Acumulado</span>
                      <div className="text-2xl font-black text-orange-600">{(Number(stockForm.Cunene) + Number(stockForm.Huíla))} unidades</div>
                    </div>
                    <div className="flex gap-4 pt-4">
                      <button onClick={() => setIsStockModalOpen(false)} className="flex-1 bg-zinc-100 py-4 rounded-2xl font-bold hover:bg-zinc-200 transition-all">Cancelar</button>
                      <button onClick={handleUpdateStock} className="flex-1 bg-orange-600 text-white py-4 rounded-2xl font-bold hover:bg-orange-700 transition-all">Atualizar</button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Coupon Modal */}
          <AnimatePresence>
            {isCouponModalOpen && (
              <>
                <motion.div 
                  key="coupon-overlay"
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }} 
                  onClick={() => setIsCouponModalOpen(false)} 
                  className="fixed inset-0 bg-white/90 backdrop-blur-sm z-[100]" 
                />
                <motion.div 
                  key="coupon-modal"
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.9 }} 
                  className="glass fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-auto md:left-1/2 md:-translate-x-1/2 w-full max-w-md rounded-[40px] p-8 z-[101] max-h-[90vh] overflow-y-auto bg-white border border-zinc-200"
                >
                  <h2 className="text-2xl font-bold mb-6">{editingCoupon ? 'Editar Cupom' : 'Novo Cupom'}</h2>
                  <div className="space-y-6">
                    <div>
                      <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block tracking-widest">Código do Cupom</label>
                      <input 
                        type="text" 
                        placeholder="EX: PROMO20" 
                        value={couponForm.code} 
                        onChange={e => setCouponForm({...couponForm, code: e.target.value.toUpperCase()})} 
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-6 py-4 focus:outline-none focus:border-orange-500 font-mono font-bold uppercase" 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block tracking-widest">Tipo</label>
                        <select 
                          value={couponForm.type}
                          onChange={e => setCouponForm({...couponForm, type: e.target.value as 'percentage' | 'fixed'})}
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-4 focus:outline-none focus:border-orange-500 font-bold appearance-none"
                        >
                          <option value="percentage">Porcentagem (%)</option>
                          <option value="fixed">Valor Fixo (KZ)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block tracking-widest">Valor do Desconto</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            min="0"
                            value={couponForm.value} 
                            onChange={e => setCouponForm({...couponForm, value: Number(e.target.value)})} 
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-4 focus:outline-none focus:border-orange-500 font-bold" 
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-zinc-400">
                            {couponForm.type === 'percentage' ? '%' : 'KZ'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-zinc-500 uppercase mb-2 block tracking-widest">Produto Específico (Opcional)</label>
                      <select 
                        value={couponForm.productId || ''}
                        onChange={e => setCouponForm({...couponForm, productId: e.target.value})}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-4 focus:outline-none focus:border-orange-500 font-bold appearance-none"
                      >
                        <option value="">Aplicar em todo o Carrinho</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                      <span className="text-sm font-bold text-zinc-600 uppercase tracking-widest">Status do Cupom</span>
                      <button 
                        onClick={() => setCouponForm({...couponForm, active: !couponForm.active})}
                        className={cn(
                          "relative w-14 h-8 rounded-full transition-all duration-300",
                          couponForm.active ? "bg-emerald-500" : "bg-zinc-300"
                        )}
                      >
                        <div className={cn(
                          "absolute w-6 h-6 bg-white rounded-full top-1 transition-all duration-300",
                          couponForm.active ? "right-1" : "left-1"
                        )} />
                      </button>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button onClick={() => setIsCouponModalOpen(false)} className="flex-1 bg-zinc-100 py-4 rounded-2xl font-bold hover:bg-zinc-200 transition-all">Cancelar</button>
                      <button 
                        onClick={handleSaveCoupon}
                        disabled={!couponForm.code || couponForm.value <= 0}
                        className="flex-1 bg-orange-600 text-white py-4 rounded-2xl font-bold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 shadow-xl shadow-orange-600/20"
                      >
                        Salvar Cupom
                      </button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;
