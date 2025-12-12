import React, { useEffect, useMemo, useState } from "react";
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
import BillFormSheet from "../components/bills/BillFormSheet";
import { getCategoryLabel } from "../lib/categories";
import { formatMonthYear } from "../utils/dateFormat";

import { useCashflowStore } from "../store/useCashflowStore";
import useCashflowData from "../hooks/useCashflowData";
import { Card, CardBody } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Select } from "../components/ui/Select";
import ConfirmModal from "../components/ui/modals/ConfirmModal";
import { useToast } from "../components/ui/toast/useToast";

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
    const iso = d.toISOString().slice(0, 10);
    out.push(formatMonthYear(iso));
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
    <div className="inline-flex rounded-pill bg-surface-100 p-0.5 border border-surface-200/60 shadow-soft">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 text-caption rounded-pill transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-50 ${
            value === o.value
              ? "bg-surface-100 text-primary-600 shadow-soft border border-primary-500/30"
              : "text-surface-500 hover:bg-surface-50"
          }`}
          type="button"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function MonthScroller({ months, selected, onChange }) {
  return (
    <div className="px-4 mt-3 flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onChange(Math.max(0, selected - 1))}
        aria-label="Previous month"
      >
        <ChevronLeft size={18} />
      </Button>
      <div className="flex-1 flex justify-center gap-2 overflow-x-auto no-scrollbar">
        {months.map((label, idx) => (
          <button
            key={label}
            onClick={() => onChange(idx)}
            className={`px-3 py-1.5 rounded-pill text-caption whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-50 ${
              idx === selected ? "bg-primary-600 text-white shadow-soft" : "bg-surface-100 text-surface-600 hover:bg-surface-200"
            }`}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onChange(Math.min(months.length - 1, selected + 1))}
        aria-label="Next month"
      >
        <ChevronRight size={18} />
      </Button>
    </div>
  );
}

function SummaryTile({ label, value, danger }) {
  return (
    <Card variant="flat" className="h-full">
      <CardBody className="px-3 py-2 space-y-1">
        <div className="text-tiny uppercase tracking-wide text-surface-500">{label}</div>
        <div className={`text-body font-semibold ${danger ? "text-danger-500" : "text-surface-900"}`}>{value}</div>
      </CardBody>
    </Card>
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
    <Card variant="flat" className="mx-4">
      <CardBody className="space-y-2 border border-danger-500/20 bg-danger-500/5 rounded-3xl">
        <div className="flex items-center gap-2 text-danger-500">
          <AlertTriangle size={16} aria-hidden="true" />
          <div className="text-body font-semibold">
            {items.length} overdue bill{items.length > 1 ? "s" : ""} in this household
          </div>
        </div>
        <div className="space-y-1">
          {preview.map((it) => (
            <div
              key={`${it.id}-${it.monthIndex}`}
              className="text-caption text-danger-600 flex items-center justify-between gap-2"
            >
              <div className="truncate">
                <span className="font-semibold">{it.name}</span> · Due {String(it.dueDay).padStart(2, "0")} ·{" "}
                {ownerName(it.payer)}
              </div>
              <div className="font-semibold">{fmt(it.amount)}</div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

function BulkActions({ disabled, onMarkAllPaid, onMarkAllUnpaid }) {
  if (disabled) return null;
  return (
    <div className="px-4 mt-3 flex items-center justify-end gap-2">
      <Button variant="outline" size="sm" onClick={onMarkAllUnpaid}>
        Mark all unpaid
      </Button>
      <Button variant="primary" size="sm" onClick={onMarkAllPaid}>
        Mark all paid
      </Button>
    </div>
  );
}

// ---------- main component ----------
export default function Bills({ personScope = "self", isOnline = true }) {
  const {
    userProfile,
    startDate,
    bills,
    accounts,
    residualAccountId,
    categoryBudgets,
    paidBills,
  } = useCashflowStore();

  const role = userProfile.role || "H";
  const householdId = userProfile.householdId || "";
  const memberNames = { H: "Partner H", W: "Partner W" };

  const { handleUpdateBills, handleTogglePaid, handleBulkMark, handleChangeBillAccount } = useCashflowData();
  const { showToast } = useToast();

  if (!startDate) {
    return (
      <div className="p-4 text-body text-surface-900">
        Start date is not defined. Please set a start date in Settings.
      </div>
    );
  }

  const safeStartDate = startDate;
  const billsArr = Array.isArray(bills) ? bills : [];

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

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isDeletingId, setIsDeletingId] = useState(null);

  const hasAccounts = accounts && accounts.length > 0;

  const budgetOptions = useMemo(() => {
    const raw = categoryBudgets || {};
    const arr = Object.entries(raw).map(([key, cfg]) => ({
      key,
      label: cfg.label || key,
      scope: cfg.scope || "shared",
      owner: cfg.owner || null,
    }));
    if (!arr.length) {
      return [{ key: "uncategorized", label: "Uncategorized", scope: "shared", owner: null }];
    }
    if (role !== "H" && role !== "W") return arr;
    const filtered = arr.filter((b) => {
      const scope = b.scope || "shared";
      if (scope === "shared") return true;
      if (!b.owner) return true;
      return b.owner === role;
    });
    return filtered.length ? filtered : [{ key: "uncategorized", label: "Uncategorized", scope: "shared", owner: null }];
  }, [categoryBudgets, role]);

  const defaultCategoryKey = budgetOptions.length ? budgetOptions[0].key : "";

  const categoryLabelForBill = useMemo(
    () => (bill) => {
      if (bill.category && budgetOptions.some((b) => b.key === bill.category)) {
        const found = budgetOptions.find((b) => b.key === bill.category);
        return found.label || "";
      }
      if (bill.category) {
        return getCategoryLabel(bill.category) || bill.category;
      }
      return "";
    },
    [budgetOptions]
  );

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

  const isOffline = !isOnline;

  const handleOpenAdd = () => {
    if (isOffline) return;
    setEditingBill(null);
    setSheetOpen(true);
  };

  const handleOpenEdit = (bill) => {
    if (isOffline) return;
    setEditingBill(bill);
    setSheetOpen(true);
  };

  const handleSheetClose = () => {
    setSheetOpen(false);
    setEditingBill(null);
  };

  const handleSaveBill = async (billDraft) => {
    if (isOffline) return;
    setIsSaving(true);
    try {
      const name = (billDraft.name || "").trim();
      if (!name) {
        showToast({ type: "error", message: "Bill name is required." });
        return;
      }

      const cleanAmount = Number.isFinite(+billDraft.amount) ? +billDraft.amount : 0;
      if (!(cleanAmount > 0)) {
        showToast({ type: "error", message: "Bill amount must be greater than zero." });
        return;
      }

      const cleanDueDay = Math.min(31, Math.max(1, parseInt(billDraft.dueDay || 1, 10)));
      const accountId = resolveAccountId({ ...billDraft, dueDay: cleanDueDay });
      const categoryKey = billDraft.category || budgetOptions[0]?.key || null;

      let nextBills;

      if (!editingBill) {
        const id =
          billDraft.id ||
          `${(billDraft.name || "bill").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${cleanDueDay}-${Date.now().toString(36)}`;

        const newBill = {
          id,
          name,
          amount: cleanAmount,
          dueDay: cleanDueDay,
          payer: billDraft.payer || role,
          category: categoryKey,
          accountId,
        };
        nextBills = [...bills, newBill];
      } else {
        nextBills = bills.map((b) =>
          b.id === editingBill.id
            ? {
                ...b,
                name: name || b.name,
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

      const idx = currentMonthIndex(startDate);
      setSelectedMonth(idx);
      if (storageKey) {
        safeLocalStorage.setItem(storageKey, String(idx));
      }

      handleSheetClose();
      showToast({ type: "success", message: "Bill saved." });
    } catch (err) {
      console.error("Failed to save bill", err);
      showToast({ type: "error", message: "Failed to save bill. Please try again." });
    } finally {
      setIsSaving(false);
    }
  };

  const isEmpty = billsArr.length === 0;

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

  const storageKey = useMemo(() => makeScopedKey("billsSelectedMonth", { householdId }), [householdId]);

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

  const [status, setStatus] = useState("all");
  const [owner, setOwner] = useState(personScope === "combined" ? "both" : personScope === "self" ? "mine" : "other");

  useEffect(() => {
    setOwner(personScope === "combined" ? "both" : personScope === "self" ? "mine" : "other");
  }, [personScope]);

  const monthItems = useMemo(() => {
    if (!startDate) return [];
    const start = new Date(startDate + "T00:00:00");
    const baseYear = start.getFullYear();
    const baseMonth = start.getMonth();
    const year = new Date(baseYear, baseMonth + selectedMonth, 1).getFullYear();
    const monthIndex0 = new Date(baseYear, baseMonth + selectedMonth, 1).getMonth();
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();

    return (bills || [])
      .map((b) => {
        const safeDueDay = clampDueDayToMonth(year, monthIndex0, b.dueDay);
        const paid = !!(paidFlags?.[b.id]?.[selectedMonth]);
        const overdue = !paid && year === todayYear && monthIndex0 === todayMonth && safeDueDay < todayDay;
        return {
          ...b,
          dueDay: safeDueDay,
          monthIndex: selectedMonth,
          paid,
          overdue,
        };
      })
      .sort((a, b) => a.dueDay - b.dueDay || a.name.localeCompare(b.name || ""));
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

  const overdueItems = useMemo(() => ownerFiltered.filter((it) => it.overdue), [ownerFiltered]);

  const handleToggle = (item) => {
    if (isOffline) return;
    handleTogglePaid({
      billId: item.id,
      monthIndex: item.monthIndex,
      next: !item.paid,
    });
  };

  const handleBulk = (value) => {
    if (isOffline) return;
    const ids = filtered.map((it) => it.id);
    handleBulkMark({ billIds: ids, monthIndex: selectedMonth, value });
  };

  const handleDelete = (bill) => {
    if (isOffline) return;
    setPendingDelete(bill);
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete || isDeletingId) return;
    const billId = pendingDelete.id;
    setIsDeletingId(billId);
    const prevBills = bills;
    const nextBills = bills.filter((b) => b.id !== billId);

    try {
      await Promise.resolve(handleUpdateBills(nextBills));
      if (editingBill && editingBill.id === billId) {
        handleSheetClose();
      }
      showToast({ type: "success", message: "Bill deleted." });
    } catch (err) {
      console.error("Failed to delete bill", err);
      handleUpdateBills(prevBills);
      showToast({ type: "error", message: "Failed to delete bill. Please try again." });
    } finally {
      setIsDeletingId(null);
      setPendingDelete(null);
    }
  };

  const handleCancelDelete = () => {
    if (isDeletingId) return;
    setPendingDelete(null);
  };

  return (
    <div className="pb-24 space-y-4">
      <header className="flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-600">
            <ListChecks size={18} aria-hidden="true" />
          </div>
          <div>
            <div className="text-tiny font-semibold uppercase tracking-wide text-surface-500">Bills</div>
            <div className="text-body font-semibold text-surface-900">Monthly commitments</div>
          </div>
        </div>
        {!isEmpty && (
          <Button
            onClick={handleOpenAdd}
            disabled={isOffline}
            variant="primary"
            size="icon"
            aria-label="Add bill"
          >
            <span className="text-title-l leading-none -mt-0.5" aria-hidden="true">
              +
            </span>
          </Button>
        )}
      </header>

      {isOffline && (
        <Card variant="flat" className="mx-4">
          <CardBody className="flex items-center gap-2 text-caption text-warning-500 bg-warning-500/10 border border-warning-500/30 rounded-2xl">
            Offline mode: actions are disabled until you reconnect.
          </CardBody>
        </Card>
      )}

      {isEmpty ? (
        <Card variant="flat" className="mx-4 mt-2">
          <CardBody className="text-center space-y-3">
            <div className="text-body font-semibold text-surface-900">You haven't added any bills yet.</div>
            <p className="text-caption text-surface-500">Add your first bill to start planning your cash flow.</p>
            <div className="flex justify-center">
              <Button type="button" onClick={handleOpenAdd} disabled={isOffline} size="sm">
                Add your first bill
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <>
          <MonthScroller months={months} selected={selectedMonth} onChange={setSelectedMonth} />

          <div className="px-4 mt-3 flex flex-wrap items-center justify-between gap-2">
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

          <div className="px-4 mt-3 grid grid-cols-3 gap-2">
            <SummaryTile label="Total" value={fmt(totals.all)} />
            <SummaryTile label="Unpaid" value={fmt(totals.unpaid)} danger />
            <SummaryTile label="Overdue" value={fmt(totals.overdue)} danger />
          </div>

          <PastDueBanner items={overdueItems} memberNames={memberNames} />

          <div className="mt-3 space-y-2">
            {filtered.length === 0 && (
              <Card variant="flat" className="mx-4">
                <CardBody className="text-caption text-surface-500">
                  No bills match this filter for the selected month.
                </CardBody>
              </Card>
            )}
            {filtered.map((item) => {
              const acctId = resolveAccountId(item);
              const acct = hasAccounts ? accountMap[acctId] : null;
              const accountLabel = hasAccounts ? (acct ? acct.name : acctId || "Unassigned") : item.accountId || "Unassigned";
              const catLabel = categoryLabelForBill(item);
              return (
                <Card key={`${item.id}-${item.monthIndex}`} variant="flat" className="mx-4">
                  <CardBody className="flex items-start gap-3 px-3 py-3">
                    <button
                      className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-pill border border-surface-200 text-surface-500 bg-surface-50 transition-colors hover:bg-surface-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-50 disabled:opacity-50"
                      onClick={() => handleToggle(item)}
                      disabled={isOffline}
                      aria-pressed={item.paid}
                      aria-label={item.paid ? "Mark unpaid" : "Mark paid"}
                      type="button"
                    >
                      {item.paid ? (
                        <CheckCircle2 className="text-success-500" size={18} aria-hidden="true" />
                      ) : (
                        <Circle className="text-surface-300" size={18} aria-hidden="true" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate text-body font-semibold text-surface-900">{item.name}</div>
                        <div className="text-body font-semibold text-surface-900">{fmt(item.amount)}</div>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-caption text-surface-500">
                        <div className="flex items-center gap-2 truncate">
                          <span>Due {String(item.dueDay).padStart(2, "0")}</span>
                          <span>· {item.payer === "H" ? memberNames.H : item.payer === "W" ? memberNames.W : "Auto"}</span>
                          {catLabel && (
                            <Badge variant="neutral" className="shrink-0">
                              {catLabel}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-tiny uppercase tracking-wide text-surface-400">Account</span>
                            {hasAccounts && handleChangeBillAccount ? (
                              <Select
                                size="sm"
                                value={acctId}
                                onChange={(e) => handleChangeBillAccount(item.id, e.target.value)}
                                disabled={isOffline}
                                className="min-w-[120px]"
                              >
                                {accounts.map((a) => (
                                  <option key={a.id} value={a.id}>
                                    {a.name}
                                  </option>
                                ))}
                              </Select>
                            ) : (
                              <span className="text-caption text-surface-600">{accountLabel}</span>
                            )}
                          </div>
                          {handleUpdateBills && (
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-surface-500 hover:text-surface-900 px-2"
                                onClick={() => handleOpenEdit(item)}
                                disabled={isOffline}
                              >
                                <Pencil size={14} />
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-danger-500 hover:text-danger-600 px-2"
                                onClick={() => handleDelete(item)}
                                disabled={isOffline}
                              >
                                <Trash2 size={14} />
                                Delete
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
          <BulkActions
            disabled={!filtered.length || !handleBulkMark || isOffline}
            onMarkAllPaid={() => handleBulk(true)}
            onMarkAllUnpaid={() => handleBulk(false)}
          />
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
        isSaving={isSaving || isOffline}
        isOnline={isOnline}
        onSave={handleSaveBill}
        onCancel={handleSheetClose}
      />

      <ConfirmModal
        open={Boolean(pendingDelete)}
        title={`Delete bill "${pendingDelete?.name || "this bill"}"?`}
        message="Delete this bill from all future months?"
        confirmLabel={isDeletingId ? "Deleting..." : "Delete"}
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        variant="danger"
      />
    </div>
  );
}
