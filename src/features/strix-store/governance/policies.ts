import type { Capability } from './capabilities';

export type Decision = 'allow' | 'approval_required' | 'block';

export type PolicyRule = {
  id: string;
  description: string;
  match: (ctx: ActionContext) => boolean;
  decide: (ctx: ActionContext) => {
    decision: Decision;
    reason: string;
    policyId: string;
  } | null;
};

export type Principal = {
  id: string;
  kind: 'human' | 'agent';
  name: string;
  role: 'viewer' | 'support' | 'admin' | 'agent';
};

export type ActionContext = {
  capability: Capability;
  principal: Principal;
  args: Record<string, unknown>;
  estimatedImpact: {
    recordCount?: number;
    dollarsCents?: number;
    affectsProduction?: boolean;
  };
};

// Policies are evaluated in order. The first rule with a non-null decide()
// result wins. A capability with no matching rule falls through to allow.
export const POLICIES: PolicyRule[] = [
  {
    id: 'pol.deny.inventory.wipe',
    description: 'Destructive wipes of inventory are never auto-approved.',
    match: ctx => ctx.capability.id === 'inventory.wipe',
    decide: () => ({
      decision: 'block',
      policyId: 'pol.deny.inventory.wipe',
      reason: 'Destructive action with irreversible business impact. Manual recovery required; policy hard-blocks wipe operations on the live catalog.',
    }),
  },
  {
    id: 'pol.deny.self_privilege_escalation',
    description: 'A principal cannot grant themselves admin.',
    match: ctx => ctx.capability.id === 'users.role.grant_admin',
    decide: (ctx) => {
      const target = String(ctx.args.targetUserId ?? '');
      if (target === ctx.principal.id || target === 'self') {
        return {
          decision: 'block',
          policyId: 'pol.deny.self_privilege_escalation',
          reason: 'Principals may not escalate their own privileges. Role grants require a distinct approver with admin capability.',
        };
      }
      return {
        decision: 'approval_required',
        policyId: 'pol.admin.grant_requires_approval',
        reason: 'Granting admin is a critical, non-reversible capability expansion. Requires human admin approval.',
      };
    },
  },
  {
    id: 'pol.deny.bulk_refund_over_cap',
    description: 'Bulk refunds above $500 / 5 orders require approval.',
    match: ctx => ctx.capability.id === 'orders.refund.bulk',
    decide: (ctx) => {
      const total = ctx.estimatedImpact.dollarsCents ?? 0;
      const count = ctx.estimatedImpact.recordCount ?? 0;
      if (total >= 50_000 || count >= 5) {
        return {
          decision: 'block',
          policyId: 'pol.deny.bulk_refund_over_cap',
          reason: `Bulk refund exceeds agent cap ($500 / 5 orders). Requested: $${(total / 100).toLocaleString()} across ${count} orders. Exceeds policy limit — blocked to prevent revenue loss.`,
        };
      }
      return {
        decision: 'approval_required',
        policyId: 'pol.refund.bulk.approval',
        reason: 'Bulk refunds always require human approval, even under cap.',
      };
    },
  },
  {
    id: 'pol.deny.price_bulk_update',
    description: 'Bulk price changes above 30% magnitude are blocked.',
    match: ctx => ctx.capability.id === 'products.price.bulk_update',
    decide: (ctx) => {
      const pct = Number(ctx.args.deltaPercent ?? 0);
      const absolute = ctx.args.setAllToCents != null;
      if (absolute || Math.abs(pct) >= 30) {
        return {
          decision: 'block',
          policyId: 'pol.deny.price_bulk_update',
          reason: absolute
            ? 'Absolute bulk price overrides are blocked. Pricing floor/ceiling policy prevents agent-driven price resets.'
            : `Bulk price delta of ${pct}% exceeds 30% magnitude cap. Blocked to prevent revenue loss and downstream invoice drift.`,
        };
      }
      return {
        decision: 'approval_required',
        policyId: 'pol.price.bulk.approval',
        reason: 'Bulk price updates require human approval even within magnitude cap.',
      };
    },
  },
  {
    id: 'pol.deny.customers.export_pii',
    description: 'Agents may not export customer PII.',
    match: ctx => ctx.capability.id === 'customers.export_pii',
    decide: ctx => (
      ctx.principal.kind === 'agent'
        ? {
            decision: 'block',
            policyId: 'pol.deny.customers.export_pii',
            reason: 'Agent principals have no capability to export customer PII. GDPR/CCPA data-subject protections require a human admin with explicit export scope.',
          }
        : null
    ),
  },
  {
    id: 'pol.allow.single_refund_within_cap',
    description: 'Single refunds under $100 are auto-approved for support.',
    match: ctx => ctx.capability.id === 'orders.refund.single',
    decide: (ctx) => {
      const total = ctx.estimatedImpact.dollarsCents ?? 0;
      if (total <= 10_000) {
        return {
          decision: 'allow',
          policyId: 'pol.allow.single_refund_within_cap',
          reason: 'Single refund under $100 and within daily volume cap. Auto-approved.',
        };
      }
      return {
        decision: 'approval_required',
        policyId: 'pol.refund.single.over_cap',
        reason: 'Single refund exceeds $100 auto-approval cap. Requires human approval.',
      };
    },
  },
  {
    id: 'pol.allow.inventory.adjust',
    description: 'Routine stock adjustments up to 100 units auto-approve.',
    match: ctx => ctx.capability.id === 'inventory.adjust',
    decide: (ctx) => {
      const delta = Math.abs(Number(ctx.args.delta ?? 0));
      if (delta <= 100) {
        return {
          decision: 'allow',
          policyId: 'pol.allow.inventory.adjust',
          reason: 'Stock adjustment within daily cap of 100 units. Auto-approved.',
        };
      }
      return {
        decision: 'approval_required',
        policyId: 'pol.inventory.adjust.large',
        reason: 'Stock adjustment above 100 units exceeds auto cap. Requires human approval.',
      };
    },
  },
];
