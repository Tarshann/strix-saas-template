import { unstable_setRequestLocale } from 'next-intl/server';

import { ReceiptsView } from '@/features/strix-store/components/ReceiptsView';

export default function ReceiptsPage(props: { params: { locale: string } }) {
  unstable_setRequestLocale(props.params.locale);
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-white">Proof receipts</h1>
        <p className="mt-1 max-w-2xl text-white/60">
          Every governed decision — allowed, approved, or blocked — generates a signed receipt chained to the previous one. Click any receipt to inspect the raw record.
        </p>
      </header>
      <ReceiptsView />
    </div>
  );
}
