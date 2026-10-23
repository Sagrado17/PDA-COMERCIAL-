/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { ChevronRight, ChevronLeft, Star, ShoppingCart, Share2, Check, X, MessageSquare, Phone } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { getVariationStock } from '../../lib/stockUtils';
import { cn } from '../../lib/utils';
import { SafeImage, safeFormatDate } from '../SafeImage';
import { CommentSkeleton } from '../Skeleton';
import { Product, Stock, Comment, Rating, CartItem, DiscountSettings } from '../../types';
import { StarRating } from './StarRating';
import { openOrderOnWhatsApp } from './whatsapp';

export const ProductModal = React.memo(({ 
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
  discountSettings,
  whatsappNumber
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
  whatsappNumber?: string;
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

  // Distingue uma mudança manual de cor de uma mudança de tamanho/província.
  // Cor escolhida manualmente sem stock: mantém a escolha e mostra o aviso vermelho.
  // Ao mudar tamanho/província, procura automaticamente uma combinação disponível.
  const previousSelectionRef = useRef<{ color: string; size: string; province: string } | null>(null);

  useEffect(() => {
    const previous = previousSelectionRef.current;
    previousSelectionRef.current = { color: selectedColor, size: selectedSize, province: selectedProvince };

    if (!stock.length) return;
    const colorChangedOnly = previous &&
      previous.color !== selectedColor &&
      previous.size === selectedSize &&
      previous.province === selectedProvince;
    if (colorChangedOnly) return;
    if (!isOutOfStock) return;

    const productVariations = stock.filter(item => item.productId === product.id);
    const availableVariations = productVariations.filter(item =>
      getVariationStock(item, selectedProvince) > 0
    );

    if (!availableVariations.length) return;

    // Primeiro tenta manter o tamanho escolhido e encontrar outra cor disponível.
    const sameSizeAvailable = availableVariations.find(item =>
      item.variation.size === selectedSize
    );
    const nextVariation = sameSizeAvailable || availableVariations[0];

    if (nextVariation.variation.color !== selectedColor) {
      setSelectedColor(nextVariation.variation.color);
    }
    if (nextVariation.variation.size !== selectedSize) {
      setSelectedSize(nextVariation.variation.size);
    }
    setQuantity(1);
  }, [stock, product.id, selectedProvince, isOutOfStock, selectedColor, selectedSize]);

  const ratingBreakdown = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    ratings.forEach(r => {
      if (r.value >= 1 && r.value <= 5) {
        counts[Math.floor(r.value) - 1]++;
      }
    });
    return counts.reverse(); // 5 to 1
  }, [ratings]);

  const oldPrice = Math.round(product.price / (1 - (discountPercentage / 100)));
  const savedAmount = Math.max(0, oldPrice - product.price);

  const buildCartItem = (): CartItem => ({
    productId: product.id,
    productName: product.name,
    variation: { color: selectedColor, size: selectedSize },
    quantity,
    price: product.price,
    image: (product.colorImages && product.colorImages[selectedColor]) || product.images[0]
  });

  const handleAddToCart = () => {
    onAddToCart(buildCartItem());
    setIsJustAdded(true);
    setTimeout(() => setIsJustAdded(false), 1400);
  };

  const handleBuyNow = () => {
    const itemData = buildCartItem();
    if (onBuyNow) {
      onBuyNow(itemData);
    } else {
      onAddToCart(itemData);
      onClose();
    }
  };

  const provinceStockList = [
    { label: 'no Cunene', qty: cuneneStock },
    { label: 'na Huíla', qty: huilaStock }
  ];

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
        className="w-full max-w-[700px] h-full sm:h-[92vh] max-h-full sm:max-h-[92vh] bg-white sm:rounded-[32px] overflow-hidden relative z-10 pointer-events-auto shadow-2xl flex flex-col"
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
          <div className="product-photo relative w-full h-full flex items-center justify-center overflow-hidden bg-white p-0 m-0">
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
            <span className="price" style={{ color: priceColor || '#ff6900' }}>
              KZ {product.price.toLocaleString('pt-AO')}
            </span>
            {hasDiscount && (
              <>
                <span className="old-price">
                  KZ {oldPrice.toLocaleString('pt-AO')}
                </span>
                <span className="pm-save">
                  Poupas KZ {savedAmount.toLocaleString('pt-AO')}
                </span>
              </>
            )}
          </div>

          {/* SEPARADORES: DESCRIÇÃO | AVALIAÇÕES */}
          <div className="pm-tabs" role="tablist" aria-label="Informação do produto">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'details'}
              onClick={() => setActiveTab('details')}
              className={cn("pm-tab", activeTab === 'details' && "active")}
            >
              Descrição
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'comments'}
              onClick={() => setActiveTab('comments')}
              className={cn("pm-tab", activeTab === 'comments' && "active")}
            >
              Avaliações
              <span className="pm-tab-count">{isLoadingFeedback ? '...' : comments.length}</span>
            </button>
          </div>

          {activeTab === 'details' ? (
            <>
              {/* DESCRIÇÃO + ESTOQUE POR PROVÍNCIA + PAGAMENTO NA ENTREGA */}
              <section className="pm-info">
                <p className="description">
                  {product.description || 'Produto de alta qualidade PDA Comercial, garantindo conforto, durabilidade e excelente acabamento para o seu dia a dia.'}
                </p>

                <ul className="pm-stock-list">
                  {provinceStockList.map(item => (
                    <li key={item.label} className={cn(item.qty <= 0 && "out")}>
                      <span className="pm-check">
                        {item.qty > 0 ? <Check className="w-3.5 h-3.5" strokeWidth={3.5} /> : <X className="w-3.5 h-3.5" strokeWidth={3.5} />}
                      </span>
                      <span>
                        {item.qty > 0
                          ? `${item.qty} ${item.qty === 1 ? 'unidade' : 'unidades'} ${item.label}`
                          : `Esgotado ${item.label}`}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="pm-cod">
                  <span>Clique em comprar e só pague na entrega!</span>
                  <span aria-hidden="true">💰</span>
                </div>
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
                            "option !h-auto !min-h-[76px] !px-2 !py-2 flex flex-col items-center justify-center gap-1.5",
                            selectedColor === color && "active",
                            isUnavailable && "opacity-45 text-zinc-400"
                          )}
                          title={isUnavailable ? `Sem estoque disponível neste tamanho (${colorQty} disp.)` : `${colorQty} unidades disponíveis`}
                          aria-label={`Selecionar cor ${color}`}
                        >
                          <span className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-50 border border-zinc-200 flex items-center justify-center shrink-0">
                            <SafeImage
                              src={(product.colorImages && product.colorImages[color]) || product.images[0] || ''}
                              alt={`Foto ${color} - ${product.name}`}
                              className="w-full h-full object-contain"
                            />
                          </span>
                          <span className="text-[11px] font-bold leading-none truncate max-w-[72px]">{color}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* QUANTIDADE */}
              <section className="detail-section">
                <div className="pm-qty-row">
                  <div className="pm-qty-label">
                    <span className="quantity-label">Quantidade</span>
                    {variationStock > 0 ? (
                      <span className="pm-stock-chip ok">
                        {variationStock} un. em estoque {selectedProvince ? `na ${selectedProvince}` : ''}
                      </span>
                    ) : (
                      <span className="pm-stock-chip out">
                        Esgotado {selectedProvince ? `na ${selectedProvince}` : ''}
                      </span>
                    )}
                  </div>
                  <div className="quantity">
                    <button
                      type="button"
                      id="minus"
                      aria-label="Diminuir quantidade"
                      disabled={quantity <= 1}
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      −
                    </button>
                    <span id="quantity">{quantity}</span>
                    <button
                      type="button"
                      id="plus"
                      aria-label="Aumentar quantidade"
                      disabled={isOutOfStock || quantity >= variationStock}
                      onClick={() => setQuantity(Math.min(Math.max(1, variationStock), quantity + 1))}
                    >
                      +
                    </button>
                  </div>
                </div>
              </section>

              {isOutOfStock && (
                <div className="mt-3 p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold text-center">
                  ⚠️ Esta variação está esgotada no momento. Experimente selecionar outra cor ou tamanho.
                </div>
              )}

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

        {/* BARRA FIXA: SUBTOTAL + CARRINHO + COMPRAR */}
        {activeTab === 'details' && (
          <footer className="pm-footer">
            <div className="pm-subtotal">
              <span>Subtotal:</span>
              <strong>KZ {(product.price * quantity).toLocaleString('pt-AO')}</strong>
            </div>
            <div className="pm-actions">
              {isOutOfStock ? (
                <button
                  type="button"
                  className="pm-buy"
                  onClick={() => openOrderOnWhatsApp(whatsappNumber, product, { color: selectedColor, size: selectedSize, province: selectedProvince })}
                >
                  📦 Encomendar
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="pm-cart"
                    id="addCart"
                    aria-label={isJustAdded ? 'Adicionado ao carrinho' : 'Adicionar ao carrinho'}
                    onClick={handleAddToCart}
                  >
                    {isJustAdded ? <Check className="w-6 h-6" strokeWidth={3} /> : <ShoppingCart className="w-6 h-6" />}
                  </button>
                  <button
                    type="button"
                    className="pm-buy"
                    id="buyNow"
                    onClick={handleBuyNow}
                  >
                    Comprar
                  </button>
                </>
              )}
            </div>
          </footer>
        )}
      </motion.div>
    </motion.div>
  );
});
