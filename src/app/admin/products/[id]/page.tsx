"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Part = {
  partId: string;
  sku: string;
  name: string;
  brand?: string;
  price?: number;
};

type Inventory = {
  sku: string;
  qtyOnHand: number;
  qtyReserved?: number;
  eta?: string | null;
  updatedAt?: string;
};

export default function EditProductPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  // 1) Load part
  const { data: partRes, mutate: mutatePart, isLoading: partLoading } =
    useSWR<{ part: Part }>(`/api/admin/parts/${id}`, api);

  const part = partRes?.part;

  // 2) Load inventory (based on part.sku)
  const invKey = useMemo(() => {
    if (!part?.sku) return null;
    // public endpoint you already have
    return `/api/inventory/${encodeURIComponent(part.sku)}`;
  }, [part?.sku]);

  const { data: invRes, mutate: mutateInv, isLoading: invLoading } =
    useSWR<Inventory>(invKey, api);

  // form states
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState<number | string>("");

  // inventory form states
  const [qtyOnHand, setQtyOnHand] = useState<number | string>("");
  const [qtyReserved, setQtyReserved] = useState<number | string>("");
  const [eta, setEta] = useState<string>("");

  useEffect(() => {
    if (part) {
      setSku(part.sku || "");
      setName(part.name || "");
      setBrand(part.brand || "");
      setPrice(part.price ?? "");
    }
  }, [part]);

  useEffect(() => {
    if (invRes && part?.sku) {
      setQtyOnHand(invRes.qtyOnHand ?? "");
      setQtyReserved(invRes.qtyReserved ?? "");
      setEta(invRes.eta ?? "");
    } else {
      // if inventory row doesn't exist (404 might throw), we keep empty defaults
      // qtyOnHand stays blank until admin sets it
    }
  }, [invRes, part?.sku]);

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();

    await api(`/api/admin/parts/${id}`, {
  method: "PUT",
  body: JSON.stringify({
    sku: sku.trim(),
    name: name.trim(),
    brand: brand.trim(),
    price: Number(price || 0),
  }),
});

    await mutatePart();
    // If SKU changed, inventory key changes. Refresh inventory.
    await mutateInv();

    router.push("/admin/products");
  }

  async function saveInventory() {
    if (!part?.sku && !sku.trim()) {
      alert("SKU is required to update inventory.");
      return;
    }

    const targetSku = (part?.sku || sku).trim();
    if (!targetSku) {
      alert("SKU is required to update inventory.");
      return;
    }

    await api(`/api/admin/inventory/${encodeURIComponent(targetSku)}`, {
      method: "PUT",
      body: JSON.stringify({
        qtyOnHand: Number(qtyOnHand || 0),
        // optional
        qtyReserved: qtyReserved === "" ? undefined : Number(qtyReserved || 0),
        eta: eta ? eta : null,
      }),
    });

    await mutateInv();
    alert("Inventory updated ✅");
  }

  if (partLoading) return <div>Loading…</div>;
  if (!partRes?.part) return <div className="text-red-600">Part not found</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Edit Product</h1>

      {/* DETAILS */}
      <form onSubmit={saveDetails} className="space-y-4 bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-slate-800">Product Details</h2>

        <input
          className="w-full border rounded-xl px-3 py-2"
          placeholder="SKU"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
        />
        <input
          className="w-full border rounded-xl px-3 py-2"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="w-full border rounded-xl px-3 py-2"
          placeholder="Brand"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
        />
        <input
          className="w-full border rounded-xl px-3 py-2"
          placeholder="Price"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />

        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl">
          Save Product
        </button>
      </form>

      {/* INVENTORY */}
      <div className="space-y-4 bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-800">Inventory</h2>
          <span className="text-sm text-slate-500">
            SKU: <span className="font-mono">{(part?.sku || sku || "—").trim()}</span>
          </span>
        </div>

        {invLoading ? (
          <div className="text-slate-600">Loading inventory…</div>
        ) : (
          <div className="text-sm text-slate-600">
            {invRes ? (
              <>Current: <b>{invRes.qtyOnHand ?? 0}</b> on hand, <b>{invRes.qtyReserved ?? 0}</b> reserved</>
            ) : (
              <>No inventory row found yet. Set values and save to create/update.</>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            className="border rounded-xl px-3 py-2"
            placeholder="Qty On Hand"
            type="number"
            value={qtyOnHand}
            onChange={(e) => setQtyOnHand(e.target.value)}
          />
          <input
            className="border rounded-xl px-3 py-2"
            placeholder="Qty Reserved (optional)"
            type="number"
            value={qtyReserved}
            onChange={(e) => setQtyReserved(e.target.value)}
          />
          <input
            className="border rounded-xl px-3 py-2"
            placeholder="ETA (optional)"
            value={eta}
            onChange={(e) => setEta(e.target.value)}
          />
          <button
            onClick={saveInventory}
            type="button"
            className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-3 py-2"
          >
            Save Inventory
          </button>
        </div>
      </div>
    </div>
  );
}
