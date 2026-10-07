import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Plus, Edit, Trash2, Settings2 } from 'lucide-react';
import { Product } from '../../../types';
import { cn } from '../../../lib/utils';

interface InventoryTabProps {
  products: Product[];
  groupedStock: {
    groups: { [key: string]: any[] };
    sortedCategories: string[];
  };
  selectedInventoryCategory: string;
  setSelectedInventoryCategory: (cat: string) => void;
  setEditingProduct: (product: Product | null) => void;
  setProductForm: (form: any) => void;
  setIsProductModalOpen: (open: boolean) => void;
  handleDeleteProduct: (id: string) => void;
  setSelectedStockItem: (item: any) => void;
  setStockForm: (form: any) => void;
  setIsStockModalOpen: (open: boolean) => void;
}

export const InventoryTab: React.FC<InventoryTabProps> = ({
  products,
  groupedStock,
  selectedInventoryCategory,
  setSelectedInventoryCategory,
  setEditingProduct,
  setProductForm,
  setIsProductModalOpen,
  handleDeleteProduct,
  setSelectedStockItem,
  setStockForm,
  setIsStockModalOpen,
}) => {
  const [filterText, setFilterText] = useState('');

  return (
    <motion.div 
      key="inventory"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center bg-zinc-100 p-6 rounded-3xl gap-4">
        <div className="flex gap-4">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Filtrar estoque..." 
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-orange-500" 
            />
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
          className="bg-orange-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-orange-700 transition-colors shadow-sm cursor-pointer"
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
            "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap cursor-pointer",
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
              "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap cursor-pointer",
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
                .map(category => {
                  const filteredItems = groupedStock.groups[category].filter(item => 
                    !filterText || 
                    item.productName.toLowerCase().includes(filterText.toLowerCase()) ||
                    item.variation.color.toLowerCase().includes(filterText.toLowerCase()) ||
                    item.variation.size.toLowerCase().includes(filterText.toLowerCase())
                  );

                  if (filteredItems.length === 0) return null;

                  return (
                    <React.Fragment key={category}>
                      {selectedInventoryCategory === 'all' && (
                        <tr className="bg-zinc-50/50">
                          <td colSpan={5} className="px-6 py-2 text-[10px] font-bold uppercase tracking-widest text-orange-600 bg-orange-50/30">
                            {category}
                          </td>
                        </tr>
                      )}
                      {filteredItems.map(item => {
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
                                    className="p-1 hover:bg-zinc-100 rounded text-zinc-500 hover:text-orange-600 cursor-pointer"
                                    title="Editar produto"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </button>
                                  <button 
                                    onClick={() => product && handleDeleteProduct(product.id)}
                                    className="p-1 hover:bg-zinc-100 rounded text-zinc-500 hover:text-red-400 cursor-pointer"
                                    title="Excluir produto"
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
                                <span className="text-[10px] font-bold uppercase bg-emerald-400/10 text-emerald-500 px-2 py-1 rounded-lg">Ok</span>
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
                                className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-orange-600 transition-all cursor-pointer"
                                title="Ajustar estoque"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
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
  );
};
export default InventoryTab;
