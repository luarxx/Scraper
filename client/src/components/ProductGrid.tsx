import { useState, useEffect, useCallback } from 'react';
import type { Produto } from '../types';
import { ProductCard } from './ProductCard';

interface ProductGridProps {
  produtos: Produto[];
  siteKey: string;
}

function parsePrice(price: string | null): number {
  if (!price) return Infinity;
  return parseFloat(price.replace(/[^\d,]/g, '').replace(',', '.'));
}

export function ProductGrid({ produtos, siteKey }: ProductGridProps) {
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);

  useEffect(() => {
    setExpandedUrl(null);
  }, [produtos[0]?.url, siteKey]);

  const handleToggleChart = useCallback((url: string) => {
    setExpandedUrl(prev => (prev === url ? null : url));
  }, []);

  const maxRelevancia = Math.max(...produtos.map((p) => p.relevancia));
  const topCandidates = produtos.filter((p) => p.relevancia === maxRelevancia);
  const minPrice = Math.min(...topCandidates.map((p) => parsePrice(p.price)));

  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-sm:gap-3 ${expandedUrl !== null ? 'items-start' : ''}`}
    >
      {produtos.map((p, i) => (
        <ProductCard
          key={p.url}
          produto={p}
          index={i}
          siteKey={siteKey}
          isBestOption={
            p.relevancia === maxRelevancia && parsePrice(p.price) === minPrice
          }
          isChartExpanded={expandedUrl === p.url}
          onToggleChart={() => handleToggleChart(p.url)}
        />
      ))}
    </div>
  );
}
