import { useMemo, memo } from 'react';
import type { Produto, WishlistItem } from '../types';
import { ProductCard } from './ProductCard';
import { parseBrlPrice } from '../utils/price';

interface ProductGridProps {
  produtos: Produto[];
  siteKey: string;
  updatedAt?: string | null;
  onCreateAlert?: (produto: Produto, siteKey: string) => void;
  wishlistMap?: Record<string, WishlistItem>;
  wishlistBusy?: boolean;
  onWishlistAction?: (produto: Produto, siteKey: string, wishlistItem?: WishlistItem | null) => void;
}

function ProductGridInner({
  produtos,
  siteKey,
  updatedAt,
  onCreateAlert,
  wishlistMap = {},
  wishlistBusy,
  onWishlistAction,
}: ProductGridProps) {
  const { maxRelevancia, minPrice } = useMemo(() => {
    if (produtos.length === 0) return { maxRelevancia: 0, minPrice: Infinity };
    let maxRel = produtos[0].relevancia;
    for (const p of produtos) if (p.relevancia > maxRel) maxRel = p.relevancia;
    const topCandidates = produtos.filter((p) => p.relevancia === maxRel);
    let min = parseBrlPrice(topCandidates[0].price) ?? Infinity;
    for (const p of topCandidates) {
      const v = parseBrlPrice(p.price);
      if (v !== null && v < min) min = v;
    }
    return { maxRelevancia: maxRel, minPrice: min };
  }, [produtos]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-sm:gap-3 items-start">
      {produtos.map((p, i) => (
        <ProductCard
          key={p.url}
          produto={p}
          index={i}
          siteKey={siteKey}
          updatedAt={updatedAt}
          onCreateAlert={onCreateAlert}
          wishlistItem={wishlistMap[`${siteKey}|${p.url}`] ?? null}
          wishlistBusy={wishlistBusy}
          onWishlistAction={onWishlistAction}
          isBestOption={
            p.relevancia === maxRelevancia && parseBrlPrice(p.price) === minPrice
          }
        />
      ))}
    </div>
  );
}

export const ProductGrid = memo(ProductGridInner);
