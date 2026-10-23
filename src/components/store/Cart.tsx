/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, User, History, Trash2, MessageSquare, MessageCircle, Phone, Home, MapPin } from 'lucide-react';
import { getVariationStock } from '../../lib/stockUtils';
import { cn } from '../../lib/utils';
import { SafeImage } from '../SafeImage';
import { Stock, CartItem, Coupon } from '../../types';

export const Cart = React.memo(({ 
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
  onCheckout: (info: { name: string, phone: string, province: string, neighborhood?: string, address?: string, coupon?: Coupon, channel?: 'whatsapp' | 'sms', deliveryType?: 'pickup' | 'delivery' }) => void; 
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
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>('delivery');

  useEffect(() => {
    setCustomerInfo(prev => ({ ...prev, province: selectedProvince }));
  }, [selectedProvince]);

  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const isFreeDelivery = totalQuantity > 1;
  // Frete de 600 Kz só para entrega domiciliar com apenas 1 item.
  const shippingFee = deliveryType === 'delivery' && !isFreeDelivery ? 600 : 0;
  
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

  const finalTotal = total - discountAmount + shippingFee;

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

                {/* FORMA DE RECEÇÃO: VENHO BUSCAR / ENTREGA DOMICILIAR */}
                <div className="bg-white rounded-[22px] p-5 shadow-[0_8px_28px_rgba(5,34,70,.07)] border border-[#e6ebf1]/60">
                  <h2 className="text-[17px] font-extrabold text-[#132238] mb-3">Como quer receber?</h2>
                  <div className="flex flex-col gap-2.5">
                    <label className={cn("flex items-center gap-3 p-3.5 rounded-[16px] border cursor-pointer transition-all", deliveryType === 'pickup' ? "border-[#ff6900] bg-orange-50/40" : "border-[#e6ebf1] bg-white")}>
                      <input
                        type="checkbox"
                        checked={deliveryType === 'pickup'}
                        onChange={() => setDeliveryType('pickup')}
                        className="w-5 h-5 accent-[#ff6900] shrink-0"
                      />
                      <span className="flex flex-col">
                        <strong className="text-[15px] text-[#132238]">Venho buscar</strong>
                        <span className="text-xs text-[#738096] font-medium">Sem custo de entrega</span>
                      </span>
                    </label>
                    <label className={cn("flex items-center gap-3 p-3.5 rounded-[16px] border cursor-pointer transition-all", deliveryType === 'delivery' ? "border-[#ff6900] bg-orange-50/40" : "border-[#e6ebf1] bg-white")}>
                      <input
                        type="checkbox"
                        checked={deliveryType === 'delivery'}
                        onChange={() => setDeliveryType('delivery')}
                        className="w-5 h-5 accent-[#ff6900] shrink-0"
                      />
                      <span className="flex flex-col">
                        <strong className="text-[15px] text-[#132238]">Entrega domiciliar 🚚</strong>
                        <span className={cn("text-xs font-medium", isFreeDelivery ? "text-[#18a663]" : "text-[#738096]")}>
                          {isFreeDelivery ? 'Grátis (para mais de 1 item)' : 'Frete: 600 Kz (grátis com mais de 1 item)'}
                        </span>
                      </span>
                    </label>
                  </div>
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
                    <span>{deliveryType === 'pickup' ? 'Venho buscar' : 'Entrega domiciliar'}</span>
                    <span style={{ color: (deliveryType === 'pickup' || isFreeDelivery) ? 'var(--verde)' : '#132238', fontWeight: 'bold' }}>
                      {deliveryType === 'pickup'
                        ? 'Sem custo'
                        : (isFreeDelivery ? 'Grátis (para mais de 1 item)' : `${shippingFee.toLocaleString('pt-AO')} Kz`)}
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
                        Enviar Reserva por:
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
                          channel: selectedChannel,
                          deliveryType
                        });
                        setCustomerInfo({ name: '', phone: '', province: '', neighborhood: '', address: '' });
                        onProvinceChange('');
                        setSelectedChannel(null);
                        setDeliveryType('delivery');
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
                        <span>Enviar Reserva pelo WhatsApp</span>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-5 h-5" />
                        <span>Enviar Reserva por SMS</span>
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
