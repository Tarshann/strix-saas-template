import Link from 'next/link';

import { StickyBanner } from '@/features/landing/StickyBanner';

export const DemoBanner = () => (
  <StickyBanner>
    New · Strix Store is live —
    {' '}
    <Link href="/strix-store">watch an agent try to drain the shop →</Link>
  </StickyBanner>
);
