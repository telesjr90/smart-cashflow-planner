import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  ListChecks,
  AlertTriangle,
  CheckCircle2,
  Circle,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Pencil,
} from "lucide-react";
import { safeLocalStorage, makeScopedKey } from "../lib/safeLocalStorage";

/**
 * Patched Bills page for Smart Cash‑Flow Planner
 *
 * This file is based on the upstream `src/pages/Bills.jsx` but includes fixes
 * for the month scroller bug (QA issue #4).  Specifically, when the
 * household start date changes (e.g. when creating a new household), the
 * selected month in the Bills page should reset to the current month
 * relative to the new start date.  Without this, the scroller can jump
 * ahead to a different year based on a stale value saved in localStorage.
 *
 * Additionally, when saving a new bill or editing an existing one, the
 * scroller is now anchored to the month of the saved bill (typically the
 * current month) and persists this value to localStorage.  This prevents
 * confusion where the UI remains on an unrelated month after adding a bill.
 */

const fmt = (v) =>
  `$${Number(v ?? 0).toLocaleString("en-CA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// ---------- date helpers ----------
function clampDueDayToMonth(year, monthIndex0, dueDay) {
  const lastDay = new Date(year, monthIndex0 + 1, 0).getDate();
  return Math.min(Math.max(1, dueDay || 1), lastDay);
}

function monthNamesFrom(startDate, monthsCount) {
  const start = new Date(startDate + "T00:00:00");
  const out = [];
  for (let i = 0; i < monthsCount; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    out.push(
      d.toLocaleDateString("en-CA", { month: "short", year: "numeric" })
    );
  }
  return out;
}

function currentMonthIndex(startDate) {
  const today = new Date();
  const start = new Date(startDate + "T00:00:00");
  const months =
    (today.getFullYear() - start.getFullYear()) * 12 +
    (today.getMonth() - start.getMonth());
  return Math.max(0, Math.min(13, months)); // clamp 0..13
}

// ---------- small UI blocks ----------
function Segmented({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-full bg-slate-100 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1 text-xs rounded-full transition-colors ${
            value === o.value
              ? "bg-white shadow-sm text-slate-900"
              : "text-slate-500"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function MonthScroller({ months, selected, onChange }) {
  return (
    <div className="mx-4 mt-3 flex items-center gap-2">
      <button
        className="p-1 rounded-full hover:bg-slate-100"
        onClick={() => onChange(Math.max(0, selected - 1))}
        aria-label="Previous month"
      >
        <ChevronLeft size={16} className="text-slate-500" />
      </button>
      <div className="flex-1 flex justify-center gap-1 overflow-x-auto no-scrollbar">
        {months.map((label, idx) => (
          <button
            key={label}
            onClick={() => onChange(idx)}
            className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${
              idx === selected
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <button
        className="p-1 rounded-full hover:bg-slate-100"
        onClick={() => onChange(Math.min(months.length - 1, selected + 1))}
        aria-label="Next month"
      >
        <ChevronRight size={16} className="text-slate-500" />
      </button>
    </div>
  );
}

function SummaryTile({ label, value, danger }) {
  return (
    <div className="flex-1 rounded-2xl bg-slate-50 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div
        className={`mt-1 text-sm font-semibold ${
          danger ? "text-rose-600" : "text-slate-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function PastDueBanner({ items, memberNames }) {
  if (!items.length) return null;
  const preview = items.slice(0, 3);
  const ownerName = (payer) =>
    payer === "H"
      ? memberNames?.H || "Partner H"
      : payer === "W"
      ? memberNames?.W || "Partner W"
      : "Auto";
  return (
    <div className="mx-4 mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-3">
      <div className="flex items-center gap-2 text-rose-700">
        <AlertTriangle size={16} />
        <div className="text-sm font-semibold">
          {items.length} overdue bill{items.length > 1 ? "s" : ""} in this
          household
        </div>
      </div>
      <div className="mt-2 space-y-1">
        {preview.map((it) => (
          <div
            key={`${it.id}-${it.monthIndex}`}
            className="text-xs text-rose-700 flex items-center justify-between"
          >
            <div className="truncate">
              <span className="font-semibold">{it.name}</span> • Due {String(
                it.dueDay
              ).padStart(2, "0")} • {ownerName(it.payer)}
            </div>
            <div>{fmt(it.amount)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BulkActions({ disabled, onMarkAllPaid, onMarkAllUnpaid }) {
  if (disabled) return null;
  return (
    <div className="mx-4 mt-3 flex items-center justify-end gap-2">
      <button
        className="text-xs px-3 py-1 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
        onClick={onMarkAllUnpaid}
      >
        Mark all unpaid
      </button>
      <button
        className="text-xs px-3 py-1 rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
        onClick={onMarkAllPaid}
      >
        Mark all paid
      </button>
    </div>
  );
}

// ---------- main component ----------
export default function Bills({
  role = "H",
  startDate = "2025-11-15",
  bills = [],
  paidFlags = {},
  personScope = "self",
  // Default partner names.  Use generic labels instead of demo names.
  memberNames = { H: "Partner H", W: "Partner W" },
  accounts = [],
  residualAccountId,
  categoryBudgets = {}, // drives the category dropdown
  onTogglePaid,
  onBulkMark,
  onChangeBillAccount,
  onUpdateBills,
  /** Optional household identifier used to namespace localStorage keys.
   *  When provided, the selected month will be persisted under
   *  `billsSelectedMonth:<householdId>` instead of a global key.
   *  This prevents cross-household interference and stale values.
   */
  householdId,
}) {
  // Guard against undefined or falsy start dates.  When no startDate is
  // provided (e.g. immediately after creating a new household) the month
  // helper functions will throw. Render a friendly message instructing the
  // user to set a start date in Settings instead of crashing the app.
  if (!startDate) {
    return (
      <div className="p-4 text-sm text-slate-700">
        Start date is not defined. Please set a start date in Settings to
        begin managing your bills.
      </div>
    );
  }
  const billsArr = Array.isArray(bills) ? bills : [];

  // --- Editing state (shared across empty and normal views) ---
  // Holds the ID of the bill currently being edited ("new" for new bills)
  const [editingId, setEditingId] = useState(null);
  // Holds the draft values for the bill being created/edited
  const [draft, setDraft] = useState(null);

  // Determine whether any accounts exist.  Compute this early so the empty
  // state can show account selector if needed.
  const hasAccounts = accounts && accounts.length > 0;

  // ---------- budget category options (from categoryBudgets + visibility rules) ----------
  const budgetOptions = useMemo(() => {
    const raw = categoryBudgets || {};
    const arr = Object.entries(raw).map(([key, cfg]) => ({
      key,
      label: cfg?.label || key,
      scope: cfg?.scope || "shared",
      owner: cfg?.owner ?? null,
    }));
    // If role is unknown/other, show all categories (admin-style)
    if (role !== "H" && role !== "W") return arr;
    // Otherwise apply same visibility rule as Settings:
    // - show all shared
    // - show personal only if owner === role
    return arr.filter((b) => {
      const scope = b.scope || "shared";
      if (scope === "shared") return true;
      if (!b.owner) return true; // legacy entries without owner remain visible
      return b.owner === role;
    });
  }, [categoryBudgets, role]);

  const categoryLabelForKey = useCallback(
    (key) => {
      if (!key) return "";
      const found = budgetOptions.find((b) => b.key === key);
      return found?.label || "";
    },
    [budgetOptions]
  );

  const categoryKeyForBill = useCallback(
    (bill) => {
      const current = bill?.category || "";
      if (!current) return "";
      // If it already matches a key, keep it
      if (budgetOptions.some((b) => b.key === current)) return current;
      // Try to map by label (for legacy bills where category was the label)
      const byLabel = budgetOptions.find((b) => b.label === current);
      return byLabel ? byLabel.key : "";
    },
    [budgetOptions]
  );

  const categoryLabelForBill = useCallback(
    (bill) => {
      const key = categoryKeyForBill(bill);
      const label = categoryLabelForKey(key);
      return label || bill?.category || "";
    },
    [categoryKeyForBill, categoryLabelForKey]
  );

  const defaultCategoryKey = budgetOptions.length ? budgetOptions[0].key : "";

  // Helper to begin adding a new bill.  Sets up a draft with sensible
  // defaults and enters the editing state.  This is used in both the empty
  // and normal views.
  const startAdd = useCallback(() => {
    if (!onUpdateBills) return;
    const defaultAccountId =
      residualAccountId || (accounts && accounts[0] && accounts[0].id) || "";
    setEditingId("new");
    setDraft({
      name: "",
      amount: "",
      dueDay: 1,
      payer: role,
      // Category is now a budget key; default to first visible budget if any
      category: defaultCategoryKey,
      accountId: defaultAccountId,
    });
  }, [onUpdateBills, residualAccountId, accounts, role, defaultCategoryKey]);

  // Determine if the list is empty.  We avoid early returns so that
  // React hooks maintain a consistent call order across renders.
  const isEmpty = billsArr.length === 0;

  // Wrap month helper calls in try/catch to avoid crashes when startDate is
  // unexpected or malformed. If an error occurs, fall back to sensible
  // defaults (empty months list and index 0).
  const months = useMemo(() => {
    try {
      return monthNamesFrom(startDate, 14);
    } catch (e) {
      console.warn("monthNamesFrom failed", e);
      return [];
    }
  }, [startDate]);

  const defaultMonth = useMemo(() => {
    try {
      return currentMonthIndex(startDate);
    } catch (e) {
      console.warn("currentMonthIndex failed", e);
      return 0;
    }
  }, [startDate]);

  // Compose a namespaced localStorage key for the selected month.
  // We scope by householdId when available; otherwise we skip persistence
  // entirely to avoid cross-household interference.
  const storageKey = useMemo(
    () => makeScopedKey("billsSelectedMonth", { householdId }),
    [householdId]
  );

  // Persist selected month in local storage so the user doesn't lose context on nav changes.
  const [selectedMonth, setSelectedMonth] = useState(() => {
    let initial = defaultMonth;
    if (storageKey) {
      const saved = safeLocalStorage.getItem(storageKey);
      const num = parseInt(saved, 10);
      if (Number.isFinite(num)) {
        initial = num;
      }
    }
    // Clamp to valid range (0..13) to avoid selecting out-of-bounds months when saved value is invalid
    return Math.max(0, Math.min(13, initial));
  });

  // Save selectedMonth whenever it changes
  useEffect(() => {
    if (!storageKey) return;
    safeLocalStorage.setItem(storageKey, String(selectedMonth));
  }, [selectedMonth, storageKey]);

  // Reset selectedMonth when defaultMonth (derived from startDate) changes.  This
  // ensures that when the start date is updated (e.g. new household), the
  // scroller jumps back to the current month rather than using a stale value
  useEffect(() => {
    setSelectedMonth(defaultMonth);
    if (!storageKey) return;
    safeLocalStorage.setItem(storageKey, String(defaultMonth));
  }, [defaultMonth, storageKey]);

  const [status, setStatus] = useState("all"); // all | unpaid | paid | overdue
  const [owner, setOwner] = useState(
    personScope === "combined"
      ? "both"
      : personScope === "self"
      ? "mine"
      : "other"
  ); // both | mine | other

  const accountMap = useMemo(() => {
    const map = {};
    (accounts || []).forEach((a) => {
      map[a.id] = a;
    });
    return map;
  }, [accounts]);

  // Flatten bills → one row per bill for the selected month
  const monthItems = useMemo(() => {
    if (!startDate) return [];
    const start = new Date(startDate + "T00:00:00");
    const baseYear = start.getFullYear();
    const baseMonth = start.getMonth();
    const year = new Date(baseYear, baseMonth + selectedMonth, 1).getFullYear();
    const monthIndex0 = new Date(
      baseYear,
      baseMonth + selectedMonth,
      1
    ).getMonth();
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();
    return (bills || [])
      .map((b) => {
        const safeDueDay = clampDueDayToMonth(year, monthIndex0, b.dueDay);
        const dueDate = new Date(year, monthIndex0, safeDueDay);
        const paid = !!paidFlags?.[b.id]?.[selectedMonth];
        const overdue =
          !paid &&
          year === todayYear &&
          monthIndex0 === todayMonth &&
          safeDueDay < todayDay;
        return {
          ...b,
          dueDay: safeDueDay,
          monthIndex: selectedMonth,
          paid,
          overdue,
        };
      })
      .sort(
        (a, b) => a.dueDay - b.dueDay || a.name.localeCompare(b.name || "")
      );
  }, [bills, paidFlags, startDate, selectedMonth]);

  // Owner filter (mine / other / both)
  const ownerFiltered = useMemo(() => {
    if (owner === "both") return monthItems;
    const isMine = (payer) => {
      if (payer === "AUTO") return true; // shared auto bills count for both views
      return payer === role;
    };
    return monthItems.filter((it) => {
      if (owner === "mine") return isMine(it.payer);
      if (owner === "other") return !isMine(it.payer) && it.payer !== "AUTO";
      return true;
    });
  }, [monthItems, owner, role]);

  // Status filter (all / unpaid / overdue / paid)
  const filtered = useMemo(() => {
    return ownerFiltered.filter((it) => {
      if (status === "all") return true;
      if (status === "paid") return it.paid;
      if (status === "unpaid") return !it.paid;
      if (status === "overdue") return it.overdue;
      return true;
    });
  }, [ownerFiltered, status]);

  // Summary tiles (in the selected month, after owner filter)
  const totals = useMemo(() => {
    const sum = (items) => items.reduce((acc, it) => acc + (it.amount || 0), 0);
    const all = ownerFiltered;
    const unpaid = all.filter((it) => !it.paid);
    const overdue = all.filter((it) => it.overdue);
    return {
      all: sum(all),
      unpaid: sum(unpaid),
      overdue: sum(overdue),
    };
  }, [ownerFiltered]);

  const overdueItems = useMemo(
    () => ownerFiltered.filter((it) => it.overdue),
    [ownerFiltered]
  );

  const handleToggle = (item) => {
    if (!onTogglePaid) return;
    onTogglePaid({
      billId: item.id,
      monthIndex: item.monthIndex,
      next: !item.paid,
    });
  };

  const handleBulk = (value) => {
    if (!onBulkMark) return;
    const ids = filtered.map((it) => it.id);
    onBulkMark({ billIds: ids, monthIndex: selectedMonth, value });
  };

  const resolveAccountId = (bill) => {
    if (!hasAccounts) return bill.accountId || "";
    if (bill.accountId && accountMap[bill.accountId]) return bill.accountId;
    if (residualAccountId && accountMap[residualAccountId]) return residualAccountId;
    if (accounts && accounts.length > 0) return accounts[0].id;
    return "";
  };

  // -------- CRUD helpers --------
  const startEdit = (bill) => {
    if (!onUpdateBills) return;
    setEditingId(bill.id);
    setDraft({
      id: bill.id,
      name: bill.name || "",
      amount: bill.amount ?? "",
      dueDay: bill.dueDay || 1,
      payer: bill.payer || role,
      // category stored as budget key, but map legacy values too
      category: categoryKeyForBill(bill) || defaultCategoryKey,
      accountId: resolveAccountId(bill),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const saveDraft = () => {
    if (!onUpdateBills || !draft) {
      cancelEdit();
      return;
    }
    const cleanAmount = Number.isFinite(+draft.amount) ? +draft.amount : 0;
    const cleanDueDay = Math.min(31, Math.max(1, parseInt(draft.dueDay || 1, 10)));
    const accountId = resolveAccountId({ ...draft, dueDay: cleanDueDay });
    const categoryKey = draft.category || "";
    let nextBills;
    if (editingId === "new") {
      const id =
        draft.id ||
        `${
          draft.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "bill"
        }-${cleanDueDay}-${Date.now().toString(36)}`;
      const newBill = {
        id,
        name: draft.name.trim() || "New bill",
        amount: cleanAmount,
        dueDay: cleanDueDay,
        payer: draft.payer || role,
        // category is now a budget key (or empty string if none)
        category: categoryKey,
        accountId,
      };
      nextBills = [...bills, newBill];
    } else {
      nextBills = bills.map((b) =>
        b.id === editingId
          ? {
              ...b,
              name: draft.name.trim() || b.name,
              amount: cleanAmount,
              dueDay: cleanDueDay,
              payer: draft.payer || b.payer,
              category: categoryKey || b.category,
              accountId,
            }
          : b
      );
    }
    onUpdateBills(nextBills);
    // After saving a bill, reset the month scroller to the current month.  This
    // aligns the UI with the month in which the bill was saved and prevents
    // the scroller from persisting an unrelated month.
    const idx = currentMonthIndex(startDate);
    setSelectedMonth(idx);
    if (storageKey) {
      safeLocalStorage.setItem(storageKey, String(idx));
    }
    cancelEdit();
  };

  const handleDelete = (billId) => {
    if (!onUpdateBills) return;
    const confirmed = window.confirm("Delete this bill from all future months?");
    if (!confirmed) return;
    const nextBills = bills.filter((b) => b.id !== billId);
    onUpdateBills(nextBills);
    if (editingId === billId) cancelEdit();
  };

  // -------- render --------
  return (
    <div className="pb-24">
      {/* Header shared across empty and normal views */}
      <header className="flex items-center gap-2 px-4 pt-4">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <ListChecks size={18} />
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Bills
          </div>
          <div className="text-sm font-semibold text-slate-900">
            Monthly commitments
          </div>
        </div>
      </header>
      {isEmpty ? (
        <>
          <div className="mx-4 mt-6 rounded-2xl border border-slate-200 bg-white p-4 text-center">
            <div className="text-sm font-medium text-slate-700 mb-2">
              You haven’t added any bills yet.
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Add your first bill to start planning your cash flow.
            </p>
            <button
              type="button"
              onClick={startAdd}
              className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              Add your first bill
            </button>
          </div>
          {/* When adding the first bill, show the editor below the prompt */}
          {editingId === "new" && draft && (
            <div className="mx-4 mt-4 rounded-2xl border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-slate-700">
                  Add bill
                </div>
                {/* Add a cancel button */}
                <button
                  className="text-xs px-2 py-1 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
                  onClick={() => {
                    setEditingId(null);
                    setDraft(null);
                  }}
                >
                  Cancel
                </button>
              </div>
              {/* Simplified new bill editor */}
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-slate-500">Name</span>
                    <input
                      className="border border-slate-200 rounded-xl px-2 py-1 text-xs"
                      value={draft.name}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, name: e.target.value }))
                      }
                      placeholder="Bill name"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-slate-500">Amount</span>
                    <input
                      type="number"
                      step="0.01"
                      className="border border-slate-200 rounded-xl px-2 py-1 text-xs"
                      value={draft.amount}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, amount: e.target.value }))
                      }
                      placeholder="0.00"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-slate-500">Due day</span>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      className="border border-slate-200 rounded-xl px-2 py-1 text-xs"
                      value={draft.dueDay}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, dueDay: e.target.value }))
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-slate-500">Payer</span>
                    <select
                      className="border border-slate-200 rounded-xl px-2 py-1 text-xs bg-white"
                      value={draft.payer}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, payer: e.target.value }))
                      }
                    >
                      <option value="H">
                        {memberNames.H || "Partner H"}
                      </option>
                      <option value="W">
                        {memberNames.W || "Partner W"}
                      </option>
                      <option value="AUTO">Auto</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-slate-500">Category</span>
                    <select
                      className="border border-slate-200 rounded-xl px-2 py-1 text-xs bg-white"
                      value={draft.category || ""}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, category: e.target.value }))
                      }
                    >
                      {budgetOptions.length === 0 ? (
                        <option value="">No budget categories</option>
                      ) : (
                        <>
                          <option value="">Select</option>
                          {budgetOptions.map((b) => (
                            <option key={b.key} value={b.key}>
                              {b.label}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </label>
                </div>
                {/* account selector if accounts exist */}
                {hasAccounts && (
                  <div className="mt-1">
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-slate-500">Account</span>
                      <select
                        className="border border-slate-200 rounded-xl px-2 py-1 text-xs bg-white"
                        value={draft.accountId}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, accountId: e.target.value }))
                        }
                      >
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    className="text-xs px-3 py-1 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
                    onClick={() => {
                      setEditingId(null);
                      setDraft(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="text-xs px-3 py-1 rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
                    onClick={() => {
                      // Save the new bill
                      const cleanAmount = Number.isFinite(+draft.amount)
                        ? +draft.amount
                        : 0;
                      const cleanDueDay = Math.min(
                        31,
                        Math.max(1, parseInt(draft.dueDay || 1, 10))
                      );
                      const accountId = draft.accountId || "";
                      const categoryKey = draft.category || "";
                      const id =
                        draft.id ||
                        `${
                          (draft.name || "bill")
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, "-")
                        }-${cleanDueDay}-${Date.now().toString(36)}`;
                      const newBill = {
                        id,
                        name: draft.name.trim() || "New bill",
                        amount: cleanAmount,
                        dueDay: cleanDueDay,
                        payer: draft.payer || role,
                        category: categoryKey,
                        accountId,
                      };
                      onUpdateBills([...(bills || []), newBill]);
                      // After saving the first bill, reset the month scroller to the current month
                      const idx = currentMonthIndex(startDate);
                      setSelectedMonth(idx);
                      if (storageKey) {
                        safeLocalStorage.setItem(storageKey, String(idx));
                      }
                      setEditingId(null);
                      setDraft(null);
                    }}
                                          >
                      
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Month scroller */}
          <MonthScroller months={months} selected={selectedMonth} onChange={setSelectedMonth} />
          {/* Filters */}
          <div className="mx-4 mt-3 flex flex-wrap items-center justify-between gap-2">
            <Segmented
              value={status}
              onChange={setStatus}
              options={[
                { value: "all", label: "All" },
                { value: "unpaid", label: "Unpaid" },
                { value: "overdue", label: "Overdue" },
                { value: "paid", label: "Paid" },
              ]}
            />
            <Segmented
              value={owner}
              onChange={setOwner}
              options={[
                { value: "both", label: "Both" },
                { value: "mine", label: "Mine" },
                { value: "other", label: "Other" },
              ]}
            />
          </div>
          {/* Summary tiles */}
          <div className="mx-4 mt-3 grid grid-cols-3 gap-2">
            <SummaryTile label="Total" value={fmt(totals.all)} />
            <SummaryTile label="Unpaid" value={fmt(totals.unpaid)} danger />
            <SummaryTile label="Overdue" value={fmt(totals.overdue)} danger />
          </div>
          {/* Past due banner */}
          <PastDueBanner items={overdueItems} memberNames={memberNames} />
          {/* Add / edit bill panel */}
          <div className="mx-4 mt-4 rounded-2xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-slate-700">Bills editor</div>
              <button
                className="text-xs px-3 py-1 rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
                onClick={startAdd}
              >
                Add bill
              </button>
            </div>
            {editingId && draft && (
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-slate-500">Name</span>
                    <input
                      className="border border-slate-200 rounded-xl px-2 py-1 text-xs"
                      value={draft.name}
                      onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                      placeholder="Bill name"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-slate-500">Amount</span>
                    <input
                      type="number"
                      step="0.01"
                      className="border border-slate-200 rounded-xl px-2 py-1 text-xs"
                      value={draft.amount}
                      onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
                      placeholder="0.00"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-slate-500">Due day</span>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      className="border border-slate-200 rounded-xl px-2 py-1 text-xs"
                      value={draft.dueDay}
                      onChange={(e) => setDraft((d) => ({ ...d, dueDay: e.target.value }))}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-slate-500">Payer</span>
                    <select
                      className="border border-slate-200 rounded-xl px-2 py-1 text-xs bg-white"
                      value={draft.payer}
                      onChange={(e) => setDraft((d) => ({ ...d, payer: e.target.value }))}
                    >
                      <option value="H">{memberNames.H || "Partner H"}</option>
                      <option value="W">{memberNames.W || "Partner W"}</option>
                      <option value="AUTO">Auto</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-slate-500">Category</span>
                    <select
                      className="border border-slate-200 rounded-xl px-2 py-1 text-xs bg-white"
                      value={draft.category || ""}
                      onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                    >
                      {budgetOptions.length === 0 ? (
                        <option value="">No budget categories</option>
                      ) : (
                        <>
                          <option value="">Select</option>
                          {budgetOptions.map((b) => (
                            <option key={b.key} value={b.key}>
                              {b.label}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </label>
                </div>
                <div className="mt-1">
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-slate-500">Account</span>
                    {hasAccounts ? (
                      <select
                        className="border border-slate-200 rounded-xl px-2 py-1 text-xs bg-white"
                        value={resolveAccountId(draft)}
                        onChange={(e) => setDraft((d) => ({ ...d, accountId: e.target.value }))}
                      >
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-[11px] text-slate-500">No accounts defined yet.</div>
                    )}
                  </label>
                </div>
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    className="text-xs px-3 py-1 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
                    onClick={cancelEdit}
                  >
                    Cancel
                  </button>
                  <button
                    className="text-xs px-3 py-1 rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
                    onClick={saveDraft}
                  >
                    Save bill
                  </button>
                </div>
              </div>
            )}
          </div>
          {/* List */}
          <div className="mt-3 space-y-1">
            {filtered.length === 0 && (
              <div className="mx-4 mt-4 rounded-2xl bg-slate-50 px-3 py-3 text-xs text-slate-500">
                No bills match this filter for the selected month.
              </div>
            )}
            {filtered.map((item) => {
              const acctId = resolveAccountId(item);
              const acct = hasAccounts ? accountMap[acctId] : null;
              const accountLabel = hasAccounts ? (acct ? acct.name : acctId || "Unassigned") : item.accountId || "Unassigned";
              const catLabel = categoryLabelForBill(item);
              return (
                <div
                  key={`${item.id}-${item.monthIndex}`}
                  className="mx-4 rounded-2xl bg-white border border-slate-100 px-3 py-2 flex items-center gap-2"
                >
                  <button
                    className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300"
                    onClick={() => handleToggle(item)}
                  >
                    {item.paid ? <CheckCircle2 className="text-emerald-600" size={16} /> : <Circle className="text-slate-300" size={16} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-semibold text-slate-900">{item.name}</div>
                      <div className="text-sm font-semibold text-slate-900">{fmt(item.amount)}</div>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                      <div className="flex items-center gap-2">
                        <span>Due {String(item.dueDay).padStart(2, "0")}</span>
                        <span>
                          • {item.payer === "H" ? memberNames.H || "Partner H" : item.payer === "W" ? memberNames.W || "Partner W" : "Auto"}
                        </span>
                        {catLabel && <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{catLabel}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] uppercase tracking-wide text-slate-400">Account</span>
                          {hasAccounts && onChangeBillAccount ? (
                            <select
                              className="text-[11px] border border-slate-200 rounded-full px-2 py-0.5 bg-slate-50 text-slate-700"
                              value={acctId}
                              onChange={(e) => onChangeBillAccount(item.id, e.target.value)}
                            >
                              {accounts.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-[11px] text-slate-600">{accountLabel}</span>
                          )}
                        </div>
                        {onUpdateBills && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800"
                              onClick={() => startEdit(item)}
                            >
                              <Pencil size={12} /> Edit
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-[11px] text-rose-500 hover:text-rose-700"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Bulk actions */}
          <BulkActions
            disabled={!filtered.length || !onBulkMark}
            onMarkAllPaid={() => handleBulk(true)}
            onMarkAllUnpaid={() => handleBulk(false)}
          />
          <div className="h-24" />
        </>
      )}
    </div>
  );
}