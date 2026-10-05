import { Stock } from '../types';

/**
 * Retorna o estoque real disponível de uma variação específica.
 * Respeita estritamente as quantidades por província (Huíla e Cunene) ou o campo quantity legado.
 */
export function getVariationStock(stockItem?: Stock | null, province?: string): number {
  if (!stockItem) return 0;

  // Se possui estrutura por província
  if (stockItem.quantitiesByProvince && typeof stockItem.quantitiesByProvince === 'object') {
    const huila = Math.max(0, Math.floor(Number(stockItem.quantitiesByProvince['Huíla']) || 0));
    const cunene = Math.max(0, Math.floor(Number(stockItem.quantitiesByProvince['Cunene']) || 0));

    if (province === 'Huíla') return huila;
    if (province === 'Cunene') return cunene;

    // Se nenhuma província foi especificada, o estoque total disponível é a soma real das províncias
    return huila + cunene;
  }

  // Caso legado sem quantitiesByProvince
  return Math.max(0, Math.floor(Number(stockItem.quantity) || 0));
}

/**
 * Retorna o estoque total real de um produto (somando todas as suas variações de cor e tamanho).
 */
export function getProductStock(productId: string, stockList: Stock[] = [], province?: string): number {
  if (!productId || !Array.isArray(stockList) || stockList.length === 0) return 0;

  const itemStocks = stockList.filter(s => s && s.productId === productId);
  if (itemStocks.length === 0) return 0;

  return itemStocks.reduce((sum, item) => sum + getVariationStock(item, province), 0);
}

/**
 * Verifica se o produto tem ao menos 1 unidade em estoque na província selecionada (ou geral).
 */
export function isProductInStock(productId: string, stockList: Stock[] = [], province?: string): boolean {
  return getProductStock(productId, stockList, province) > 0;
}

/**
 * Retorna resumo formatado de estoque para uma variação.
 */
export function getVariationStockDetails(stockItem?: Stock | null): { total: number; huila: number; cunene: number } {
  if (!stockItem) return { total: 0, huila: 0, cunene: 0 };
  const huila = getVariationStock(stockItem, 'Huíla');
  const cunene = getVariationStock(stockItem, 'Cunene');
  const total = huila + cunene > 0 ? (huila + cunene) : getVariationStock(stockItem);
  return { total, huila, cunene };
}
