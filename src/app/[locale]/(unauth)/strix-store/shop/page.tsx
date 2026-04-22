import { unstable_setRequestLocale } from 'next-intl/server';

import { CartSummary } from '@/features/strix-store/components/CartSummary';
import { ProductGrid } from '@/features/strix-store/components/ProductGrid';

export default function ShopPage(props: { params: { locale: string } }) {
  unstable_setRequestLocale(props.params.locale);
  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">Strix Store</h1>
          <p className="mt-1 text-white/60">Merch designed by people who block things for a living.</p>
        </div>
      </header>
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <ProductGrid />
        <CartSummary />
      </div>
    </div>
  );
}
