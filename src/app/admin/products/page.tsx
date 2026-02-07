"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Plus, Edit, Trash2, RefreshCcw } from "lucide-react";

type Part = {
  _id?: string;      // old Mongo style (may be missing now)
  id?: string;       // you seed included "id"
  partId?: string;   // DynamoDB PK
  sku: string;
  name: string;
  brand?: string;
  price?: number;
  createdAt?: string;
};

type ListResponse = {
  parts: Part[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function qs(params: Record<string, any>) {
  const u = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") u.set(k, String(v));
  });
  const s = u.toString();
  return s ? "?" + s : "";
}

function fmt(v?: number) {
  if (typeof v !== "number") return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(v);
}

function rowKey(p: Part, idx: number) {
  return (p.partId || p.id || p._id || p.sku || String(idx)) as string;
}

export default function AdminProductsPage() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const key = useMemo(() => {
    return `/api/admin/parts` + qs({ query, page, limit });
  }, [query, page, limit]);

  const { data, isLoading, error, mutate } = useSWR<ListResponse>(key, api);

  const parts = data?.parts || [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? parts.length;

  async function handleDelete(pid: string) {
    if (!confirm("Delete this product?")) return;

    await api(`/api/admin/parts/${encodeURIComponent(pid)}`, {
      method: "DELETE",
    });

    // refresh list
    mutate();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="text-sm text-slate-500">
            Manage parts catalog (DynamoDB). Total: {total}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => mutate()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
          >
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </button>

          <button
            onClick={() => router.push("/admin/products/new")}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4" />
            New
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <input
            className="w-full border rounded-xl px-3 py-2"
            placeholder="Search by SKU, name, brand..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Page size</label>
          <select
            className="border rounded-xl px-3 py-2 bg-white"
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Errors */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">
          Error loading products. Check admin token/group and backend routes.
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-600">
              <th className="py-2 px-4">SKU</th>
              <th className="py-2 px-4">Name</th>
              <th className="py-2 px-4">Brand</th>
              <th className="py-2 px-4">Price</th>
              <th className="py-2 px-4">Created</th>
              <th className="py-2 px-4 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {parts.map((p, idx) => {
              // ✅ FIX: compute pid from DynamoDB fields
              const pid = (p.partId || p.id || p._id) as string | undefined;

              return (
                <tr
                  key={rowKey(p, idx)}
                  className="border-b border-slate-200 hover:bg-gray-50"
                >
                  <td className="py-2 px-4 font-mono">{p.sku}</td>
                  <td className="py-2 px-4">{p.name}</td>
                  <td className="py-2 px-4">{p.brand ?? "—"}</td>
                  <td className="py-2 px-4">{fmt(p.price)}</td>
                  <td className="py-2 px-4">
                    {p.createdAt
                      ? new Date(p.createdAt).toLocaleDateString()
                      : "—"}
                  </td>

                  <td className="py-2 px-4 text-right space-x-2">
                    <button
                      onClick={() => pid && router.push(`/admin/products/${pid}`)}
                      className="inline-flex items-center text-blue-600 hover:text-blue-800 disabled:text-slate-300"
                      disabled={!pid}
                      title={!pid ? "Missing product id" : undefined}
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => pid && handleDelete(pid)}
                      className="inline-flex items-center text-red-600 hover:text-red-800 disabled:text-slate-300"
                      disabled={!pid}
                      title={!pid ? "Missing product id" : undefined}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}

            {!isLoading && parts.length === 0 && (
              <tr>
                <td
                  className="py-6 px-4 text-center text-slate-500"
                  colSpan={6}
                >
                  No products found
                </td>
              </tr>
            )}

            {isLoading && (
              <tr>
                <td
                  className="py-6 px-4 text-center text-slate-500"
                  colSpan={6}
                >
                  Loading…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          Page <b>{page}</b> of <b>{totalPages}</b>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 rounded-xl border bg-white hover:bg-slate-50 disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>

          <button
            className="px-3 py-2 rounded-xl border bg-white hover:bg-slate-50 disabled:opacity-50"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
