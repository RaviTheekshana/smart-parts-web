"use client";
import React, { useMemo } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { Filter } from "lucide-react";

export type VehicleSelection = {
  make?: string;
  model?: string;
  year?: number;
  engine?: string;
  transmission?: string;
  trim?: string;
};

type Props = {
  value?: VehicleSelection;
  onChange: (v: VehicleSelection) => void;
};

type FacetsData = {
  facets?: {
    makes?: string[];
    models?: string[];
    years?: number[];
  };
};

type VehicleRow = {
  make?: string;
  model?: string;
  year?: number;
  engine?: string;
  transmission?: string;
  trim?: string;
};

type VehiclesResponse = FacetsData | VehicleRow[] | { vehicles: VehicleRow[] };

function useVehicles(sel: VehicleSelection) {
  // Keep your original query behavior (if backend supports it)
  const params = new URLSearchParams();
  if (sel.make) params.set("make", sel.make);
  if (sel.model) params.set("model", sel.model);
  if (sel.year) params.set("year", String(sel.year));

  const key = "/api/vehicles" + (params.toString() ? `?${params.toString()}` : "");
  return useSWR<VehiclesResponse>(key, api);
}

export default function VehicleSelectorModern({ value, onChange }: Props) {
  const sel = value || {};
  const { data, error, isLoading } = useVehicles(sel);

  // ✅ Normalize response into either facets OR rows
  const rows: VehicleRow[] = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if ((data as any).vehicles && Array.isArray((data as any).vehicles)) return (data as any).vehicles;
    return [];
  }, [data]);

  // ✅ If API provides facets, use them. Otherwise derive from rows.
  const makes: string[] = useMemo(() => {
    const f = !Array.isArray(data) ? (data as FacetsData)?.facets?.makes : undefined;
    if (f?.length) return f;

    const set = new Set<string>();
    rows.forEach((r) => r.make && set.add(r.make));
    return Array.from(set).sort();
  }, [data, rows]);

  const models: string[] = useMemo(() => {
    const f = !Array.isArray(data) ? (data as FacetsData)?.facets?.models : undefined;
    if (f?.length) return f;

    const set = new Set<string>();
    rows
      .filter((r) => !sel.make || r.make === sel.make)
      .forEach((r) => r.model && set.add(r.model));
    return Array.from(set).sort();
  }, [data, rows, sel.make]);

  const years: number[] = useMemo(() => {
    const f = !Array.isArray(data) ? (data as FacetsData)?.facets?.years : undefined;
    if (f?.length) return f;

    const set = new Set<number>();
    rows
      .filter((r) => (!sel.make || r.make === sel.make) && (!sel.model || r.model === sel.model))
      .forEach((r) => typeof r.year === "number" && set.add(r.year));
    return Array.from(set).sort((a, b) => b - a);
  }, [data, rows, sel.make, sel.model]);

  function set<K extends keyof VehicleSelection>(k: K, v: VehicleSelection[K]) {
    const next: VehicleSelection = { ...sel, [k]: v };

    if (k === "make") {
      delete next.model;
      delete next.year;
      delete next.engine;
      delete next.transmission;
      delete next.trim;
    } else if (k === "model") {
      delete next.year;
      delete next.engine;
      delete next.transmission;
      delete next.trim;
    } else if (k === "year") {
      delete next.engine;
      delete next.transmission;
      delete next.trim;
    }

    onChange(next);
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-slate-200">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Filter className="w-5 h-5 text-blue-600" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800">Select Your Vehicle</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Make */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Make</label>
          <select
            value={sel.make || ""}
            onChange={(e) => set("make", e.target.value || undefined)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          >
            <option value="">Select Make</option>
            {makes.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Model */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Model</label>
          <select
            value={sel.model || ""}
            onChange={(e) => set("model", e.target.value || undefined)}
            disabled={!sel.make}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Select Model</option>
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Year */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Year</label>
          <select
            value={sel.year || ""}
            onChange={(e) => set("year", e.target.value ? Number(e.target.value) : undefined)}
            disabled={!sel.model}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Select Year</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Engine */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Engine</label>
          <input
            type="text"
            placeholder="e.g., 2.0L Turbo"
            value={sel.engine || ""}
            onChange={(e) => set("engine", e.target.value || undefined)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Transmission */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Transmission</label>
          <select
            value={sel.transmission || ""}
            onChange={(e) => set("transmission", e.target.value || undefined)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          >
            <option value="">Any</option>
            <option value="AT">Automatic</option>
            <option value="MT">Manual</option>
            <option value="CVT">CVT</option>
            <option value="DCT">DCT</option>
          </select>
        </div>

        {/* Trim */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Trim</label>
          <input
            type="text"
            placeholder="e.g., Sport, Limited"
            value={sel.trim || ""}
            onChange={(e) => set("trim", e.target.value || undefined)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {isLoading && <p className="text-sm text-gray-500 mt-2">Loading vehicle facets…</p>}
      {error && <p className="text-sm text-red-600 mt-2">Failed to load vehicle facets.</p>}
      {!isLoading && !error && makes.length === 0 && (
        <p className="text-sm text-amber-600 mt-2">
          No vehicle data returned from /api/vehicles (check API response shape).
        </p>
      )}
    </div>
  );
}
