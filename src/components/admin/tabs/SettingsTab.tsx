import React from 'react';
import { motion } from 'motion/react';
import { 
  Package, 
  Edit, 
  Phone, 
  Mail, 
  Filter, 
  Layout, 
  RotateCcw, 
  Save, 
  Sparkles, 
  Plus, 
  Trash2, 
  Layers, 
  ImageIcon 
} from 'lucide-react';
import { SiteSettings, Product, BannerSlide } from '../../../types';
import { SafeImage } from '../../SafeImage';

interface SettingsTabProps {
  settingsForm: SiteSettings;
  setSettingsForm: React.Dispatch<React.SetStateAction<SiteSettings>>;
  products: Product[];
  handleSaveSettings: () => void;
  onOpenDriveForBanner?: (slideIndex: number) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settingsForm,
  setSettingsForm,
  products,
  handleSaveSettings,
}) => {
  return (
    <motion.div 
      key="settings"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-5"
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-5">
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

          <div className="space-y-5">
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

        {/* Cores */}
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
            {/* Cor do Preço */}
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

            {/* Cor do Cabeçalho */}
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
                  <span className="text-[10px] text-zinc-400">Barra superior com logótipo e busca</span>
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
          </div>
        </div>

        {/* Estilo & Tipografia */}
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

        {/* Carrossel de Destaques */}
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

          {/* Lista de Anúncios Adicionais */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-widest text-zinc-500">
                Banners Seguintes ({(settingsForm.bannerSlides || []).length} anúncios personalizados)
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
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">URL da Imagem no Destaque</label>
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

        {/* Anúncio Pop-up */}
        <div className="pt-10 border-t border-zinc-100">
          <h3 className="text-lg font-bold flex items-center gap-2 mb-8">
            <ImageIcon className="w-5 h-5 text-orange-500" />
            Anúncio Pop-up da Página Inicial
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="space-y-5">
              <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                <div>
                  <span className="text-sm font-bold text-zinc-700 block">Exibir Anúncio ao Entrar</span>
                  <span className="text-[10px] text-zinc-400">Mostrar modal promocional para os clientes</span>
                </div>
                <button 
                  type="button"
                  onClick={() => setSettingsForm({...settingsForm, isAdActive: !settingsForm.isAdActive})}
                  className={`relative w-12 h-6 rounded-full transition-all duration-300 cursor-pointer ${settingsForm.isAdActive ? 'bg-orange-600' : 'bg-zinc-200'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${settingsForm.isAdActive ? 'right-1' : 'left-1'}`} />
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 block">URL da Imagem do Anúncio</label>
                <input 
                  type="text" 
                  placeholder="https://exemplo.com/anuncio.jpg"
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

        {/* Zerar Métricas do Mês */}
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
                    className="bg-zinc-200 text-zinc-700 px-5 py-3 rounded-2xl font-bold hover:bg-zinc-300 transition-all text-xs cursor-pointer"
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
                  className="bg-orange-600 text-white px-5 py-3 rounded-2xl font-bold hover:bg-orange-700 transition-all flex items-center gap-2 text-xs shadow-md shadow-orange-600/10 cursor-pointer"
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
            className="bg-orange-600 text-white px-10 py-5 rounded-[24px] font-bold hover:bg-orange-700 transition-all shadow-xl shadow-orange-600/20 flex items-center gap-3 ml-auto cursor-pointer"
          >
            <Save className="w-5 h-5" />
            Salvar Todas as Definições
          </button>
        </div>
      </div>
    </motion.div>
  );
};
export default SettingsTab;
