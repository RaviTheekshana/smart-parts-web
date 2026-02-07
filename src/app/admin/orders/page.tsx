"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCcw } from "lucide-react";

type OrderItem = { sku: string; qty: number };

type OrderRow = {
  orderId: string;
  userId?: string;
  userEmail?: string; // optional if you ever add it later
  status: string;
  createdAt?: string;
  items?: OrderItem[];
};

type OrdersResponse = OrderRow[] | { orders: OrderRow[] };

type Part = { sku: string; name: string; price?: number };

export default function AdminOrdersPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // ✅ Fetch admin orders (most likely returns ARRAY)
  const { data, error, isLoading, mutate } = useSWR<OrdersResponse>(
    `/api/admin/orders`,
    api
  );

  // Optional: load parts to compute totals by SKU
  const { data: parts } = useSWR<Part[]>("/api/parts", api);

  const priceBySku = useMemo(() => {
    const map = new Map<string, number>();
    (parts || []).forEach((p) => map.set(p.sku, Number(p.price ?? 0)));
    return map;
  }, [parts]);

  const allOrders: OrderRow[] = useMemo(() => {
    if (!data) return [];
    return Array.isArray(data) ? data : (data.orders ?? []);
  }, [data]);

  // client-side filter: query + status
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const st = status.trim().toLowerCase();

    return allOrders.filter((o) => {
      const id = (o.orderId ?? "").toLowerCase();
      const email = (o.userEmail ?? "").toLowerCase();
      const uid = (o.userId ?? "").toLowerCase();
      const s = (o.status ?? "").toLowerCase();

      const matchesQuery = !q || id.includes(q) || email.includes(q) || uid.includes(q);
      const matchesStatus = !st || s === st || s.includes(st);

      return matchesQuery && matchesStatus;
    });
  }, [allOrders, query, status]);

  // pagination (client-side)
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const pageSafe = Math.min(Math.max(1, page), totalPages);

  const orders = useMemo(() => {
    const start = (pageSafe - 1) * limit;
    return filtered.slice(start, start + limit);
  }, [filtered, pageSafe, limit]);

  // keep page valid when filters change
  useMemo(() => {
    if (page !== pageSafe) setPage(pageSafe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSafe]);

  const fmtMoney = (n: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: "LKR" }).format(n ?? 0);

  function computeGrand(o: OrderRow): number {
    const items = o.items ?? [];
    return items.reduce((sum, it) => {
      const price = priceBySku.get(it.sku) ?? 0;
      return sum + price * Number(it.qty ?? 0);
    }, 0);
  }

  if (error) {
    return (
      <div className="p-6 text-red-600">
        Failed to load admin orders: {String((error as any)?.message ?? error)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
        <div className="flex gap-2">
          <input
            className="border rounded-xl px-3 py-2 text-sm"
            placeholder="Search userId / email / orderId…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="border rounded-xl px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            <option value="pending">pending</option>
            <option value="paid">paid</option>
            <option value="fulfilled">fulfilled</option>
            <option value="cancelled">cancelled</option>
          </select>
          <button
            onClick={() => mutate()}
            className="inline-flex items-center gap-2 border px-3 py-2 rounded-xl text-sm"
          >
            <RefreshCcw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-600">
              <th className="py-2 px-4">Order</th>
              <th className="py-2 px-4">Customer</th>
              <th className="py-2 px-4">Status</th>
              <th className="py-2 px-4">Total</th>
              <th className="py-2 px-4">Created</th>
              <th className="py-2 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const id = o.orderId || "";
              const grand = computeGrand(o);

              return (
                <tr key={id} className="border-b border-slate-200">
                  <td className="py-2 px-4 font-mono">
                    {id ? id.slice(-6).toUpperCase() : "—"}
                  </td>
                  <td className="py-2 px-4">{o.userEmail ?? o.userId ?? "—"}</td>
                  <td className="py-2 px-4 capitalize">{o.status}</td>
                  <td className="py-2 px-4">{fmtMoney(grand)}</td>
                  <td className="py-2 px-4">
                    {o.createdAt ? new Date(o.createdAt).toLocaleString() : "—"}
                  </td>
                  <td className="py-2 px-4 text-right">
                    <button
                      onClick={() => router.push(`/admin/orders/${id}`)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      View
                    </button>
                  </td>
                </tr>
              );
            })}

            {!isLoading && orders.length === 0 && (
              <tr>
                <td className="py-4 px-4 text-center text-slate-500" colSpan={6}>
                  No orders
                </td>
              </tr>
            )}

            {isLoading && (
              <tr>
                <td className="py-4 px-4 text-center text-slate-500" colSpan={6}>
                  Loading…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* pagination */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-slate-600">
          Page {pageSafe} / {totalPages} • {total} results
        </div>
        <div className="flex items-center gap-2">
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="border rounded-xl px-2 py-1 text-sm"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
          <button
            className="border rounded-xl px-3 py-1 disabled:opacity-50"
            disabled={pageSafe <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <button
            className="border rounded-xl px-3 py-1 disabled:opacity-50"
            disabled={pageSafe >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
