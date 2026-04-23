'use client';

import Link from 'next/link';

import { useStore } from '../state/useStore';
import { ProofReceiptCard } from './ProofReceiptCard';

export function ReceiptsView() {
  const { receipts } = useStore();
  if (receipts.length === 0) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-10 text-center">
        <p className="text-white/70">No receipts yet.</p>
        <p className="mt-2 text-sm text-white/50">
          Run a scenario on the
          {' '}
          <Link className="text-emerald-300 underline" href="/strix-store/agent">Agent Console</Link>
          {' '}
          or click a red action on the
          {' '}
          <Link className="text-emerald-300 underline" href="/strix-store/admin">Admin</Link>
          {' '}
          page.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {receipts.map(r => (
        <ProofReceiptCard key={r.id} receipt={r} href={`/strix-store/receipts/${r.id}`} />
      ))}
    </div>
  );
}

export function ReceiptDetailView({ id }: { id: string }) {
  const { receipts } = useStore();
  const receipt = receipts.find(r => r.id === id);
  if (!receipt) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-10 text-center">
        <p className="text-white/70">Receipt not found in this session.</p>
        <p className="mt-2 text-sm text-white/50">
          Receipts are stored in-memory for the duration of your visit. Run a scenario on the
          {' '}
          <Link className="text-emerald-300 underline" href="/strix-store/agent">Agent Console</Link>
          {' '}
          to generate new ones.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <ProofReceiptCard receipt={receipt} />
      <div className="rounded-xl border border-white/5 bg-black/40 p-5">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">Raw receipt (JSON)</h3>
        <pre className="overflow-x-auto text-xs text-white/70">
          {JSON.stringify(receipt, null, 2)}
        </pre>
      </div>
    </div>
  );
}
