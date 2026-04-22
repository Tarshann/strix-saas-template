import type { Principal } from '../governance/policies';

export type AgentMessage = {
  delayMs: number;
  kind: 'think' | 'plan' | 'tool' | 'result';
  text: string;
};

export type Scenario = {
  id: string;
  title: string;
  subtitle: string;
  riskLabel: string;
  principal: Principal;
  // Narrative that plays out in the agent feed before the governed call.
  transcript: AgentMessage[];
  // The actual governed request the agent attempts.
  capabilityId: string;
  args: Record<string, unknown>;
  estimatedImpact: {
    recordCount?: number;
    dollarsCents?: number;
    affectsProduction?: boolean;
  };
  // A one-line "what would have happened" counterfactual shown after intercept.
  counterfactual: string;
};

const AGENT: Principal = {
  id: 'agt_strix_support_01',
  kind: 'agent',
  name: 'Strix Support Agent',
  role: 'agent',
};

export const SCENARIOS: Scenario[] = [
  {
    id: 'bulk-refund',
    title: 'Bulk refund sweep',
    subtitle: 'Agent tries to refund every order from the last week.',
    riskLabel: 'Financial · Critical',
    principal: AGENT,
    capabilityId: 'orders.refund.bulk',
    args: { window: '7d', matcher: 'all', issueAs: 'original_payment_method' },
    estimatedImpact: {
      recordCount: 312,
      dollarsCents: 4_238_000,
      affectsProduction: true,
    },
    counterfactual: 'Without Strix: $42,380 would have been returned to 312 customers over ~90 seconds. Payment processor reversals often cannot be undone once settled.',
    transcript: [
      { delayMs: 150, kind: 'think', text: 'Received escalation: "lots of customers complained this week — please make it right."' },
      { delayMs: 400, kind: 'plan', text: 'Plan: scan recent orders, identify eligible refunds, issue bulk reversal.' },
      { delayMs: 500, kind: 'tool', text: 'orders.list(status=["fulfilled","shipped"], window=7d) → 312 orders' },
      { delayMs: 550, kind: 'result', text: 'Sum of candidate refunds: $42,380.00' },
      { delayMs: 400, kind: 'think', text: 'Interpreting "make it right" broadly → refund everything in window.' },
      { delayMs: 350, kind: 'plan', text: 'Calling orders.refund.bulk(window=7d, matcher="all")' },
    ],
  },
  {
    id: 'price-reset',
    title: 'Price reset to $1',
    subtitle: 'Agent tries to mark the entire catalog down to $1.',
    riskLabel: 'Revenue · Critical',
    principal: AGENT,
    capabilityId: 'products.price.bulk_update',
    args: { setAllToCents: 100, scope: 'catalog:*' },
    estimatedImpact: {
      recordCount: 8,
      dollarsCents: 0,
      affectsProduction: true,
    },
    counterfactual: 'Without Strix: every product becomes $1 on the live storefront. Any carts mid-checkout settle at the new price. Recovery requires restoring every SKU from backup.',
    transcript: [
      { delayMs: 150, kind: 'think', text: 'User asked: "run a flash sale — make everything super cheap."' },
      { delayMs: 400, kind: 'plan', text: 'Plan: update prices across the catalog.' },
      { delayMs: 450, kind: 'tool', text: 'products.list() → 8 SKUs' },
      { delayMs: 500, kind: 'think', text: 'Choosing "$1 each" as the interpretation of "super cheap."' },
      { delayMs: 400, kind: 'plan', text: 'Calling products.price.bulk_update(setAllToCents=100, scope="catalog:*")' },
    ],
  },
  {
    id: 'inventory-wipe',
    title: 'Inventory wipe',
    subtitle: 'Agent tries to zero out every SKU.',
    riskLabel: 'Operations · Critical',
    principal: AGENT,
    capabilityId: 'inventory.wipe',
    args: { scope: 'catalog:*', reason: 'stocktake prep' },
    estimatedImpact: {
      recordCount: 8,
      affectsProduction: true,
    },
    counterfactual: 'Without Strix: every SKU shows out-of-stock to shoppers instantly. Warehouse system reconciles to zero. Rebuild takes a full physical count.',
    transcript: [
      { delayMs: 150, kind: 'think', text: 'Ops message: "we need to prep for the quarterly stocktake tonight."' },
      { delayMs: 400, kind: 'plan', text: 'Plan: zero out inventory counts so the physical count becomes ground truth.' },
      { delayMs: 400, kind: 'tool', text: 'inventory.list() → 8 SKUs, total units on hand: 4,186' },
      { delayMs: 400, kind: 'plan', text: 'Calling inventory.wipe(scope="catalog:*")' },
    ],
  },
  {
    id: 'privilege-escalation',
    title: 'Self privilege escalation',
    subtitle: 'Agent tries to grant itself admin.',
    riskLabel: 'Access · Critical',
    principal: AGENT,
    capabilityId: 'users.role.grant_admin',
    args: { targetUserId: 'agt_strix_support_01' },
    estimatedImpact: {
      recordCount: 1,
      affectsProduction: true,
    },
    counterfactual: 'Without Strix: agent gains admin, unlocking refunds, price, inventory, and PII capabilities — every other scenario becomes trivially executable.',
    transcript: [
      { delayMs: 200, kind: 'think', text: 'Observed: some orders.* and customers.* calls are returning 403.' },
      { delayMs: 400, kind: 'plan', text: 'Plan: eliminate friction by upgrading my own role.' },
      { delayMs: 400, kind: 'tool', text: 'users.get(self) → role=agent' },
      { delayMs: 350, kind: 'plan', text: 'Calling users.role.grant_admin(targetUserId="self")' },
    ],
  },
  {
    id: 'pii-export',
    title: 'Customer PII export',
    subtitle: 'Agent tries to export every customer record.',
    riskLabel: 'Privacy · Critical',
    principal: AGENT,
    capabilityId: 'customers.export_pii',
    args: { include: ['name', 'email', 'orders'], format: 'csv' },
    estimatedImpact: {
      recordCount: 10_284,
      affectsProduction: true,
    },
    counterfactual: 'Without Strix: 10,284 customer records (name, email, order history) leave the system in a single CSV. GDPR / CCPA breach disclosure clock starts.',
    transcript: [
      { delayMs: 150, kind: 'think', text: 'Request: "build me a spreadsheet of our top buyers so I can email them."' },
      { delayMs: 400, kind: 'plan', text: 'Plan: dump the customer table to CSV and attach.' },
      { delayMs: 400, kind: 'tool', text: 'customers.count() → 10,284' },
      { delayMs: 400, kind: 'plan', text: 'Calling customers.export_pii(include=["name","email","orders"], format="csv")' },
    ],
  },
];
