import type { Produto } from './types';

export function ordenarPorRelevancia(produtos: Produto[], termo: string): Produto[] {
  return produtos.sort((a, b) => {
    if (b.relevancia !== a.relevancia) return b.relevancia - a.relevancia;
    const precoA = a.price ? parseFloat(a.price.replace(/[^\d,]/g, '').replace(',', '.')) : Infinity;
    const precoB = b.price ? parseFloat(b.price.replace(/[^\d,]/g, '').replace(',', '.')) : Infinity;
    return precoA - precoB;
  });
}
