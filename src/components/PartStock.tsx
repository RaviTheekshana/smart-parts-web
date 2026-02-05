"use client";

import useSWR from "swr";
import { api } from "@/lib/api";

type Inventory = {
  sku: string;
  qtyOnHand?: number;
  qtyReserved?: number;
};

export function PartStock({ sku }: { sku?: string }) {
  const { data: inv } = useSWR<Inventory>(
    sku ? `/api/inventory/${encodeURIComponent(sku)}` : null,
    api
  );

  const stock = Math.max(0, (inv?.qtyOnHand ?? 0) - (inv?.qtyReserved ?? 0));
  const stockClass =
    stock > 50 ? "text-green-600" : stock > 20 ? "text-yellow-600" : "text-red-600";

  return <span className={`font-semibold ${stockClass}`}>{stock} units</span>;
}
