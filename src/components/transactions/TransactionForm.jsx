import React, { useMemo, useState } from "react";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { DateInput } from "../ui/DateInput";
import { Button } from "../ui/Button";

/**
 * TransactionForm.jsx — CONTRACT
 *
 * Goal: One shared transaction form implementation used by BOTH shells.
 * The shells own: container chrome, open/close, titles, toasts.
 * The form owns: fields, defaults, validation, normalization, inline errors.
 *
 * @typedef {{ id: string, name: string }} Account
 * @typedef {{ id: string, name: string }} BudgetCategory
 * @typedef {"expense"|"income"} TransactionType
 *
 * Form values shape:
 * {
 *   id?: string;
 *   type: TransactionType;
 *   amount: string;          // human input, normalized on submit
 *   description: string;
 *   categoryId: string;
 *   accountId: string;
 *   date: string;            // yyyy-mm-dd
 * }
 *
 * Props:
 * - values: form values (controlled).
 * - onChange: (nextValues) => void
 * - onSubmit: (payload) => void        // receives normalized payload from formValuesToPayload
 * - onCancel?: () => void
 * - accounts?: Account[]
 * - categories?: BudgetCategory[]
 * - isOnline?: boolean
 * - isSaving?: boolean
 */

const REQUIRED = {
  description: "Description is required.",
  amount: "Amount must be greater than 0.",
  categoryId: "Select a category.",
  accountId: "Select an account.",
};

export function buildDefaultFormValues(overrides = {}) {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: "",
    type: "expense",
    amount: "",
    description: "",
    categoryId: "",
    accountId: "",
    date: today,
    ...overrides,
  };
}

export function transactionToFormValues(tx) {
  if (!tx) return buildDefaultFormValues();
  return buildDefaultFormValues({
    id: tx.id || "",
    type: tx.type === "income" ? "income" : "expense",
    amount: tx.amount != null ? String(tx.amount) : "",
    description: tx.description || "",
    categoryId: tx.category || "",
    accountId: tx.accountId || "",
    date: tx.date || new Date().toISOString().slice(0, 10),
  });
}

export function formValuesToPayload(values) {
  const amount = Number.parseFloat(values.amount);
  return {
    id: values.id || crypto.randomUUID(),
    type: values.type === "income" ? "income" : "expense",
    amount: Number.isFinite(amount) ? amount : 0,
    description: values.description?.trim() || "",
    category: values.categoryId || "",
    accountId: values.accountId || "",
    date: values.date || new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
  };
}

export default function TransactionForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  accounts = [],
  categories = [],
  isOnline = true,
  isSaving = false,
}) {
  const [errors, setErrors] = useState({});

  const accountOptions = useMemo(() => accounts || [], [accounts]);
  const categoryOptions = useMemo(() => categories || [], [categories]);

  const handleFieldChange = (field) => (eOrVal) => {
    const nextVal = eOrVal?.target ? eOrVal.target.value : eOrVal;
    const next = { ...values, [field]: nextVal };
    setErrors((prev) => ({ ...prev, [field]: "" }));
    onChange(next);
  };

  const validate = () => {
    const nextErrors = {};
    const amount = Number.parseFloat(values.amount);
    if (!values.description?.trim()) nextErrors.description = REQUIRED.description;
    if (!Number.isFinite(amount) || amount <= 0) nextErrors.amount = REQUIRED.amount;
    if (!values.categoryId) nextErrors.categoryId = REQUIRED.categoryId;
    if (accountOptions.length > 0 && !values.accountId) nextErrors.accountId = REQUIRED.accountId;
    return nextErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !isOnline) return;
    onSubmit(formValuesToPayload(values));
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="flex p-0.5 bg-surface-100 rounded-pill gap-1">
        {["expense", "income"].map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => handleFieldChange("type")(type)}
            className={`flex-1 py-1.5 text-caption font-bold rounded-pill transition-all border ${
              values.type === type
                ? "bg-surface-50 border-surface-200 shadow-sm text-surface-900"
                : "border-transparent text-surface-500"
            }`}
            disabled={!isOnline}
          >
            {type === "expense" ? "Expense" : "Income"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Amount"
          type="number"
          step="0.01"
          value={values.amount}
          onChange={handleFieldChange("amount")}
          className="rounded-lg"
          aria-invalid={Boolean(errors.amount)}
          helperText={errors.amount}
          disabled={!isOnline || isSaving}
        />
        <DateInput
          label="Date"
          value={values.date}
          onChange={handleFieldChange("date")}
          className="rounded-lg"
          disabled={!isOnline || isSaving}
        />
      </div>

      <Input
        label="Description"
        value={values.description}
        onChange={handleFieldChange("description")}
        className="rounded-lg"
        aria-invalid={Boolean(errors.description)}
        helperText={errors.description}
        disabled={!isOnline || isSaving}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Category"
          value={values.categoryId}
          onChange={handleFieldChange("categoryId")}
          className="rounded-lg"
          aria-invalid={Boolean(errors.categoryId)}
          helperText={errors.categoryId}
          disabled={!isOnline || isSaving}
        >
          <option value="">Select category</option>
          {categoryOptions.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </Select>

        <Select
          label="Account"
          value={values.accountId}
          onChange={handleFieldChange("accountId")}
          className="rounded-lg"
          aria-invalid={Boolean(errors.accountId)}
          helperText={errors.accountId}
          disabled={!isOnline || isSaving}
        >
          <option value="">{accountOptions.length ? "Select account" : "No accounts"}</option>
          {accountOptions.map((acct) => (
            <option key={acct.id} value={acct.id}>
              {acct.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="secondary" size="md" onClick={onCancel} disabled={isSaving} fullWidth>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isSaving}
          disabled={!isOnline || isSaving}
          fullWidth
        >
          {isOnline ? (isSaving ? "Saving..." : "Save transaction") : "Offline"}
        </Button>
      </div>
    </form>
  );
}
