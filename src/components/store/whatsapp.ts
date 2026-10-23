/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product } from '../../types';

export const openOrderOnWhatsApp = (
  phone: string | undefined,
  product: Product,
  opts?: { color?: string; size?: string; province?: string }
) => {
  const target = (phone || '244935799097').replace(/\D/g, '');
  const details = [opts?.color, opts?.size].filter(Boolean).join(' / ');
  const text =
    `Olá! Gostaria de encomendar o produto esgotado:\n*${product.name}*` +
    (details ? ` (${details})` : '') +
    (opts?.province ? `\nProvíncia: ${opts.province}` : '') +
    `\nLink: ${window.location.origin}${window.location.pathname}?p=${product.id}`;
  window.open(`https://wa.me/${target}?text=${encodeURIComponent(text)}`, '_blank');
};
