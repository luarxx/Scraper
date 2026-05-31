import type { Produto } from '../types';
import { ProductCard } from './ProductCard';

interface ProductGridProps {
  produtos: Produto[];
  termo: string;
  siteKey: string;
}

function parsePrice(price: string | null): number {
  if (!price) return Infinity;
  return parseFloat(price.replace(/[^\d,]/g, '').replace(',', '.'));
}

export function ProductGrid({ produtos, termo, siteKey }: ProductGridProps) {
  const maxRelevancia = Math.max(...produtos.map((p) => p.relevancia));
  const topCandidates = produtos.filter((p) => p.relevancia === maxRelevancia);
  const minPrice = Math.min(...topCandidates.map((p) => parsePrice(p.price)));

  const totalPalavras = termo.trim() ? termo.split(/\s+/).length : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {produtos.map((p, i) => (
        <ProductCard
          key={i}
          produto={p}
          index={i}
          siteKey={siteKey}
          totalPalavras={totalPalavras}
          isBestOption={
            p.relevancia === maxRelevancia && parsePrice(p.price) === minPrice
          }
        />
      ))}
    </div>
  );
}
