"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import { useMemo } from "react";
import {
  Users,
  Package,
  Receipt,
  Car,
  Warehouse,
  TrendingUp,
} from "lucide-react";

type AnyObj = Record<string, any>;

function asArray(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;

  // common shapes
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.parts)) return data.parts;
  if (Array.isArray(data.orders)) return data.orders;
  if (Array.isArray(data.users)) return data.users;
  if (Array.isArray(data.vehicles)) return data.vehicles;
  if (Array.isArray(data.inventory)) return data.inventory;

  return [];
}

function toNumber(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmtMoney(v: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(v);
}

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function AdminPage() {
  // Admin endpoints
  const usersQ = useSWR("/api/admin/users", api);
  const partsQ = useSWR("/api/admin/parts?limit=100&page=1", api);
  const ordersQ = useSWR("/api/admin/orders", api);
  const vehiclesQ = useSWR("/api/admin/vehicles", api);
  const inventoryQ = useSWR("/api/admin/inventory", api);

  const loading =
    usersQ.isLoading ||
    partsQ.isLoading ||
    ordersQ.isLoading ||
    vehiclesQ.isLoading ||
    inventoryQ.isLoading;

  const error =
    usersQ.error || partsQ.error || ordersQ.error || vehiclesQ.error || inventoryQ.error;

  const users = useMemo(() => asArray(usersQ.data), [usersQ.data]);
  const parts = useMemo(() => asArray(partsQ.data), [partsQ.data]);
  const orders = useMemo(() => asArray(ordersQ.data), [ordersQ.data]);
  const vehicles = useMemo(() => asArray(vehiclesQ.data), [vehiclesQ.data]);
  const inventory = useMemo(() => asArray(inventoryQ.data), [inventoryQ.data]);

  // ---- Metrics ----
  const counts = useMemo(() => {
    const paidOrders = orders.filter((o) =>
      String(o.status || "").toUpperCase() === "PAID"
    ).length;

    const lowStock = inventory.filter((i) => toNumber(i.qtyOnHand) <= 10).length;

    return {
      users: users.length,
      parts: parts.length,
      orders: orders.length,
      paidOrders,
      vehicles: vehicles.length,
      lowStock,
    };
  }, [users, parts, orders, vehicles, inventory]);

  // Orders by status
  const ordersByStatus = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders) {
      const s = String(o.status || "UNKNOWN").toUpperCase();
      map.set(s, (map.get(s) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }, [orders]);

  // Revenue last 30 days (paid only)
  const revenue30d = useMemo(() => {
    const today = new Date();
    const days: { day: string; total: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push({ day: isoDay(d), total: 0 });
    }
    const byDay = new Map(days.map((x) => [x.day, x]));

    for (const o of orders) {
      const status = String(o.status || "").toUpperCase();
      if (status !== "PAID") continue;

      const createdAt = o.createdAt ? new Date(o.createdAt) : null;
      if (!createdAt || isNaN(createdAt.getTime())) continue;

      const day = isoDay(createdAt);
      const slot = byDay.get(day);
      if (!slot) continue;

      // your order may store total under grand or totals.grand
      const grand =
        toNumber(o.grand) ||
        toNumber(o.total) ||
        toNumber(o.totals?.grand) ||
        0;

      slot.total += grand;
    }

    const total = days.reduce((sum, d) => sum + d.total, 0);
    const max = Math.max(1, ...days.map((d) => d.total));

    return { total, max, days };
  }, [orders]);

  // Low stock table (top 8)
  const lowStockTop = useMemo(() => {
    const rows = inventory
      .map((i) => ({
        sku: String(i.sku || ""),
        qtyOnHand: toNumber(i.qtyOnHand),
        qtyReserved: toNumber(i.qtyReserved),
      }))
      .filter((r) => r.sku)
      .sort((a, b) => a.qtyOnHand - b.qtyOnHand)
      .slice(0, 8);

    return rows;
  }, [inventory]);

  return (
    <div className="space-y-6 bg-white text-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-slate-500">
            System summary from live APIs (Users, Parts, Orders, Vehicles, Inventory)
          </p>
        </div>

        <div className="text-right">
          {loading ? (
            <div className="text-sm text-slate-500">Loading…</div>
          ) : error ? (
            <div className="text-sm text-red-600">
              Error: {String(error?.message || error)}
            </div>
          ) : (
            <div className="text-sm text-green-700 font-medium">Live</div>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card icon={<Users className="w-5 h-5" />} label="Users" value={counts.users} />
        <Card icon={<Package className="w-5 h-5" />} label="Parts" value={counts.parts} />
        <Card icon={<Receipt className="w-5 h-5" />} label="Orders" value={counts.orders} />
        <Card icon={<TrendingUp className="w-5 h-5" />} label="Paid Orders" value={counts.paidOrders} />
        <Card icon={<Car className="w-5 h-5" />} label="Vehicles Models" value={counts.vehicles} />
        <Card icon={<Warehouse className="w-5 h-5" />} label="Low Stock (≤ 10)" value={counts.lowStock} />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Orders by Status */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Orders by Status</h2>
            <span className="text-xs text-slate-500">/admin/orders</span>
          </div>

          {ordersByStatus.length === 0 ? (
            <div className="text-sm text-slate-500">No data</div>
          ) : (
            <div className="space-y-2">
              {(() => {
                const max = Math.max(1, ...ordersByStatus.map((x) => x.count));
                return ordersByStatus.map((x) => (
                  <div key={x.status} className="flex items-center gap-3">
                    <div className="w-28 text-xs font-medium text-slate-700">
                      {x.status}
                    </div>
                    <div className="flex-1 h-3 rounded bg-slate-100 overflow-hidden">
                      <div
                        className="h-3 bg-blue-600"
                        style={{ width: `${(x.count / max) * 100}%` }}
                      />
                    </div>
                    <div className="w-10 text-right text-xs text-slate-600">
                      {x.count}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>

        {/* Revenue 30d */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Revenue (Paid) — Last 30 Days</h2>
            <span className="text-xs text-slate-500">Derived from /admin/orders</span>
          </div>

          <div className="flex items-baseline justify-between mb-2">
            <div className="text-2xl font-bold text-slate-900">
              {fmtMoney(revenue30d.total)}
            </div>
            <div className="text-xs text-slate-500">PAID only</div>
          </div>

          {/* mini bar chart */}
          <div className="flex items-end gap-[2px] h-24 border border-slate-100 rounded-lg p-2 bg-slate-50">
            {revenue30d.days.map((d) => (
              <div
                key={d.day}
                className="flex-1 rounded-sm bg-indigo-600"
                title={`${d.day}: ${fmtMoney(d.total)}`}
                style={{
                  height: `${(d.total / revenue30d.max) * 100}%`,
                  minHeight: d.total > 0 ? 2 : 0,
                }}
              />
            ))}
          </div>

          <div className="mt-2 text-xs text-slate-500">
            Hover bars to see daily totals.
          </div>
        </div>
      </div>

      {/* Low stock table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Low Stock (Top 8)</h2>
          <span className="text-xs text-slate-500">/admin/inventory</span>
        </div>

        {lowStockTop.length === 0 ? (
          <div className="text-sm text-slate-500">No inventory rows</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className="py-2 pr-2">SKU</th>
                  <th className="py-2 pr-2">On Hand</th>
                  <th className="py-2 pr-2">Reserved</th>
                </tr>
              </thead>
              <tbody>
                {lowStockTop.map((r) => (
                  <tr key={r.sku} className="border-b last:border-b-0">
                    <td className="py-2 pr-2 font-mono text-xs">{r.sku}</td>
                    <td className="py-2 pr-2 font-semibold">
                      <span className={r.qtyOnHand <= 10 ? "text-red-600" : ""}>
                        {r.qtyOnHand}
                      </span>
                    </td>
                    <td className="py-2 pr-2 text-slate-700">{r.qtyReserved}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-3 text-xs text-slate-500">
          Stock can be updated using: <span className="font-mono">PUT /admin/inventory/{"{sku}"}</span>
        </div>
      </div>
    </div>
  );
}

function Card({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number | string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 flex items-center gap-4 shadow-sm">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center">
        {icon}
      </div>
      <div>
        <div className="text-sm text-slate-500">{label}</div>
        <div className="text-xl font-semibold text-slate-900">{value ?? "—"}</div>
      </div>
    </div>
  );
}
