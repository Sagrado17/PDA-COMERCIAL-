import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Search, Plus, Edit, Trash2, Package, AlertTriangle } from 'lucide-react';
import { Product } from '../../../types';
import { cn } from '../../../lib/utils';
import { SafeImage } from '../../SafeImage';

interface InventoryTabProps {
 products: Product[];
 groupedStock: { groups:{[key:string]:any[]}; sortedCategories:string[] };
 selectedInventoryCategory:string;
 setSelectedInventoryCategory:(cat:string)=>void;
 setEditingProduct:(product:Product|null)=>void;
 setProductForm:(form:any)=>void;
 setIsProductModalOpen:(open:boolean)=>void;
 handleDeleteProduct:(id:string)=>void;
 setSelectedStockItem:(item:any)=>void;
 setStockForm:(form:any)=>void;
 setIsStockModalOpen:(open:boolean)=>void;
}
const money=(n:number)=>`KZ ${Math.round(n||0).toLocaleString('pt-AO')}`;

export const InventoryTab:React.FC<InventoryTabProps>=({products,groupedStock,selectedInventoryCategory,setSelectedInventoryCategory,setEditingProduct,setProductForm,setIsProductModalOpen,handleDeleteProduct,setSelectedStockItem,setStockForm,setIsStockModalOpen})=>{
 const [filterText,setFilterText]=useState('');
 const items=useMemo(()=>groupedStock.sortedCategories.filter(cat=>selectedInventoryCategory==='all'||selectedInventoryCategory===cat).flatMap(cat=>groupedStock.groups[cat]||[]).filter(item=>!filterText||`${item.productName} ${item.variation?.color} ${item.variation?.size}`.toLowerCase().includes(filterText.toLowerCase())),[groupedStock,selectedInventoryCategory,filterText]);
 const total=items.length, low=items.filter(i=>i.quantity>0&&i.quantity<5).length, empty=items.filter(i=>i.quantity<=0).length;
 const openProduct=(product:Product|null)=>{setEditingProduct(product);setProductForm(product?{name:product.name||'',description:product.description||'',price:product.price||0,category:product.category||'',images:product.images||[''],attributes:product.attributes||{colors:[''],sizes:['S','M','L']},colorImages:product.colorImages||{},isFeatured:product.isFeatured||false}:{name:'',description:'',price:0,category:'',images:[''],attributes:{colors:[''],sizes:['S','M','L']},colorImages:{},isFeatured:false});setIsProductModalOpen(true)};
 return <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="space-y-6">
  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-orange-600">Produtos</p><h2 className="text-2xl md:text-3xl font-black">Estoque</h2><p className="text-sm text-zinc-500 mt-1">Produtos com imagem, quantidade, alerta e pesquisa.</p></div><button onClick={()=>openProduct(null)} className="px-4 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold flex items-center gap-2"><Plus className="w-4 h-4"/> Adicionar produto</button></div>
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[['Produtos',products.length,'#','text-blue-600'],['Itens visíveis',total,'◎','text-zinc-700'],['Stock baixo',low,'!','text-orange-600'],['Esgotados',empty,'×','text-red-600']].map(([l,v,i,c])=><div key={l} className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm"><div className={`w-9 h-9 rounded-xl bg-zinc-50 grid place-items-center font-black ${c}`}>{i}</div><b className="block mt-4 text-xl">{v}</b><span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">{l}</span></div>)}</div>
  <div className="flex flex-col md:flex-row gap-3"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400"/><input value={filterText} onChange={e=>setFilterText(e.target.value)} placeholder="Pesquisar produto, cor ou tamanho..." className="w-full h-11 pl-10 pr-4 rounded-xl bg-white border border-zinc-200 outline-none focus:border-orange-400 text-sm"/></div><div className="flex gap-2 overflow-x-auto">{['all',...groupedStock.sortedCategories].map(cat=><button key={cat} onClick={()=>setSelectedInventoryCategory(cat)} className={cn("px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap",selectedInventoryCategory===cat?"bg-[#062b5c] text-white":"bg-white border border-zinc-200 text-zinc-600")}>{cat==='all'?'Todos':cat}</button>)}</div></div>
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">{items.map(item=>{const product=products.find(p=>p.id===item.productId);const image=product?.images?.[0];const status=item.quantity<=0?'Esgotado':item.quantity<5?'Stock baixo':'Em stock';return <article key={item.id||`${item.productId}-${item.variation?.color}-${item.variation?.size}`} className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden group"><div className="h-44 bg-zinc-100 overflow-hidden relative">{image?<SafeImage src={image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>:<div className="w-full h-full grid place-items-center text-5xl">📦</div>}<span className={`absolute top-3 left-3 text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg ${item.quantity<=0?'bg-red-600 text-white':item.quantity<5?'bg-orange-600 text-white':'bg-white/90 text-emerald-700'}`}>{status}</span></div><div className="p-4"><div className="flex justify-between gap-2"><div className="min-w-0"><h3 className="font-black truncate">{item.productName}</h3><p className="text-[11px] text-zinc-500 mt-1">{item.category} · {item.variation?.color} · {item.variation?.size}</p></div><span className="font-black text-sm">{money(product?.price||0)}</span></div><div className="mt-4 flex items-end justify-between"><div><span className="text-[10px] uppercase font-bold text-zinc-400">Quantidade</span><div className="text-2xl font-black">{item.quantity}</div></div><div className="flex gap-1"><button onClick={()=>openProduct(product||null)} className="p-2 rounded-xl bg-zinc-50 text-zinc-600 hover:text-orange-600"><Edit className="w-4 h-4"/></button><button onClick={()=>product&&handleDeleteProduct(product.id)} className="p-2 rounded-xl bg-red-50 text-red-600"><Trash2 className="w-4 h-4"/></button><button onClick={()=>{setSelectedStockItem(item);setStockForm({Cunene:item.quantitiesByProvince?.Cunene||0,Huíla:item.quantitiesByProvince?.Huíla||0});setIsStockModalOpen(true)}} className="p-2 rounded-xl bg-orange-50 text-orange-600"><Package className="w-4 h-4"/></button></div></div></div></article>})}</div>
  {!items.length&&<div className="bg-white rounded-3xl border border-zinc-200 p-12 text-center text-sm text-zinc-400"><AlertTriangle className="w-8 h-8 mx-auto mb-3"/ >Nenhum produto encontrado.</div>}
 </motion.div>
};
export default InventoryTab;
