'use client';

import { useStore } from '../state/useStore';

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function ProductGrid() {
  const { products, cart, addToCart } = useStore();
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((p) => {
        const inCart = cart.find(l => l.productId === p.id)?.quantity ?? 0;
        return (
          <div
            key={p.id}
            className="group flex flex-col overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] transition-colors hover:border-white/10"
          >
            <div
              className="flex h-40 items-center justify-center text-5xl"
              style={{ background: `linear-gradient(135deg, ${p.color} 0%, #000 140%)` }}
              aria-hidden
            >
              {p.emoji}
            </div>
            <div className="flex flex-1 flex-col gap-3 p-4">
              <div>
                <div className="text-xs text-white/40">
                  {p.sku}
                  {' '}
                  ·
                  {' '}
                  {p.inventory}
                  {' '}
                  in stock
                </div>
                <h3 className="mt-1 font-medium text-white">{p.name}</h3>
                <p className="mt-0.5 text-sm text-white/55">{p.tagline}</p>
              </div>
              <div className="mt-auto flex items-center justify-between">
                <div className="text-lg font-semibold text-white">{formatPrice(p.priceCents)}</div>
                <button
                  type="button"
                  onClick={() => addToCart(p.id)}
                  className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-black transition-colors hover:bg-white/85"
                >
                  {inCart > 0 ? `In cart · ${inCart}` : 'Add to cart'}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
