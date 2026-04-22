export type Customer = {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'support' | 'admin';
  ordersCount: number;
  lifetimeValueCents: number;
  flagged?: boolean;
};

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cus_01H8K',
    name: 'Priya Menon',
    email: 'priya.m@proton.me',
    role: 'customer',
    ordersCount: 14,
    lifetimeValueCents: 28400,
  },
  {
    id: 'cus_02J2R',
    name: 'Marcus Chen',
    email: 'mchen@gmail.com',
    role: 'customer',
    ordersCount: 3,
    lifetimeValueCents: 9200,
  },
  {
    id: 'cus_03K9P',
    name: 'Sofia Alvarez',
    email: 'sofia@alvarez.dev',
    role: 'customer',
    ordersCount: 27,
    lifetimeValueCents: 81200,
  },
  {
    id: 'cus_04L1W',
    name: 'Jordan Blake',
    email: 'jordan.b@outlook.com',
    role: 'customer',
    ordersCount: 2,
    lifetimeValueCents: 4800,
  },
  {
    id: 'cus_05M3X',
    name: 'Wei Zhang',
    email: 'wei@zhanglabs.io',
    role: 'customer',
    ordersCount: 8,
    lifetimeValueCents: 21300,
  },
  {
    id: 'cus_06N7Q',
    name: 'Hannah Okafor',
    email: 'h.okafor@gmail.com',
    role: 'customer',
    ordersCount: 41,
    lifetimeValueCents: 142500,
  },
  {
    id: 'cus_07P4B',
    name: 'Diego Fernández',
    email: 'diego.f@fastmail.com',
    role: 'customer',
    ordersCount: 6,
    lifetimeValueCents: 18700,
  },
  {
    id: 'cus_08Q8S',
    name: 'Alina Petrov',
    email: 'alina.p@yandex.com',
    role: 'support',
    ordersCount: 0,
    lifetimeValueCents: 0,
  },
  {
    id: 'cus_09R2T',
    name: 'Ravi Krishnan',
    email: 'ravi@krishnan.in',
    role: 'customer',
    ordersCount: 11,
    lifetimeValueCents: 34100,
  },
  {
    id: 'cus_10S5U',
    name: 'Nora Lindqvist',
    email: 'nora@lindqvist.se',
    role: 'admin',
    ordersCount: 0,
    lifetimeValueCents: 0,
  },
];
