'use client';

import { createContext, type ReactNode, useCallback, useMemo, useState } from 'react';

import { INITIAL_CUSTOMERS } from '../data/customers';
import { INITIAL_ORDERS, type Order } from '../data/orders';
import { INITIAL_PRODUCTS, type Product } from '../data/products';
import { evaluate, type GovernedRequest, type GovernedResponse } from '../governance/governor';
import type { Receipt } from '../governance/receipts';

type CartLine = { productId: string; quantity: number };

export type StoreState = {
  products: Product[];
  orders: Order[];
  customers: typeof INITIAL_CUSTOMERS;
  cart: CartLine[];
  receipts: Receipt[];
  lastInterceptedReceiptId: string | null;
};

export type StoreActions = {
  addToCart: (productId: string) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  governedCall: (req: GovernedRequest) => GovernedResponse;
  dismissIntercept: () => void;
};

export const StoreContext = createContext<(StoreState & StoreActions) | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [products] = useState<Product[]>(INITIAL_PRODUCTS);
  const [orders] = useState<Order[]>(INITIAL_ORDERS);
  const [customers] = useState(INITIAL_CUSTOMERS);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [lastInterceptedReceiptId, setLastIntercept] = useState<string | null>(null);

  const addToCart = useCallback((productId: string) => {
    setCart((prev) => {
      const hit = prev.find(l => l.productId === productId);
      if (hit) {
        return prev.map(l => (l.productId === productId ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { productId, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart(prev => prev.filter(l => l.productId !== productId));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const governedCall = useCallback((req: GovernedRequest) => {
    const res = evaluate(req);
    setReceipts(prev => [res.receipt, ...prev]);
    if (res.decision !== 'allow') {
      setLastIntercept(res.receipt.id);
    }
    return res;
  }, []);

  const dismissIntercept = useCallback(() => setLastIntercept(null), []);

  const value = useMemo(() => ({
    products,
    orders,
    customers,
    cart,
    receipts,
    lastInterceptedReceiptId,
    addToCart,
    removeFromCart,
    clearCart,
    governedCall,
    dismissIntercept,
  }), [products, orders, customers, cart, receipts, lastInterceptedReceiptId, addToCart, removeFromCart, clearCart, governedCall, dismissIntercept]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
