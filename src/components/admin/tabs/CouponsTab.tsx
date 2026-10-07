import React from 'react';
import { motion } from 'motion/react';
import { 
  Percent, 
  Check, 
  CheckSquare, 
  Square, 
  Search, 
  Save, 
  Plus, 
  Edit, 
  Trash2 
} from 'lucide-react';
import { Product, Coupon, DiscountSettings } from '../../../types';
import { SafeImage } from '../../SafeImage';
import { cn } from '../../../lib/utils';

interface CouponsTabProps {
  coupons: Coupon[];
  products: Product[];
  discountSettingsForm: DiscountSettings;
  setDiscountSettingsForm: React.Dispatch<React.SetStateAction<DiscountSettings>>;
  isSavingDiscount: boolean;
  handleSaveDiscountSettings: () => void;
  handleToggleAllDiscountProducts: () => void;
  handleToggleSingleDiscountProduct: (productId: string) => void;
  discountProductFilter: string;
  setDiscountProductFilter: (filter: string) => void;
  setEditingCoupon: (coupon: Coupon | null) => void;
  setCouponForm: (form: any) => void;
  setIsCouponModalOpen: (open: boolean) => void;
  handleDeleteCoupon: (id: string) => void;
}

export const CouponsTab: React.FC<CouponsTabProps> = ({
  coupons,
  products,
  discountSettingsForm,
  setDiscountSettingsForm,
  isSavingDiscount,
  handleSaveDiscountSettings,
  handleToggleAllDiscountProducts,
  handleToggleSingleDiscountProduct,
  discountProductFilter,
  setDiscountProductFilter,
  setEditingCoupon,
  setCouponForm,
  setIsCouponModalOpen,
  handleDeleteCoupon,
}) => {
  return (
    <motion.div 
      key="coupons"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      {/* 1. GESTÃO DE % DE DESCONTO */}
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

      {/* 2. GESTÃO DE CUPONS DE DESCONTO */}
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
  );
};
export default CouponsTab;
