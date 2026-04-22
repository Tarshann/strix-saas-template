import { unstable_setRequestLocale } from 'next-intl/server';

import { AdminDashboard } from '@/features/strix-store/components/AdminDashboard';

export default function AdminPage(props: { params: { locale: string } }) {
  unstable_setRequestLocale(props.params.locale);
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-white">Admin</h1>
        <p className="mt-1 text-white/60">
          Orders, inventory, and users. Every high-risk action passes through Strix — the buttons marked red are ones an agent would attempt.
        </p>
      </header>
      <AdminDashboard />
    </div>
  );
}
