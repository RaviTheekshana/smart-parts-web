import { Suspense } from "react";
import SuccessClient from "./SuccessClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen pt-24 flex items-center justify-center">Loading…</div>}>
      <SuccessClient />
    </Suspense>
  );
}
