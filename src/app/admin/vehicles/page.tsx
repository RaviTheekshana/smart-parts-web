"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, RefreshCcw } from "lucide-react";
import { useMemo, useState } from "react";

type Vehicle = {
  _id?: string;
  id?: string; // some APIs return id instead of _id
  vehicleId?: string;
  make?: string;
  model?: string;
  year?: number;
  trim?: string;
  engine?: string;
  transmission?: string;
  fuel?: string;
  createdAt?: string;
};

type AdminVehiclesResponse =
  | Vehicle[]
  | { vehicles?: Vehicle[]; items?: Vehicle[]; data?: Vehicle[]; total?: number };

const LIMIT = 20;

export default function VehiclesPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const router = useRouter();

  const { data, mutate, isLoading } = useSWR<AdminVehiclesResponse>(
    `/api/admin/vehicles?query=${encodeURIComponent(query)}`,
    api
  );

  const vehiclesAll: Vehicle[] = Array.isArray(data)
    ? data
    : (data?.vehicles || data?.items || data?.data || []);

  // ✅ stable id getter for edit/delete
  const getId = (v: Vehicle) => v._id ?? v.id ?? v.vehicleId ?? "";

  // ✅ client-side pagination (because backend returns all)
  const total = vehiclesAll.length;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  // keep page in range when query changes / data changes
  const currentPage = Math.min(page, totalPages);

  const vehicles = useMemo(() => {
    const start = (currentPage - 1) * LIMIT;
    const end = start + LIMIT;
    return vehiclesAll.slice(start, end);
  }, [vehiclesAll, currentPage]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this vehicle?")) return;
    await api(`/api/admin/vehicles/${id}`, { method: "DELETE" });
    // After delete, refresh and also fix page if last item removed
    await mutate();
    // If deleting last item of last page, step back a page
    const newTotal = Math.max(0, total - 1);
    const newTotalPages = Math.max(1, Math.ceil(newTotal / LIMIT));
    setPage((p) => Math.min(p, newTotalPages));
  }

  const rowKey = (v: Vehicle, idx: number) => {
    const vid = getId(v);
    const base = vid
      ? String(vid)
      : `${v.make ?? ""}-${v.model ?? ""}-${v.year ?? ""}`.trim() || "row";
    return `${base}-${(currentPage - 1) * LIMIT + idx}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Vehicles</h1>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1); // ✅ reset to page 1 when searching
            }}
            placeholder="Search make, model, year..."
            className="border rounded-xl px-3 py-2 text-sm"
          />
          <button
            onClick={() => router.push("/admin/vehicles/new")}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-sm"
          >
            <Plus className="w-4 h-4" /> New
          </button>
          <button
            onClick={() => mutate()}
            className="inline-flex items-center gap-2 border px-3 py-2 rounded-xl text-sm"
          >
            <RefreshCcw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white/70 backdrop-blur">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-600">
              <th className="py-2 px-4">Make</th>
              <th className="py-2 px-4">Model</th>
              <th className="py-2 px-4">Year</th>
              <th className="py-2 px-4">Trim</th>
              <th className="py-2 px-4">Engine</th>
              <th className="py-2 px-4">Created</th>
              <th className="py-2 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v, idx) => {
              const vid = getId(v);
              return (
                <tr key={rowKey(v, idx)} className="border-b border-slate-200 hover:bg-slate-100">
                  <td className="py-2 px-4">{v.make ?? "—"}</td>
                  <td className="py-2 px-4">{v.model ?? "—"}</td>
                  <td className="py-2 px-4">{typeof v.year === "number" ? v.year : "—"}</td>
                  <td className="py-2 px-4">{v.trim ?? "—"}</td>
                  <td className="py-2 px-4">{v.engine ?? "—"}</td>
                  <td className="py-2 px-4">{v.createdAt ? new Date(v.createdAt).toLocaleDateString() : "—"}</td>
                  <td className="py-2 px-4 text-right space-x-2">
                    <button
                      onClick={() => vid && router.push(`/admin/vehicles/${vid}`)}
                      className="inline-flex items-center text-blue-600 hover:text-blue-800"
                      disabled={!vid}
                      title={!vid ? "Missing vehicle id" : undefined}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => vid && handleDelete(vid)}
                      className="inline-flex items-center text-red-600 hover:text-red-800"
                      disabled={!vid}
                      title={!vid ? "Missing vehicle id" : undefined}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}

            {vehiclesAll.length === 0 && !isLoading && (
              <tr>
                <td className="py-4 px-4 text-center text-slate-500" colSpan={7}>
                  No vehicles found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ✅ Pagination footer (same style as your products footer) */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-slate-600">
          Page {currentPage} / {totalPages}, Total of {total} results
        </div>
        <div className="flex items-center gap-2">
          <button
            className="border rounded-xl px-3 py-1 disabled:opacity-50"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <button
            className="border rounded-xl px-3 py-1 disabled:opacity-50"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
