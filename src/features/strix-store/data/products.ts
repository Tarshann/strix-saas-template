export type Product = {
  id: string;
  sku: string;
  name: string;
  tagline: string;
  priceCents: number;
  inventory: number;
  category: 'apparel' | 'accessory' | 'print' | 'drinkware';
  color: string;
  emoji: string;
};

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prd_001',
    sku: 'STX-TEE-BLK-01',
    name: 'Strix Governance Tee',
    tagline: 'Block. Verify. Ship.',
    priceCents: 3400,
    inventory: 412,
    category: 'apparel',
    color: '#0a0a0a',
    emoji: '👕',
  },
  {
    id: 'prd_002',
    sku: 'STX-HOOD-GRY-01',
    name: 'Capability Hoodie',
    tagline: 'Wear the policy, not the breach.',
    priceCents: 7800,
    inventory: 186,
    category: 'apparel',
    color: '#1f1f22',
    emoji: '🧥',
  },
  {
    id: 'prd_003',
    sku: 'STX-MUG-WHT-01',
    name: 'Proof Receipt Mug',
    tagline: '12oz of verifiable audit trail.',
    priceCents: 1900,
    inventory: 928,
    category: 'drinkware',
    color: '#f3f3f0',
    emoji: '☕',
  },
  {
    id: 'prd_004',
    sku: 'STX-CAP-GRN-01',
    name: 'Intercept Cap',
    tagline: 'The hat that said no.',
    priceCents: 2800,
    inventory: 301,
    category: 'accessory',
    color: '#1a3b2e',
    emoji: '🧢',
  },
  {
    id: 'prd_005',
    sku: 'STX-STK-MIX-01',
    name: 'Policy Pack Stickers',
    tagline: '12 vinyl stickers. Zero privilege escalations.',
    priceCents: 900,
    inventory: 1540,
    category: 'accessory',
    color: '#e85d42',
    emoji: '🔖',
  },
  {
    id: 'prd_006',
    sku: 'STX-PRNT-ART-01',
    name: 'Audit Trail Print',
    tagline: '18x24 giclée. Every decision, forever.',
    priceCents: 4500,
    inventory: 64,
    category: 'print',
    color: '#f5e9c9',
    emoji: '🖼️',
  },
  {
    id: 'prd_007',
    sku: 'STX-BTL-BLK-01',
    name: 'Zero Trust Bottle',
    tagline: '24oz insulated. Never trusts your thirst.',
    priceCents: 3200,
    inventory: 247,
    category: 'drinkware',
    color: '#0e0e10',
    emoji: '🧴',
  },
  {
    id: 'prd_008',
    sku: 'STX-SOCK-PUR-01',
    name: 'Allowlist Socks',
    tagline: 'Only approved feet permitted.',
    priceCents: 1400,
    inventory: 508,
    category: 'apparel',
    color: '#5b2a86',
    emoji: '🧦',
  },
];
