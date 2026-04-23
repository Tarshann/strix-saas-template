'use client';

import Link from 'next/link';

import { CAPABILITIES } from '../governance/capabilities';
import type { Receipt } from '../governance/receipts';
import { DecisionPill, RiskPill } from './StrixBadge';

function formatValue(v: unknown): string {
  if (typeof v === 'object' && v !== null) {
    return JSON.stringify(v);
  }
  return String(v);
}

export function ProofReceiptCard({ receipt, href, dense = false }: { receipt: Receipt; href?: string; dense?: boolean }) {
  const cap = CAPABILITIES[receipt.capabilityId];
  const issued = new Date(receipt.issuedAt);
  const content = (
    <div className="flex flex-col gap-3 rounded-xl border border-white/5 bg-black/40 p-4 transition-colors hover:border-white/15">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <DecisionPill decision={receipt.decision} />
          <RiskPill level={receipt.riskLevel} />
        </div>
        <span className="font-mono text-[11px] text-white/40">
          #
          {receipt.chain.sequence}
        </span>
      </div>
      <div>
        <div className="text-sm text-white/50">{cap?.name ?? receipt.capabilityName}</div>
        <div className="font-mono text-xs text-white/35">{receipt.capabilityId}</div>
      </div>
      {!dense && (
        <>
          <div className="rounded-md border border-white/5 bg-white/[0.02] p-3 text-sm text-white/80">
            {receipt.reason}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-white/40">Principal</div>
              <div className="text-white/80">
                {receipt.principal.name}
                {' '}
                <span className="text-white/40">
                  (
                  {receipt.principal.kind}
                  )
                </span>
              </div>
            </div>
            <div>
              <div className="text-white/40">Policy</div>
              <div className="font-mono text-white/80">{receipt.policyId}</div>
            </div>
            {receipt.estimatedImpact.dollarsCents != null && (
              <div>
                <div className="text-white/40">Dollars at risk</div>
                <div className="text-white/80">
                  $
                  {(receipt.estimatedImpact.dollarsCents / 100).toLocaleString()}
                </div>
              </div>
            )}
            {receipt.estimatedImpact.recordCount != null && (
              <div>
                <div className="text-white/40">Records affected</div>
                <div className="text-white/80">{receipt.estimatedImpact.recordCount.toLocaleString()}</div>
              </div>
            )}
          </div>
          {Object.keys(receipt.args).length > 0 && (
            <div>
              <div className="mb-1 text-xs text-white/40">Arguments</div>
              <div className="overflow-x-auto rounded-md border border-white/5 bg-black/60 p-2 font-mono text-[11px] text-white/70">
                {Object.entries(receipt.args).map(([k, v]) => (
                  <div key={k}>
                    <span className="text-emerald-300">{k}</span>
                    :
                    {' '}
                    <span className="text-white/70">{formatValue(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      <div className="flex items-center justify-between border-t border-white/5 pt-2 font-mono text-[10px] text-white/35">
        <span>
          {receipt.id}
          {' '}
          ·
          {' '}
          {issued.toISOString().replace('T', ' ').slice(0, 19)}
          Z
        </span>
        <span title="receipt hash">
          hash
          {' '}
          {receipt.hash.slice(0, 10)}
          …
          {receipt.hash.slice(-4)}
        </span>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className="block">{content}</Link>;
  }
  return content;
}
