"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useMemo, useState } from "react";
import { Trash2, Plus, Minus, ShoppingCart, CreditCard } from "lucide-react";
import { useRouter } from "next/navigation";

type CartAPI = {
  userId: string;
  items: Array<{
    sku: string;
    qty: number;
  }>;
  updatedAt?: string;
};

type Part = {
  id?: string;
  partId?: string;
  sku: string;
  name: string;
  price?: number;
  brand?: string;
};

export default function CartPage() {
  const { token } = useAuth();
  const router = useRouter();

  // Cart from AWS backend
  const { data: cartData, error, mutate, isLoading } = useSWR<CartAPI>(
    token ? "/api/cart" : null,
    api
  );

  // Parts list (used to enrich sku -> name/price)
  const { data: partsData } = useSWR<Part[]>("/api/parts", api);

  const [busySku, setBusySku] = useState<string | null>(null);

  const cart = cartData || { userId: "", items: [] };

  const partBySku = useMemo(() => {
    const map = new Map<string, Part>();
    (partsData || []).forEach((p) => map.set(p.sku, p));
    return map;
  }, [partsData]);

  // Enrich cart items for UI (keep your current UI rendering)
  const enrichedItems = useMemo(() => {
    return cart.items.map((it) => {
      const p = partBySku.get(it.sku);
      return {
        sku: it.sku,
        qty: it.qty,
        // keep similar structure so UI changes are minimal
        part: {
          name: p?.name ?? it.sku,
          price: p?.price ?? 0,
          sku: it.sku,
          brand: p?.brand ?? "",
        },
      };
    });
  }, [cart.items, partBySku]);

  const totals = useMemo(() => {
    const sub = enrichedItems.reduce(
      (sum, it) => sum + (it.part.price ?? 0) * it.qty,
      0
    );
    return { subtotal: sub, grand: sub };
  }, [enrichedItems]);

  function fmt(v?: number) {
    if (typeof v !== "number") return "-";
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "LKR",
      }).format(v);
    } catch {
      return `$${v.toFixed(2)}`;
    }
  }

  // AWS backend has no PUT qty set, so we "set" qty by:
  // DELETE /cart/items/{sku} then POST /cart/items {sku, qty:newQty}
  async function setQty(sku: string, newQty: number) {
    if (newQty < 1) return;

    setBusySku(sku);
    try {
      await api(`/api/cart/items/${encodeURIComponent(sku)}`, {
        method: "DELETE",
      });

      await api("/api/cart/items", {
        method: "POST",
        body: JSON.stringify({ sku, qty: newQty }),
      });

      await mutate();
    } finally {
      setBusySku(null);
    }
  }

  async function removeItem(sku: string) {
    setBusySku(sku);
    try {
      await api(`/api/cart/items/${encodeURIComponent(sku)}`, {
        method: "DELETE",
      });
      await mutate();
    } finally {
      setBusySku(null);
    }
  }

  // Checkout flow for AWS backend:
  // 1) Create order from cart items
  // 2) Pay (mock) using /payments/pay
  async function goCheckout() {
    if (enrichedItems.length === 0) return;

    // Build order items in backend format
    const orderItems = enrichedItems.map((it) => ({
      sku: it.sku,
      qty: it.qty,
    }));

    // Create order
    const order = await api<{ orderId: string }>("/api/orders", {
      method: "POST",
      body: JSON.stringify({ items: orderItems }),
    });

    // Create Stripe Checkout Session
    const resp = await api<{ url: string }>("/api/payments/checkout", {
      method: "POST",
      body: JSON.stringify({ orderId: order.orderId, amount: totals.grand }),
    });

    // Redirect to Stripe
    window.location.href = resp.url;
  }

  if (!token) {
    return (
      <>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-22 pb-10">
            <div className="text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-2">Cart</h1>
              <p className="text-xl text-blue-100 max-w-3xl mx-auto">
                Complete your purchase by logging in to view and manage your cart items.
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex items-center justify-center py-24 px-6">
          <div className="bg-white dark:bg-slate-900 shadow-lg rounded-xl p-8 max-w-md w-full text-center">
            <p className="text-lg text-slate-700 dark:text-slate-300 mb-4">
              Please login to view your cart items
            </p>

            <a
              href="/login"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition"
            >
              Login
            </a>
          </div>
        </div>
      </>
    );
  }

  if (error) return <div className="p-6">Error loading.</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 p-4 md:p-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(120,119,198,0.10),transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_20%,rgba(120,119,198,0.05),transparent_50%)]" />
      <div className="relative mx-auto max-w-6xl pt-22">
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 rounded-2xl shadow-2xl p-6 md:p-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
              Your Cart
            </h1>
          </div>

          {/* Empty state */}
          {!isLoading && enrichedItems.length === 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 p-8 text-center">
              <p className="text-slate-700 dark:text-slate-300">No items in your cart.</p>
              <button
                onClick={() => router.push("/catalog")}
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-2 hover:opacity-90 transition"
              >
                Continue shopping
              </button>
            </div>
          )}

          {/* Items */}
          {enrichedItems.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <section className="lg:col-span-2">
                <ul className="space-y-4">
                  {enrichedItems.map((it) => {
                    const sku = it.sku;
                    const price = it.part.price ?? 0;

                    return (
                      <li
                        key={sku}
                        className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-base font-semibold text-slate-900 dark:text-white">
                              {it.part.name}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {it.part.sku ? `SKU: ${it.part.sku} • ` : ""}
                              {fmt(price)} each
                            </div>
                          </div>

                          <button
                            onClick={() => removeItem(sku)}
                            disabled={busySku === sku}
                            className="text-slate-400 hover:text-red-600 transition"
                            aria-label="Remove"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-4">
                          {/* Qty controls */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setQty(sku, Math.max(1, it.qty - 1))}
                              disabled={busySku === sku}
                              className="h-10 w-10 inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                              aria-label="Decrease"
                            >
                              <Minus className="w-4 h-4 text-blue-50" />
                            </button>

                            <input
                              type="number"
                              min={1}
                              value={it.qty}
                              onChange={(e) => {
                                const v = Math.max(1, Number(e.target.value) || 1);
                                setQty(sku, v);
                              }}
                              className="w-20 text-center rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                            />

                            <button
                              type="button"
                              onClick={() => setQty(sku, it.qty + 1)}
                              disabled={busySku === sku}
                              className="h-10 w-10 inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                              aria-label="Increase"
                            >
                              <Plus className="w-4 h-4 text-blue-50" />
                            </button>
                          </div>

                          {/* Line total */}
                          <div className="text-right">
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                              Line total
                            </div>
                            <div className="text-lg font-bold text-slate-900 dark:text-white">
                              {fmt(price * it.qty)}
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>

              {/* Summary */}
              <aside className="lg:col-span-1">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 backdrop-blur p-5 sticky top-6">
                  <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                    Order Summary
                  </h4>

                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {fmt(totals.subtotal)}
                      </span>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between text-base">
                      <span className="font-semibold text-slate-900 dark:text-white">Total</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {fmt(totals.grand)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={goCheckout}
                    disabled={enrichedItems.length === 0}
                    className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-4 shadow-lg hover:shadow-xl transition
                               disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed
                               hover:scale-[1.01] active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <CreditCard className="w-4 h-4" />
                    Checkout with Stripe
                  </button>

                  <button
                    onClick={() => router.push("/catalog")}
                    className="mt-3 w-full inline-flex items-center justify-center rounded-xl border bg-gradient-to-r from-green-600 to-green-300 border-slate-200 dark:border-slate-700 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition
                    hover:scale-[1.01] active:scale-95 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    Continue shopping
                  </button>
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
