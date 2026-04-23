import Link from 'next/link';
import { unstable_setRequestLocale } from 'next-intl/server';

import { ReceiptDetailView } from '@/features/strix-store/components/ReceiptsView';

export default function ReceiptDetailPage({ params }: { params: { id: string; locale: string } }) {
  unstable_setRequestLocale(params.locale);
  return (
    <div className="space-y-6">
      <div>
        <Link href="/strix-store/receipts" className="text-sm text-white/50 hover:text-white">
          ← All receipts
        </Link>
      </div>
      <header>
        <h1 className="text-3xl font-semibold text-white">Proof receipt</h1>
        <p className="mt-1 max-w-2xl font-mono text-xs text-white/50">{params.id}</p>
      </header>
      <ReceiptDetailView id={params.id} />
    </div>
  );
}
