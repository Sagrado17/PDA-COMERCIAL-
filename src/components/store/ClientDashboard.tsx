/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2 } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { cn } from '../../lib/utils';
import { Product, Sale, CartItem, SiteSettings } from '../../types';

export const ClientDashboard = React.memo(({ 
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
