"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

type QA = { q: string; a: string };

const DEFAULTS: QA[] = [
  {
    a: "Yes. Add items and services to the same cart. Digital items unlock instantly after payment, while physical products are shipped or prepared for pickup.",
    q: "Can I buy physical products and digital services in the same order?",
  },
  {
    q: "How does delivery work for physical items?",
    a: "You’ll see delivery options and estimated times at checkout. Once shipped, you can track your order status from your account.",
  },
  {
    q: "How do digital purchases get delivered?",
    a: "Downloads and service instructions appear in your order details immediately after payment. For booked services, you’ll receive scheduling details and updates.",
  },
  {
    q: "Do you support business / bulk orders?",
    a: "Yes. CloudRetail supports corporate accounts, bulk purchases, and invoice-ready order history for your finance team.",
  },
  {
    q: "What payment methods are accepted?",
    a: "We accept all major credit and debit cards, PayPal, Apple Pay, Google Pay, and various regional payment options.",
  },
  {
    q: "Is my payment information secure?",
    a: "Absolutely. We use industry-standard encryption and security protocols to protect your payment data during transactions.",
  },
];

function FaqItem({ q, a, defaultOpen = false }: QA & { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-gray-200 bg-white/70 p-0 backdrop-blur transition hover:bg-white">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold text-gray-900">{q}</span>
        <ChevronDownIcon
          className={`h-5 w-5 shrink-0 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <div className="px-5 pb-4 pt-0">
              <p className="text-sm leading-6 text-gray-600">{a}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ({ items = DEFAULTS }: { items?: QA[] }) {
  return (
    <section id="faq" className="bg-white py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">FAQ</h2>

        {/* container card */}
        <div className="mx-auto mt-10 space-y-3 rounded-2xl border border-gray-200 bg-white/60 p-3 backdrop-blur">
          {items.map((f, i) => (
            <FaqItem key={i} q={f.q} a={f.a} defaultOpen={i === 0} />
          ))}
        </div>
      </div>
    </section>
  );
}
