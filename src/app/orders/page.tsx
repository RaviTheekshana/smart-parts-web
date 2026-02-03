import { Suspense } from "react";
import OrdersClient from "./OrdersClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen pt-24 flex items-center justify-center">Loading…</div>}>
      <OrdersClient />
    </Suspense>
  );
}
