import { unstable_setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';

import { DeployStrixBanner } from '@/features/strix-store/components/DeployStrixBanner';
import { StoreNav } from '@/features/strix-store/components/StoreNav';
import { StrixInterceptModal } from '@/features/strix-store/components/StrixInterceptModal';
import { StoreProvider } from '@/features/strix-store/state/StoreContext';

export const metadata = {
  title: 'Strix Store · Governed merch shop',
  description:
    'A fully governed demo merch shop. Watch Strix intercept high-risk agent actions in real time. Proof receipts included.',
};

export default function StrixStoreLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  unstable_setRequestLocale(params.locale);
  return (
    <StoreProvider>
      <div className="min-h-screen bg-[#07080a] text-white">
        <StoreNav />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          {children}
          <DeployStrixBanner />
        </main>
        <footer className="border-t border-white/5 py-8 text-center text-xs text-white/40">
          Strix Store is a runnable demo. All actions are evaluated client-side
          against policy; no real refunds, charges, or exports occur.
          <div className="mt-1">
            The same governance engine runs server-side in production Strix
            deployments.
          </div>
        </footer>
        <StrixInterceptModal />
      </div>
    </StoreProvider>
  );
}
