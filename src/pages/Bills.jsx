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
import { useConfirm } from "../hooks/useConfirm";
import BillFormSheet from "../components/bills/BillFormSheet";
import { getCategoryLabel } from "../lib/categories";

// Store & Hooks
import { useCashflowStore } from "../store/useCashflowStore";
import useCashflowData from "../hooks/useCashflowData";

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

function getMonthIndexFromStart(startDate, dateStr) {
  const s = new Date(startDate + "T00:00:00");
  const d = new Date(dateStr + "T00:00:00");
  return (d.getFullYear() - s.getFullYear()) * 12 + (d.getMonth() - s.getMonth());
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
export default function Bills({ personScope = "self" }) {
  // 1. Data from Store
  const {
    userProfile,
    startDate,
    bills,
    accounts,
    residualAccountId,
    categoryBudgets,
    paidBills,
  } = useCashflowStore();

  const role = userProfile?.role || "H";
  const householdId = userProfile?.householdId || "";
  const memberNames = { H: "Partner H", W: "Partner W" };

  // 2. Actions from Hook
  const {
    handleUpdateBills,
    handleTogglePaid,
    handleBulkMark,
    handleChangeBillAccount,
  } = useCashflowData();

  const confirm = useConfirm();

  // Guard against undefined or falsy start dates.
  if (!startDate) {
    return (
      <div className="p-4 text-sm text-slate-700">
        Start date is not defined. Please set a start date in Settings.
      </div>
    );
  }

  const safeStartDate = startDate;
  const billsArr = Array.isArray(bills) ? bills : [];

  // --- Derived: Paid Flags ---
  const paidFlags = useMemo(() => {
    const flags = {};
    Object.entries(paidBills || {}).forEach(([key, isPaid]) => {
      if (!isPaid) return;
      const [dateStr, billId] = key.split(":");
      if (!dateStr || !billId) return;
      const monthIndex = getMonthIndexFromStart(safeStartDate, dateStr);
      if (monthIndex < -120 || monthIndex > 240) return;
      if (!flags[billId]) flags[billId] = {};
      flags[billId][monthIndex] = true;
    });
    return flags;
  }, [paidBills, safeStartDate]);

  // --- Bill Form / Sheet State ---
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const hasAccounts = accounts && accounts.length > 0;

  // ---------- budget category options ----------
  const budgetOptions = useMemo(() => {
    const raw = categoryBudgets || {};
    const arr = Object.entries(raw).map(([key, cfg]) => ({
      key,
      label: cfg?.label || key,
      scope: cfg?.scope || "shared",
      owner: cfg?.owner ?? null,
    }));
    if (role !== "H" && role !== "W") return arr;
    return arr.filter((b) => {
      const scope = b.scope || "shared";
      if (scope === "shared") return true;
      if (!b.owner) return true;
      return b.owner === role;
    });
  }, [categoryBudgets, role]);

  const defaultCategoryKey = budgetOptions.length ? budgetOptions[0].key : "";

  // Helper used for display mapping in the list
  const categoryLabelForBill = useCallback(
    (bill) => {
      // First try to find label by key match
      if (bill?.category && budgetOptions.some((b) => b.key === bill.category)) {
        const found = budgetOptions.find((b) => b.key === bill.category);
        return found?.label || "";
      }
      // If no match in budgets, try generic categories or fallback to raw
      if (bill?.category) {
        return getCategoryLabel(bill.category) || bill.category;
      }
      return "";
    },
    [budgetOptions]
  );

  // Account helper
  const accountMap = useMemo(() => {
    const map = {};
    (accounts || []).forEach((a) => {
      map[a.id] = a;
    });
    return map;
  }, [accounts]);

  const resolveAccountId = (bill) => {
    if (!hasAccounts) return bill.accountId || "";
    if (bill.accountId && accountMap[bill.accountId]) return bill.accountId;
    if (residualAccountId && accountMap[residualAccountId]) return residualAccountId;
    if (accounts && accounts.length > 0) return accounts[0].id;
    return "";
  };

  // --- Handlers for Sheet ---
  const handleOpenAdd = () => {
    setEditingBill(null);
    setSheetOpen(true);
  };

  const handleOpenEdit = (bill) => {
    setEditingBill(bill);
    setSheetOpen(true);
  };

  const handleSheetClose = () => {
    setSheetOpen(false);
    setEditingBill(null);
  };

  const handleSaveBill = async (billDraft) => {
    setIsSaving(true);
    try {
      const cleanAmount = Number.isFinite(+billDraft.amount) ? +billDraft.amount : 0;
      const cleanDueDay = Math.min(31, Math.max(1, parseInt(billDraft.dueDay || 1, 10)));
      const accountId = resolveAccountId({ ...billDraft, dueDay: cleanDueDay });
      const categoryKey = billDraft.category || "";

      let nextBills;
      
      if (!editingBill) {
        // Create New
        const id =
          billDraft.id ||
          `${
            (billDraft.name || "bill")
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
          }-${cleanDueDay}-${Date.now().toString(36)}`;
          
        const newBill = {
          id,
          name: billDraft.name.trim() || "New bill",
          amount: cleanAmount,
          dueDay: cleanDueDay,
          payer: billDraft.payer || role,
          category: categoryKey,
          accountId,
        };
        nextBills = [...bills, newBill];
      } else {
        // Update Existing
        nextBills = bills.map((b) =>
          b.id === editingBill.id
            ? {
                ...b,
                name: billDraft.name.trim() || b.name,
                amount: cleanAmount,
                dueDay: cleanDueDay,
                payer: billDraft.payer || b.payer,
                category: categoryKey || b.category,
                accountId, 
              }
            : b
        );
      }

      await handleUpdateBills(nextBills);

      // Reset month scroller to current month
      const idx = currentMonthIndex(startDate);
      setSelectedMonth(idx);
      if (storageKey) {
        safeLocalStorage.setItem(storageKey, String(idx));
      }

      handleSheetClose();
    } finally {
      setIsSaving(false);
    }
  };

  const isEmpty = billsArr.length === 0;

  // Month navigation logic
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

  const storageKey = useMemo(
    () => makeScopedKey("billsSelectedMonth", { householdId }),
    [householdId]
  );

  const [selectedMonth, setSelectedMonth] = useState(() => {
    let initial = defaultMonth;
    if (storageKey) {
      const saved = safeLocalStorage.getItem(storageKey);
      const num = parseInt(saved, 10);
      if (Number.isFinite(num)) {
        initial = num;
      }
    }
    return Math.max(0, Math.min(13, initial));
  });

  useEffect(() => {
    if (!storageKey) return;
    safeLocalStorage.setItem(storageKey, String(selectedMonth));
  }, [selectedMonth, storageKey]);

  useEffect(() => {
    setSelectedMonth(defaultMonth);
    if (!storageKey) return;
    safeLocalStorage.setItem(storageKey, String(defaultMonth));
  }, [defaultMonth, storageKey]);

  // Filters
  const [status, setStatus] = useState("all"); 
  const [owner, setOwner] = useState(
    personScope === "combined"
      ? "both"
      : personScope === "self"
      ? "mine"
      : "other"
  );

  useEffect(() => {
    setOwner(
      personScope === "combined"
        ? "both"
        : personScope === "self"
        ? "mine"
        : "other"
    );
  }, [personScope]);

  // Flatten bills for the selected month
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

  const ownerFiltered = useMemo(() => {
    if (owner === "both") return monthItems;
    const isMine = (payer) => {
      if (payer === "AUTO") return true; 
      return payer === role;
    };
    return monthItems.filter((it) => {
      if (owner === "mine") return isMine(it.payer);
      if (owner === "other") return !isMine(it.payer) && it.payer !== "AUTO";
      return true;
    });
  }, [monthItems, owner, role]);

  const filtered = useMemo(() => {
    return ownerFiltered.filter((it) => {
      if (status === "all") return true;
      if (status === "paid") return it.paid;
      if (status === "unpaid") return !it.paid;
      if (status === "overdue") return it.overdue;
      return true;
    });
  }, [ownerFiltered, status]);

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
    handleTogglePaid({
      billId: item.id,
      monthIndex: item.monthIndex,
      next: !item.paid,
    });
  };

  const handleBulk = (value) => {
    const ids = filtered.map((it) => it.id);
    handleBulkMark({ billIds: ids, monthIndex: selectedMonth, value });
  };

  const handleDelete = async (billId) => {
    const confirmed = await confirm({
      title: "Delete Bill",
      message: "Delete this bill from all future months?",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
    });
    
    if (!confirmed) return;
    
    const nextBills = bills.filter((b) => b.id !== billId);
    handleUpdateBills(nextBills);
    
    if (editingBill && editingBill.id === billId) {
      handleSheetClose();
    }
  };

  return (
    <div className="pb-24">
      <header className="flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-2">
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
        </div>
        {!isEmpty && (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 transition-colors"
            aria-label="Add bill"
          >
            <span className="text-xl leading-none mb-0.5">+</span>
          </button>
        )}
      </header>

      {isEmpty ? (
        <div className="mx-4 mt-6 rounded-2xl border border-slate-200 bg-white p-4 text-center">
          <div className="text-sm font-medium text-slate-700 mb-2">
            You haven’t added any bills yet.
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Add your first bill to start planning your cash flow.
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            Add your first bill
          </button>
        </div>
      ) : (
        <>
          <MonthScroller months={months} selected={selectedMonth} onChange={setSelectedMonth} />
          
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

          <div className="mx-4 mt-3 grid grid-cols-3 gap-2">
            <SummaryTile label="Total" value={fmt(totals.all)} />
            <SummaryTile label="Unpaid" value={fmt(totals.unpaid)} danger />
            <SummaryTile label="Overdue" value={fmt(totals.overdue)} danger />
          </div>

          <PastDueBanner items={overdueItems} memberNames={memberNames} />
          
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
                          {hasAccounts && handleChangeBillAccount ? (
                            <select
                              className="text-[11px] border border-slate-200 rounded-full px-2 py-0.5 bg-slate-50 text-slate-700"
                              value={acctId}
                              onChange={(e) => handleChangeBillAccount(item.id, e.target.value)}
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
                        {handleUpdateBills && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800"
                              onClick={() => handleOpenEdit(item)}
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
          <BulkActions
            disabled={!filtered.length || !handleBulkMark}
            onMarkAllPaid={() => handleBulk(true)}
            onMarkAllUnpaid={() => handleBulk(false)}
          />
          <div className="h-24" />
        </>
      )}

      <BillFormSheet
        open={sheetOpen}
        bill={editingBill}
        defaultCategoryKey={defaultCategoryKey}
        budgetOptions={budgetOptions}
        accounts={accounts}
        memberNames={memberNames}
        userRole={role}
        isSaving={isSaving}
        onSave={handleSaveBill}
        onCancel={handleSheetClose}
      />
    </div>
  );
}