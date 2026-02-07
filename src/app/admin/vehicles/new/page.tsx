"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function NewVehiclePage() {
  const router = useRouter();

  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState<string>("");
  const [trim, setTrim] = useState("");
  const [engine, setEngine] = useState("");
  const [transmission, setTransmission] = useState("");
  const [fuel, setFuel] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const yearNum = year.trim() ? Number(year) : undefined;

    await api("/api/admin/vehicles", {
      method: "POST",
      body: JSON.stringify({
        make: make || undefined,
        model: model || undefined,
        year: Number.isFinite(yearNum as number) ? yearNum : undefined,
        trim: trim || undefined,
        engine: engine || undefined,
        transmission: transmission || undefined,
        fuel: fuel || undefined,
      }),
    });

    router.push("/admin/vehicles");
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create Vehicle</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Make (e.g., Toyota)"
          value={make}
          onChange={(e) => setMake(e.target.value)}
          className="w-full border rounded-xl px-3 py-2"
        />
        <input
          type="text"
          placeholder="Model (e.g., Corolla)"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full border rounded-xl px-3 py-2"
        />
        <input
          type="number"
          placeholder="Year (e.g., 2018)"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="w-full border rounded-xl px-3 py-2"
        />
        <input
          type="text"
          placeholder="Trim (optional)"
          value={trim}
          onChange={(e) => setTrim(e.target.value)}
          className="w-full border rounded-xl px-3 py-2"
        />
        <input
          type="text"
          placeholder="Engine (optional)"
          value={engine}
          onChange={(e) => setEngine(e.target.value)}
          className="w-full border rounded-xl px-3 py-2"
        />
        <input
          type="text"
          placeholder="Transmission (optional)"
          value={transmission}
          onChange={(e) => setTransmission(e.target.value)}
          className="w-full border rounded-xl px-3 py-2"
        />
        <input
          type="text"
          placeholder="Fuel (optional)"
          value={fuel}
          onChange={(e) => setFuel(e.target.value)}
          className="w-full border rounded-xl px-3 py-2"
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded-xl hover:bg-blue-700"
        >
          Create
        </button>
      </form>
    </div>
  );
}
