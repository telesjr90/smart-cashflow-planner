// src/pages/Bills.jsx
import React, { useMemo, useState, useCallback } from "react";
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

/**
 * EXPECTED PROPS:
 * - role: 'H' | 'W'
 * - startDate: 'YYYY-MM-DD'
 * - bills: Array<{ id, name, amount, dueDay, payer: 'H'|'W'|'AUTO', category?: string, accountId?: string }>
 * - paidFlags: { [billId: string]: { [monthIndex: number]: boolean } }
 * - personScope?: 'self'|'other'|'combined'
 * - memberNames?: { H?: string, W?: string }
 * - accounts?: Array<{ id: string, name: string }>
 * - residualAccountId?: string
 * - onTogglePaid?: ({ billId, monthIndex, next }) => void
 * - onBulkMark?: ({ billIds, monthIndex, value }) => void
 * - onChangeBillAccount?: (billId: string, accountId: string) => void
 * - onUpdateBills?: (nextBills: Array<Bill>) => void   // add/edit/delete
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
              <span className="font-semibold">{it.name}</span> • Due{" "}
              {String(it.dueDay).padStart(2, "0")} • {ownerName(it.payer)}
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
  onTogglePaid,
  onBulkMark,
  onChangeBillAccount,
  onUpdateBills,
}) {
  const billsArr = Array.isArray(bills) ? bills : [];

  // --- Editing state (shared across empty and normal views) ---
  // Holds the ID of the bill currently being edited ("new" for new bills)
  const [editingId, setEditingId] = useState(null);
  // Holds the draft values for the bill being created/edited
  const [draft, setDraft] = useState(null);

  // Determine whether any accounts exist.  Compute this early so the empty
  // state can show account selector if needed.
  const hasAccounts = accounts && accounts.length > 0;

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
      category: "",
      accountId: defaultAccountId,
    });
  }, [onUpdateBills, residualAccountId, accounts, role]);

  // Show an empty state when no bills have been added yet.  Provide a button
  // that opens the add bill editor using the helper defined above.
  if (billsArr.length === 0) {
    return (
      <div className="pb-24">
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
                    <option value="H">{memberNames.H || "Partner H"}</option>
                    <option value="W">{memberNames.W || "Partner W"}</option>
                    <option value="AUTO">Auto</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-slate-500">Category</span>
                  <input
                    className="border border-slate-200 rounded-xl px-2 py-1 text-xs"
                    value={draft.category}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, category: e.target.value }))
                    }
                    placeholder="e.g. utilities"
                  />
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
                    const cleanAmount = Number.isFinite(+draft.amount) ? +draft.amount : 0;
                    const cleanDueDay = Math.min(
                      31,
                      Math.max(1, parseInt(draft.dueDay || 1, 10))
                    );
                    const accountId = draft.accountId || "";
                    const id =
                      draft.id ||
                      `${
                        (draft.name || "bill").toLowerCase().replace(/[^a-z0-9]+/g, "-")
                      }-${cleanDueDay}-${Date.now().toString(36)}`;
                    const newBill = {
                      id,
                      name: draft.name.trim() || "New bill",
                      amount: cleanAmount,
                      dueDay: cleanDueDay,
                      payer: draft.payer || role,
                      category: draft.category || "",
                      accountId,
                    };
                    onUpdateBills([...(bills || []), newBill]);
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
      </div>
    );
  }
  const months = useMemo(() => monthNamesFrom(startDate, 14), [startDate]);
  const defaultMonth = useMemo(
    () => currentMonthIndex(startDate),
    [startDate]
  );
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [status, setStatus] = useState("all"); // all | unpaid | paid | overdue
  const [owner, setOwner] = useState(
    personScope === "combined"
      ? "both"
      : personScope === "self"
      ? "mine"
      : "other"
  ); // both | mine | other

  // hasAccounts is already computed above.  Do not redeclare here.

  const accountMap = useMemo(() => {
    const map = {};
    (accounts || []).forEach((a) => {
      map[a.id] = a;
    });
    return map;
  }, [accounts]);

  // startAdd is defined above to be available in the empty state

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
        (a, b) =>
          a.dueDay - b.dueDay || a.name.localeCompare(b.name || "")
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
    if (residualAccountId && accountMap[residualAccountId])
      return residualAccountId;
    if (accounts && accounts.length > 0) return accounts[0].id;
    return "";
  };

  // -------- CRUD helpers --------
  // startAdd is defined earlier and reused here

  const startEdit = (bill) => {
    if (!onUpdateBills) return;
    setEditingId(bill.id);
    setDraft({
      id: bill.id,
      name: bill.name || "",
      amount: bill.amount ?? "",
      dueDay: bill.dueDay || 1,
      payer: bill.payer || role,
      category: bill.category || "",
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
    const cleanDueDay = Math.min(
      31,
      Math.max(1, parseInt(draft.dueDay || 1, 10))
    );

    const accountId = resolveAccountId({
      ...draft,
      dueDay: cleanDueDay,
    });

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
        category: draft.category || "",
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
              category: draft.category || b.category,
              accountId,
            }
          : b
      );
    }

    onUpdateBills(nextBills);
    cancelEdit();
  };

  const handleDelete = (billId) => {
    if (!onUpdateBills) return;
    const confirmed = window.confirm(
      "Delete this bill from all future months?"
    );
    if (!confirmed) return;
    const nextBills = bills.filter((b) => b.id !== billId);
    onUpdateBills(nextBills);
    if (editingId === billId) cancelEdit();
  };

  // -------- render --------
  return (
    <div className="pb-24">
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

      {/* Month scroller */}
      <MonthScroller
        months={months}
        selected={selectedMonth}
        onChange={setSelectedMonth}
      />

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
          <div className="text-xs font-semibold text-slate-700">
            Bills editor
          </div>
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
                  <option value="H">{memberNames.H || "Partner H"}</option>
                  <option value="W">{memberNames.W || "Partner W"}</option>
                  <option value="AUTO">Auto</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-slate-500">Category</span>
                <input
                  className="border border-slate-200 rounded-xl px-2 py-1 text-xs"
                  value={draft.category}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, category: e.target.value }))
                  }
                  placeholder="e.g. utilities"
                />
              </label>
            </div>

            <div className="mt-1">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-slate-500">Account</span>
                {hasAccounts ? (
                  <select
                    className="border border-slate-200 rounded-xl px-2 py-1 text-xs bg-white"
                    value={resolveAccountId(draft)}
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
                ) : (
                  <div className="text-[11px] text-slate-500">
                    No accounts defined yet.
                  </div>
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
          const accountLabel = hasAccounts
            ? acct
              ? acct.name
              : acctId || "Unassigned"
            : item.accountId || "Unassigned";

          return (
            <div
              key={`${item.id}-${item.monthIndex}`}
              className="mx-4 rounded-2xl bg-white border border-slate-100 px-3 py-2 flex items-center gap-2"
            >
              <button
                className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300"
                onClick={() => handleToggle(item)}
              >
                {item.paid ? (
                  <CheckCircle2 className="text-emerald-600" size={16} />
                ) : (
                  <Circle className="text-slate-300" size={16} />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-sm font-semibold text-slate-900">
                    {item.name}
                  </div>
                  <div className="text-sm font-semibold text-slate-900">
                    {fmt(item.amount)}
                  </div>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                  <div className="flex items-center gap-2">
                    <span>
                      Due {String(item.dueDay).padStart(2, "0")}
                    </span>
                    <span>
                      •{" "}
                      {item.payer === "H"
                        ? memberNames.H || "Partner H"
                        : item.payer === "W"
                        ? memberNames.W || "Partner W"
                        : "Auto"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] uppercase tracking-wide text-slate-400">
                        Account
                      </span>
                      {hasAccounts && onChangeBillAccount ? (
                        <select
                          className="text-[11px] border border-slate-200 rounded-full px-2 py-0.5 bg-slate-50 text-slate-700"
                          value={acctId}
                          onChange={(e) =>
                            onChangeBillAccount(item.id, e.target.value)
                          }
                        >
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-[11px] text-slate-600">
                          {accountLabel}
                        </span>
                      )}
                    </div>
                    {onUpdateBills && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800"
                          onClick={() => startEdit(item)}
                        >
                          <Pencil size={12} />
                          Edit
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-[11px] text-rose-500 hover:text-rose-700"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 size={12} />
                          Delete
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
    </div>
  );
}
