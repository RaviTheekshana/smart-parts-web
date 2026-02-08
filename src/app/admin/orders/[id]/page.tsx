"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Item = {
  partId?: string;
  name?: string;
  sku?: string;
  priceAtOrder?: number;
  qty: number;
  locationId?: string;
};

type Order = {
  _id?: string;
  orderId?: string;
  userId?: string;
  status?: string;
  totals?: { subtotal: number; tax?: number; grand: number };
  items?: Item[];
  payment?: { provider?: string; status?: string; sessionId?: string; intentId?: string };
  stripeSessionId?: string;
  createdAt?: string;
};

type Part = {
  id?: string;
  partId?: string;
  sku: string;
  name?: string;
  brand?: string;
  price?: number;
};

type PartsResponse = Part[] | { parts?: Part[]; items?: Part[]; data?: Part[] };

export default function AdminOrderDetail() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const { data, mutate } = useSWR<{ order: Order }>(`/api/admin/orders/${id}`, api);
  const order: Order | null = data?.order ?? null;

  // ✅ Fetch parts for sku -> price/name mapping
  const { data: partsData } = useSWR<PartsResponse>(`/api/parts`, api);

  // ✅ hooks MUST be called every render (no early return before them)

  const partsList: Part[] = useMemo(() => {
    if (!partsData) return [];
    return Array.isArray(partsData)
      ? partsData
      : (partsData.parts || partsData.items || partsData.data || []);
  }, [partsData]);

  const partsBySku = useMemo(() => {
    const m = new Map<string, Part>();
    for (const p of partsList) {
      if (p?.sku) m.set(String(p.sku).trim(), p);
    }
    return m;
  }, [partsList]);

  const items: Item[] = useMemo(() => {
    return Array.isArray(order?.items) ? order!.items! : [];
  }, [order]);

  const enrichedItems = useMemo(() => {
    return items.map((it) => {
      const sku = String(it.sku ?? "").trim();
      const part = sku ? partsBySku.get(sku) : undefined;

      const unit =
        typeof it.priceAtOrder === "number"
          ? it.priceAtOrder
          : typeof part?.price === "number"
          ? part.price
          : 0;

      return {
        ...it,
        sku: sku || it.sku,
        name: it.name ?? part?.name,
        priceResolved: unit,
      };
    });
  }, [items, partsBySku]);

  const computedSubtotal = useMemo(() => {
    return enrichedItems.reduce((sum, it: any) => sum + (it.priceResolved ?? 0) * (it.qty ?? 0), 0);
  }, [enrichedItems]);

  const fmt = (n?: number) =>
    typeof n === "number"
      ? new Intl.NumberFormat(undefined, { style: "currency", currency: "LKR" }).format(n)
      : "-";

  const statusMap: Record<string, string> = {
    pending: "CREATED",
    paid: "PAID",
    fulfilled: "RESERVED",
    cancelled: "CANCELLED",
  };

  async function updateStatus(uiStatus: string) {
    const backendStatus = statusMap[uiStatus] ?? String(uiStatus).trim().toUpperCase();

    setSaving(true);
    try {
      await api(`/api/admin/orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: backendStatus }),
      });
      await mutate();
    } finally {
      setSaving(false);
    }
  }

  async function refund() {
    if (!confirm("Issue Stripe refund and cancel order?")) return;
    setSaving(true);
    try {
      await api(`/api/admin/orders/${id}/refund`, { method: "POST" });
      await mutate();
    } finally {
      setSaving(false);
    }
  }

  // ✅ now safe to render loading AFTER hooks
  if (!order) return <div>Loading…</div>;

  const orderId = String(order.orderId ?? order._id ?? id ?? "");

  const subtotal =
    typeof order.totals?.subtotal === "number" ? order.totals.subtotal : computedSubtotal;
  const tax = typeof order.totals?.tax === "number" ? order.totals.tax : 0;
  const grand =
    typeof order.totals?.grand === "number" ? order.totals.grand : subtotal + tax;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">
          Order #{orderId.slice(-6).toUpperCase()}
        </h1>
        <button className="border rounded-xl px-3 py-1" onClick={() => router.push("/admin/orders")}>
          Back
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <div className="text-xs text-slate-500">Status</div>
            <div className="text-base font-semibold capitalize">{order.status ?? "—"}</div>
          </div>

          <select
            className="border rounded-xl px-3 py-2 text-sm"
            onChange={(e) => updateStatus(e.target.value)}
            defaultValue=""
            disabled={saving}
          >
            <option value="" disabled>
              Update status…
            </option>
            <option value="pending">pending</option>
            <option value="paid">paid</option>
            <option value="fulfilled">fulfilled</option>
            <option value="cancelled">cancelled</option>
          </select>

          {order.payment?.provider === "stripe" && order.status !== "CANCELLED" && (
            <button
              onClick={refund}
              disabled={saving}
              className="ml-auto bg-red-600 text-white px-3 py-2 rounded-xl hover:bg-red-700"
            >
              Refund (Stripe)
            </button>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm bg-white">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-600">
                <th className="py-2 px-4">SKU</th>
                <th className="py-2 px-4">Name</th>
                <th className="py-2 px-4">Qty</th>
                <th className="py-2 px-4">Unit</th>
                <th className="py-2 px-4">Location</th>
                <th className="py-2 px-4">Line</th>
              </tr>
            </thead>
            <tbody>
              {enrichedItems.map((it: any, i: number) => (
                <tr key={i} className="border-b border-slate-200">
                  <td className="py-2 px-4 font-mono">{it.sku ?? "—"}</td>
                  <td className="py-2 px-4">{it.name ?? "—"}</td>
                  <td className="py-2 px-4">{it.qty}</td>
                  <td className="py-2 px-4">{fmt(it.priceResolved)}</td>
                  <td className="py-2 px-4">{it.locationId ?? "—"}</td>
                  <td className="py-2 px-4">{fmt((it.priceResolved ?? 0) * it.qty)}</td>
                </tr>
              ))}

              {enrichedItems.length === 0 && (
                <tr>
                  <td className="py-4 px-4 text-center text-slate-500" colSpan={6}>
                    No items
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <Stat label="Subtotal" value={fmt(subtotal)} />
          <Stat label="Tax" value={fmt(tax)} />
          <Stat label="Grand Total" value={fmt(grand)} />
        </div>

        <div className="text-sm text-slate-600">
          Payment: {order.payment?.provider ?? "—"} • {order.payment?.status ?? "—"}
          <br />
          Placed: {order.createdAt ? new Date(order.createdAt).toLocaleString() : "—"}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
