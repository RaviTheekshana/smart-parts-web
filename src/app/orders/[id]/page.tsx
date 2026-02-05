"use client";

import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { api } from "@/lib/api";
import { ArrowLeft, PackageCheck } from "lucide-react";
import { useMemo } from "react";

type OrderItem = {
  sku: string;
  qty: number;
};

type OrderDetail = {
  orderId: string;
  status: string;
  items: OrderItem[];
  createdAt?: string;
  updatedAt?: string;
  paymentId?: string;
  stripeSessionId?: string;
};

type Part = {
  sku: string;
  name: string;
  price?: number;
};

export default function OrderDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  // Backend might return: { order: {...} } OR {...}
  const { data, error, isLoading } = useSWR<OrderDetail | { order: OrderDetail }>(
    `/api/orders/${id}`,
    api
  );

  // Load parts to enrich SKU -> name/price + compute totals
  const { data: parts } = useSWR<Part[]>("/api/parts", api);

  const order: OrderDetail | null = useMemo(() => {
    if (!data) return null;
    return (data as any).order ? (data as any).order : (data as any);
  }, [data]);

  const priceBySku = useMemo(() => {
    const map = new Map<string, { name: string; price: number }>();
    (parts || []).forEach((p) =>
      map.set(p.sku, { name: p.name ?? p.sku, price: Number(p.price ?? 0) })
    );
    return map;
  }, [parts]);

  const fmt = (v?: number) => {
    if (typeof v !== "number" || Number.isNaN(v)) return "රු0.00";
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: "LKR" }).format(v);
    } catch {
      return `රු${Number(v || 0).toFixed(2)}`;
    }
  };

  // Derived display items (keep same UI, just map sku->name/price)
  const displayItems = useMemo(() => {
    const items = order?.items ?? [];
    return items.map((it) => {
      const meta = priceBySku.get(it.sku);
      const name = meta?.name ?? it.sku ?? "Part";
      const unit = meta?.price ?? 0;
      const qty = Number(it.qty ?? 0);
      return {
        sku: it.sku,
        name,
        unit,
        qty,
        lineTotal: unit * qty,
      };
    });
  }, [order?.items, priceBySku]);

  const computedSubtotal = useMemo(() => {
    return displayItems.reduce((sum, it) => sum + it.lineTotal, 0);
  }, [displayItems]);

  const showSubtotal = computedSubtotal;
  const showTax = 0;
  const showGrand = showSubtotal + showTax;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-rose-500 dark:text-rose-400">
        Failed to load order.
      </div>
    );
  }

  if (isLoading || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 dark:text-slate-400">
        Loading order details...
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pt-28 p-6 bg-gradient-to-br from-slate-50 via-white to-slate-100
                    dark:from-slate-950 dark:via-slate-900 dark:to-slate-800"
    >
      {/* soft radial glow */}
      <div
        className="pointer-events-none fixed inset-0
                      bg-[radial-gradient(circle_at_50%_20%,rgba(120,119,198,0.10),transparent_50%)]
                      dark:bg-[radial-gradient(circle_at_50%_20%,rgba(120,119,198,0.05),transparent_50%)]"
      />
      <div
        className="relative mx-auto max-w-4xl
                      bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl
                      border border-slate-200/60 dark:border-slate-700/60
                      rounded-2xl shadow-2xl p-8"
      >
        <button
          onClick={() => router.push("/orders")}
          className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 mb-6 hover:underline"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to My Orders
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow">
            <PackageCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Order #{order.orderId.slice(-6).toUpperCase()}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Status:{" "}
              <span className="font-semibold text-green-600 dark:text-green-400">
                {order.status || "unknown"}
              </span>
            </p>
          </div>
        </div>

        {/* Items */}
        <div className="space-y-4">
          {displayItems.map((it, i) => (
            <div
              key={`${it.sku}-${i}`}
              className="rounded-xl border border-slate-200 dark:border-slate-700
                         bg-slate-50/70 dark:bg-slate-800/60 p-4"
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">{it.name}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Qty: {it.qty} • SKU: {it.sku}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-500 dark:text-slate-400">Price</div>
                  <div className="text-base font-semibold text-slate-900 dark:text-white">
                    {fmt(it.lineTotal)}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    ({fmt(it.unit)} each)
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="mt-8 border-t border-slate-200 dark:border-slate-700 pt-4">
          <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
            <span>Subtotal</span>
            <span className="text-slate-900 dark:text-white">{fmt(showSubtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
            <span>Tax</span>
            <span className="text-slate-900 dark:text-white">{fmt(showTax)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-slate-900 dark:text-white mt-2">
            <span>Total</span>
            <span>{fmt(showGrand)}</span>
          </div>
        </div>

        <div className="mt-6 text-sm text-slate-600 dark:text-slate-400">
          Payment:{" "}
          <span className="text-slate-900 dark:text-white">
            {order.paymentId ? "Paid" : "—"}
          </span>
          {order.stripeSessionId ? (
            <>
              {" "}
              • <span className="text-slate-900 dark:text-white">Stripe session</span>
            </>
          ) : null}
          <br />
          Placed on:{" "}
          <span className="text-slate-900 dark:text-white">
            {order.createdAt ? new Date(order.createdAt).toLocaleString() : "Unknown date"}
          </span>
        </div>
      </div>
    </div>
  );
}
