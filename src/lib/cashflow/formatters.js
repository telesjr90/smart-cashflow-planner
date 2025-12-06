// src/lib/cashflow/formatters.js

export function toCents(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function fromCents(cents) {
  const n = Number(cents);
  if (!Number.isFinite(n)) return "0.00";
  return (n / 100).toFixed(2);
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
  }).format(amount || 0);
}

