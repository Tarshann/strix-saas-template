export type OrderStatus = 'fulfilled' | 'shipped' | 'processing' | 'refunded';

export type OrderLine = {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  priceCents: number;
};

export type Order = {
  id: string;
  customerId: string;
  customerName: string;
  status: OrderStatus;
  totalCents: number;
  placedAt: string;
  lines: OrderLine[];
};

const now = Date.UTC(2026, 3, 22, 14, 0, 0);
const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord_42101',
    customerId: 'cus_06N7Q',
    customerName: 'Hannah Okafor',
    status: 'fulfilled',
    totalCents: 11300,
    placedAt: hoursAgo(2),
    lines: [
      { productId: 'prd_002', sku: 'STX-HOOD-GRY-01', name: 'Capability Hoodie', quantity: 1, priceCents: 7800 },
      { productId: 'prd_001', sku: 'STX-TEE-BLK-01', name: 'Strix Governance Tee', quantity: 1, priceCents: 3400 },
    ],
  },
  {
    id: 'ord_42100',
    customerId: 'cus_03K9P',
    customerName: 'Sofia Alvarez',
    status: 'shipped',
    totalCents: 6800,
    placedAt: hoursAgo(5),
    lines: [
      { productId: 'prd_001', sku: 'STX-TEE-BLK-01', name: 'Strix Governance Tee', quantity: 2, priceCents: 3400 },
    ],
  },
  {
    id: 'ord_42099',
    customerId: 'cus_01H8K',
    customerName: 'Priya Menon',
    status: 'processing',
    totalCents: 4500,
    placedAt: hoursAgo(7),
    lines: [
      { productId: 'prd_006', sku: 'STX-PRNT-ART-01', name: 'Audit Trail Print', quantity: 1, priceCents: 4500 },
    ],
  },
  {
    id: 'ord_42098',
    customerId: 'cus_09R2T',
    customerName: 'Ravi Krishnan',
    status: 'fulfilled',
    totalCents: 14200,
    placedAt: hoursAgo(14),
    lines: [
      { productId: 'prd_002', sku: 'STX-HOOD-GRY-01', name: 'Capability Hoodie', quantity: 1, priceCents: 7800 },
      { productId: 'prd_004', sku: 'STX-CAP-GRN-01', name: 'Intercept Cap', quantity: 1, priceCents: 2800 },
      { productId: 'prd_007', sku: 'STX-BTL-BLK-01', name: 'Zero Trust Bottle', quantity: 1, priceCents: 3200 },
      { productId: 'prd_005', sku: 'STX-STK-MIX-01', name: 'Policy Pack Stickers', quantity: 1, priceCents: 900 }, // noqa
    ],
  },
  {
    id: 'ord_42097',
    customerId: 'cus_05M3X',
    customerName: 'Wei Zhang',
    status: 'shipped',
    totalCents: 5700,
    placedAt: hoursAgo(22),
    lines: [
      { productId: 'prd_003', sku: 'STX-MUG-WHT-01', name: 'Proof Receipt Mug', quantity: 3, priceCents: 1900 },
    ],
  },
  {
    id: 'ord_42096',
    customerId: 'cus_07P4B',
    customerName: 'Diego Fernández',
    status: 'fulfilled',
    totalCents: 2800,
    placedAt: hoursAgo(28),
    lines: [
      { productId: 'prd_004', sku: 'STX-CAP-GRN-01', name: 'Intercept Cap', quantity: 1, priceCents: 2800 },
    ],
  },
  {
    id: 'ord_42095',
    customerId: 'cus_02J2R',
    customerName: 'Marcus Chen',
    status: 'fulfilled',
    totalCents: 9200,
    placedAt: hoursAgo(36),
    lines: [
      { productId: 'prd_002', sku: 'STX-HOOD-GRY-01', name: 'Capability Hoodie', quantity: 1, priceCents: 7800 },
      { productId: 'prd_005', sku: 'STX-STK-MIX-01', name: 'Policy Pack Stickers', quantity: 1, priceCents: 900 },
    ],
  },
  {
    id: 'ord_42094',
    customerId: 'cus_04L1W',
    customerName: 'Jordan Blake',
    status: 'refunded',
    totalCents: 3400,
    placedAt: hoursAgo(46),
    lines: [
      { productId: 'prd_001', sku: 'STX-TEE-BLK-01', name: 'Strix Governance Tee', quantity: 1, priceCents: 3400 },
    ],
  },
  {
    id: 'ord_42093',
    customerId: 'cus_06N7Q',
    customerName: 'Hannah Okafor',
    status: 'fulfilled',
    totalCents: 21500,
    placedAt: hoursAgo(62),
    lines: [
      { productId: 'prd_002', sku: 'STX-HOOD-GRY-01', name: 'Capability Hoodie', quantity: 2, priceCents: 7800 },
      { productId: 'prd_006', sku: 'STX-PRNT-ART-01', name: 'Audit Trail Print', quantity: 1, priceCents: 4500 },
      { productId: 'prd_005', sku: 'STX-STK-MIX-01', name: 'Policy Pack Stickers', quantity: 1, priceCents: 900 },
    ],
  },
  {
    id: 'ord_42092',
    customerId: 'cus_03K9P',
    customerName: 'Sofia Alvarez',
    status: 'fulfilled',
    totalCents: 7600,
    placedAt: hoursAgo(71),
    lines: [
      { productId: 'prd_008', sku: 'STX-SOCK-PUR-01', name: 'Allowlist Socks', quantity: 2, priceCents: 1400 },
      { productId: 'prd_003', sku: 'STX-MUG-WHT-01', name: 'Proof Receipt Mug', quantity: 2, priceCents: 1900 },
      { productId: 'prd_005', sku: 'STX-STK-MIX-01', name: 'Policy Pack Stickers', quantity: 1, priceCents: 900 },
    ],
  },
  {
    id: 'ord_42091',
    customerId: 'cus_09R2T',
    customerName: 'Ravi Krishnan',
    status: 'fulfilled',
    totalCents: 3200,
    placedAt: hoursAgo(88),
    lines: [
      { productId: 'prd_007', sku: 'STX-BTL-BLK-01', name: 'Zero Trust Bottle', quantity: 1, priceCents: 3200 },
    ],
  },
  {
    id: 'ord_42090',
    customerId: 'cus_06N7Q',
    customerName: 'Hannah Okafor',
    status: 'fulfilled',
    totalCents: 5600,
    placedAt: hoursAgo(104),
    lines: [
      { productId: 'prd_004', sku: 'STX-CAP-GRN-01', name: 'Intercept Cap', quantity: 2, priceCents: 2800 },
    ],
  },
];

// Aggregate rollups used by the admin dashboard and governance decisions.
export function summarizeLastWeek(orders: Order[]) {
  const cutoff = now - 7 * 24 * 3_600_000;
  const recent = orders.filter(o => new Date(o.placedAt).getTime() >= cutoff && o.status !== 'refunded');
  const totalCents = recent.reduce((sum, o) => sum + o.totalCents, 0);
  return { count: recent.length, totalCents, orders: recent };
}
