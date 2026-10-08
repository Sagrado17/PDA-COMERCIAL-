import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  doc, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  onSnapshot
} from 'firebase/firestore';
import { signOut, User as FirebaseUser } from 'firebase/auth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Clock, 
  Users, 
  DollarSign, 
  Settings, 
  Menu, 
  X, 
  Bell, 
  Check, 
  CheckCircle2, 
  ArrowLeft,
  UploadCloud,
  Tag
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
  DiscountSettings
} from '../types';
import { getVariationStockDetails } from '../lib/stockUtils';
import { SafeImage } from './SafeImage';
import TabLoadingSkeleton from './admin/TabLoadingSkeleton';

// Lazy load each section on demand to keep the dashboard ultra lightweight
const DashboardTab = React.lazy(() => import('./admin/tabs/DashboardTab'));
const InventoryTab = React.lazy(() => import('./admin/tabs/InventoryTab'));
const SalesTab = React.lazy(() => import('./admin/tabs/SalesTab'));
const ReservationsTab = React.lazy(() => import('./admin/tabs/ReservationsTab'));
const CustomersTab = React.lazy(() => import('./admin/tabs/CustomersTab'));
const CouponsTab = React.lazy(() => import('./admin/tabs/CouponsTab'));
const FinanceTab = React.lazy(() => import('./admin/tabs/FinanceTab'));
const SettingsTab = React.lazy(() => import('./admin/tabs/SettingsTab'));
const GoogleDriveModal = React.lazy(() => import('./admin/GoogleDriveModal'));

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
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
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
      const reservation = sales.find(s => s.id === id);
      if (!reservation) return;

      const updateData: any = { 
        status,
        paidAt: status === 'paid' ? new Date().toISOString() : null
      };

      if (status === 'paid') {
        updateData.type = 'sale';
        updateData.paidAmount = reservation.totalAmount;

        const province = reservation.customerProvince || 'Huíla';
        for (const item of reservation.items) {
          const stockItem = stock.find(s => 
            s.productId === item.productId && 
            s.variation.color === item.variation.color && 
            s.variation.size === item.variation.size
          );

          if (stockItem) {
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

  // Dynamic on-demand PDF export (avoids bundling jsPDF in main thread)
  const exportToPDF = async (type: 'sales' | 'debts') => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
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
    } catch (pdfErr) {
      console.error('Erro ao gerar PDF:', pdfErr);
      alert('Falha ao exportar PDF. Tente novamente.');
    }
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
        await updateDoc(doc(db, 'sales', sale.id), {
          archived: true
        });
      }
      alert(`Todas as vendas de ${monthName} foram arquivadas.`);
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
    <div className="pda-admin-theme flex min-h-screen bg-zinc-50 text-zinc-900">
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
        "fixed inset-y-0 left-0 z-50 w-64 border-r border-white/10 h-screen flex flex-col p-6 bg-[#031d40] text-white transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
        !isSidebarOpen && "-translate-x-full"
      )}>
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-2">
            <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-lg border border-white/15 bg-white p-1">
              <SafeImage 
                src={(settings.logoUrl && settings.logoUrl !== '/pda-logo.svg') ? settings.logoUrl : '/icon-512.png'} 
                className="w-full h-full object-contain bg-white" 
                alt="PDA Comercial"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-lg font-bold tracking-tight uppercase text-white leading-tight">
                {settings.storeName.split(' ').map((word, i) => (
                  <span key={i} className={i === settings.storeName.split(' ').length - 1 ? "text-primary" : ""}>
                    {word}{' '}
                  </span>
                ))}
              </span>
              <span className="text-[9px] text-white/55 font-medium">{settings.storeDescription}</span>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-white/10 rounded-lg text-white">
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
                  "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer",
                  adminTab === item.id 
                    ? "bg-[#ff6900] text-white shadow-lg shadow-orange-950/25" 
                    : shouldBlink
                      ? "bg-amber-50 text-amber-900 border border-amber-300 shadow-sm animate-blink"
                      : "text-white/65 hover:text-white hover:bg-white/10"
                )}
                style={adminTab === item.id ? { boxShadow: `0 10px 15px -3px ${settings.primaryColor}33` } : {}}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={cn("w-5 h-5", shouldBlink && "text-amber-600 animate-pulse")} />
                  <span className={cn(shouldBlink && "font-bold text-amber-800 animate-pulse")}>{item.label}</span>
                </div>
                {shouldBlink && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <span className="text-[10px] font-black bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                      {pendingReservationsCount}
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="pt-6 border-t border-white/10">
          <div 
            onClick={() => {
              if (window.confirm('Deseja encerrar a sessão?')) {
                signOut(auth);
              }
            }}
            className="flex items-center gap-3 mb-4 cursor-pointer hover:bg-zinc-50 p-2 rounded-2xl transition-all active:scale-95 group"
          >
            <div className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white font-bold group-hover:bg-red-500/15 group-hover:text-red-300 transition-colors">
              P
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-red-300 transition-colors">PDA Admin</div>
              <div className="text-[10px] text-white/50">Terminar Sessão</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-10 space-y-8 max-w-7xl mx-auto w-full">
          {/* Header */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center justify-between w-full md:w-auto">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="lg:hidden p-2.5 bg-white border border-zinc-200 rounded-2xl shadow-sm hover:bg-zinc-50 active:scale-95 transition-all"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-2xl md:text-3xl font-black text-zinc-900 tracking-tight">
                    {adminTab === 'dashboard' && 'Visão Geral'}
                    {adminTab === 'inventory' && 'Gestão de Estoque & Produtos'}
                    {adminTab === 'sales' && 'Controle de Vendas'}
                    {adminTab === 'reservations' && 'Gestão de Reservas'}
                    {adminTab === 'customers' && 'Base de Clientes'}
                    {adminTab === 'coupons' && 'Gestão de Cupons e Descontos'}
                    {adminTab === 'finance' && 'Financeiro & Dívidas'}
                    {adminTab === 'settings' && 'Definições do Site'}
                  </h1>
                  <p className="text-zinc-500 text-xs md:text-sm">Painel leve com carregamento sob demanda.</p>
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
                className="glass px-5 md:px-6 py-2.5 md:py-3 rounded-2xl text-xs md:text-sm font-bold flex items-center gap-2 hover:bg-zinc-100 transition-all w-full md:w-auto justify-center bg-white border border-zinc-200 shadow-sm cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para Loja
              </button>
            </div>
          </header>

          {/* Notifications Dropdown */}
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
                          className="text-[10px] font-bold uppercase tracking-wider text-orange-600 hover:text-orange-700 bg-orange-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
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
                          Todas as notificações foram lidas.
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
                      className="w-full py-2 bg-zinc-50 hover:bg-zinc-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-700 transition-colors text-center cursor-pointer"
                    >
                      Ir para Gestão de Reservas
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Admin Tabs Content - All rendered on demand with Suspense */}
          <AnimatePresence mode="wait">
            {adminTab === 'dashboard' && (
              <Suspense fallback={<TabLoadingSkeleton label="o Dashboard" />}>
                <DashboardTab 
                  sales={sales}
                  stock={stock}
                  products={products}
                  customers={customers}
                  debts={debts}
                  stats={stats}
                  settings={settings}
                />
              </Suspense>
            )}

            {adminTab === 'inventory' && (
              <Suspense fallback={<TabLoadingSkeleton label="o Estoque e Produtos" />}>
                <InventoryTab 
                  products={products}
                  groupedStock={groupedStock}
                  selectedInventoryCategory={selectedInventoryCategory}
                  setSelectedInventoryCategory={setSelectedInventoryCategory}
                  setEditingProduct={setEditingProduct}
                  setProductForm={setProductForm}
                  setIsProductModalOpen={setIsProductModalOpen}
                  handleDeleteProduct={handleDeleteProduct}
                  setSelectedStockItem={setSelectedStockItem}
                  setStockForm={setStockForm}
                  setIsStockModalOpen={setIsStockModalOpen}
                />
              </Suspense>
            )}

            {adminTab === 'sales' && (
              <Suspense fallback={<TabLoadingSkeleton label="o Histórico de Vendas" />}>
                <SalesTab 
                  sales={sales}
                  selectedMonth={selectedMonth}
                  setSelectedMonth={setSelectedMonth}
                  showArchived={showArchived}
                  setShowArchived={setShowArchived}
                  exportToPDF={exportToPDF}
                  handleArchiveMonth={handleArchiveMonth}
                />
              </Suspense>
            )}

            {adminTab === 'reservations' && (
              <Suspense fallback={<TabLoadingSkeleton label="as Reservas" />}>
                <ReservationsTab 
                  sales={sales}
                  handleClearAllCancelledReservations={handleClearAllCancelledReservations}
                  handleUpdateReservationStatus={handleUpdateReservationStatus}
                  handleDeleteCancelledReservation={handleDeleteCancelledReservation}
                />
              </Suspense>
            )}

            {adminTab === 'customers' && (
              <Suspense fallback={<TabLoadingSkeleton label="a Base de Clientes" />}>
                <CustomersTab 
                  customers={customers}
                />
              </Suspense>
            )}

            {adminTab === 'coupons' && (
              <Suspense fallback={<TabLoadingSkeleton label="os Cupons e Promoções" />}>
                <CouponsTab 
                  coupons={coupons}
                  products={products}
                  discountSettingsForm={discountSettingsForm}
                  setDiscountSettingsForm={setDiscountSettingsForm}
                  isSavingDiscount={isSavingDiscount}
                  handleSaveDiscountSettings={handleSaveDiscountSettings}
                  handleToggleAllDiscountProducts={handleToggleAllDiscountProducts}
                  handleToggleSingleDiscountProduct={handleToggleSingleDiscountProduct}
                  discountProductFilter={discountProductFilter}
                  setDiscountProductFilter={setDiscountProductFilter}
                  setEditingCoupon={setEditingCoupon}
                  setCouponForm={setCouponForm}
                  setIsCouponModalOpen={setIsCouponModalOpen}
                  handleDeleteCoupon={handleDeleteCoupon}
                />
              </Suspense>
            )}

            {adminTab === 'finance' && (
              <Suspense fallback={<TabLoadingSkeleton label="o Financeiro e Dívidas" />}>
                <FinanceTab 
                  debts={debts}
                  sales={sales}
                  customers={customers}
                  exportToPDF={exportToPDF}
                  setEditingDebt={setEditingDebt}
                  setDebtForm={setDebtForm}
                  setIsDebtModalOpen={setIsDebtModalOpen}
                  handleDeleteDebt={handleDeleteDebt}
                />
              </Suspense>
            )}

            {adminTab === 'settings' && (
              <Suspense fallback={<TabLoadingSkeleton label="as Definições da Loja" />}>
                <SettingsTab 
                  settingsForm={settingsForm}
                  setSettingsForm={setSettingsForm}
                  products={products}
                  handleSaveSettings={handleSaveSettings}
                />
              </Suspense>
            )}
          </AnimatePresence>

          {/* Product Modal with Integrated Google Drive on demand */}
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

                    {/* Product Images with Google Drive Button */}
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <label className="text-xs font-bold text-zinc-700 uppercase tracking-wide block">
                          Imagens do Produto
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsDriveModalOpen(true)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
                          title="Enviar ou selecionar fotos diretamente no Google Drive"
                        >
                          <svg className="w-4 h-4 shrink-0" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                            <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                            <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
                            <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                            <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                            <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                            <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                          </svg>
                          <span>+ Adicionar imagem (Google Drive)</span>
                        </button>
                      </div>

                      {/* Thumbnails Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                        {productForm.images.filter(img => img.trim() !== '').map((img, idx) => (
                          <div key={`${img}-${idx}`} className="relative aspect-square rounded-2xl overflow-hidden border border-zinc-200 bg-white group shadow-xs">
                            <SafeImage src={img} alt="" className="w-full h-full object-contain p-1" />
                            <button 
                              type="button"
                              onClick={() => setProductForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))}
                              className="absolute top-1.5 right-1.5 p-1 bg-red-600/90 text-white rounded-full hover:bg-red-700 transition-colors shadow-sm cursor-pointer"
                              title="Remover foto"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                            <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                              #{idx + 1}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-1">
                        <input 
                          type="text" 
                          placeholder="Ou digite URLs manuais separadas por vírgula..." 
                          value={productForm.images.join(', ')} 
                          onChange={e => setProductForm({...productForm, images: e.target.value.split(',').map(s => s.trim())})} 
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-orange-500 font-mono" 
                        />
                        <p className="text-[10px] text-zinc-400">
                          Use o botão azul do Google Drive acima para carregar fotos do telemóvel ou PC com 1 clique!
                        </p>
                      </div>
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
                                        Foto #{idx + 1}
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
                        type="button"
                        onClick={() => setProductForm({...productForm, isFeatured: !productForm.isFeatured})}
                        className={cn(
                          "relative w-12 h-6 rounded-full transition-all duration-300 cursor-pointer",
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
                      <button onClick={() => setIsProductModalOpen(false)} className="flex-1 bg-zinc-100 py-4 rounded-2xl font-bold hover:bg-zinc-200 transition-all cursor-pointer">Cancelar</button>
                      <button onClick={handleSaveProduct} className="flex-1 bg-orange-600 text-white py-4 rounded-2xl font-bold hover:bg-orange-700 transition-all cursor-pointer">Salvar Produto</button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Google Drive Modal (loaded on demand) */}
          {isDriveModalOpen && (
            <Suspense fallback={null}>
              <GoogleDriveModal 
                isOpen={isDriveModalOpen}
                onClose={() => setIsDriveModalOpen(false)}
                productId={editingProduct?.id}
                productName={productForm.name || editingProduct?.name}
                onImagesSelected={(newUrls) => {
                  setProductForm(prev => {
                    const currentClean = prev.images.filter(x => x.trim() !== '');
                    return {
                      ...prev,
                      images: [...currentClean, ...newUrls]
                    };
                  });
                }}
              />
            </Suspense>
          )}

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
                      <button onClick={() => setIsDebtModalOpen(false)} className="flex-1 bg-zinc-100 py-4 rounded-2xl font-bold hover:bg-zinc-200 transition-all cursor-pointer">Cancelar</button>
                      <button onClick={handleSaveDebt} className="flex-1 bg-orange-600 text-white py-4 rounded-2xl font-bold hover:bg-orange-700 transition-all cursor-pointer">
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
                      <button onClick={() => setIsStockModalOpen(false)} className="flex-1 bg-zinc-100 py-4 rounded-2xl font-bold hover:bg-zinc-200 transition-all cursor-pointer">Cancelar</button>
                      <button onClick={handleUpdateStock} className="flex-1 bg-orange-600 text-white py-4 rounded-2xl font-bold hover:bg-orange-700 transition-all cursor-pointer">Atualizar</button>
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
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-4 focus:outline-none focus:border-orange-500 font-bold appearance-none cursor-pointer"
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
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-4 focus:outline-none focus:border-orange-500 font-bold appearance-none cursor-pointer"
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
                        type="button"
                        onClick={() => setCouponForm({...couponForm, active: !couponForm.active})}
                        className={cn(
                          "relative w-14 h-8 rounded-full transition-all duration-300 cursor-pointer",
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
                      <button onClick={() => setIsCouponModalOpen(false)} className="flex-1 bg-zinc-100 py-4 rounded-2xl font-bold hover:bg-zinc-200 transition-all cursor-pointer">Cancelar</button>
                      <button 
                        onClick={handleSaveCoupon}
                        disabled={!couponForm.code || couponForm.value <= 0}
                        className="flex-1 bg-orange-600 text-white py-4 rounded-2xl font-bold transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 shadow-xl shadow-orange-600/20 cursor-pointer"
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
