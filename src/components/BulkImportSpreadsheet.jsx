// src/components/BulkImportSpreadsheet.jsx
import React, { useRef, useState } from "react";
import Papa from "papaparse";
import { UploadCloud, Loader2 } from "lucide-react";
import { Button } from "./ui/Button";
import { useToast } from "./ui/toast/useToast";

/**
 * Bulk import component for onboarding accounts + bills from a CSV template.
 *
 * Expected CSV headers:
 *   type,name,account_type,opening_balance,bill_amount,bill_due_day,bill_payer,bill_category,bill_account_name
 *
 * - Rows with type = "account" create accounts.
 * - Rows with type = "bill" create bills.
 *
 * This component parses the file and returns normalized arrays of {accounts, bills} via `onImport`.
 * The parent (e.g. Settings page) is responsible for mapping names to IDs and persisting.
 */
export default function BulkImportSpreadsheet({
  onImport,
  templateHref = "/templates/onboarding-import-template.csv",
}) {
  const { showToast } = useToast();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [errors, setErrors] = useState([]);
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    setErrors([]);
    setPreview(null);
  };

  const parseFile = () => {
    if (!file) return;

    setParsing(true);
    setErrors([]);
    setPreview(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setParsing(false);

        const rows = results.data || [];
        const errs = [];

        const accounts = [];
        const bills = [];

        rows.forEach((rawRow, index) => {
          const row = normalizeRow(rawRow);
          const line = index + 2; // header is line 1

          if (!row.type) {
            errs.push(`Row ${line}: missing "type" (expected "account" or "bill").`);
            return;
          }

          const type = row.type.toLowerCase().trim();

          if (type === "account") {
            const account = rowToAccount(row, line, errs);
            if (account) accounts.push(account);
          } else if (type === "bill") {
            const bill = rowToBill(row, line, errs);
            if (bill) bills.push(bill);
          } else {
            errs.push(`Row ${line}: unknown type "${row.type}" (expected "account" or "bill").`);
          }
        });

        if (errs.length > 0) {
          setErrors(errs);
          setPreview(null);
        } else {
          setErrors([]);
          setPreview({ accounts, bills });
        }
      },
      error: (err) => {
        setParsing(false);
        setErrors([`Failed to parse file: ${err.message}`]);
      },
    });
  };

  const handleImportClick = () => {
    if (!preview) return;
    setImporting(true);
    Promise.resolve(onImport(preview))
      .then(() => {
        showToast({
          type: "success",
          message: `Imported ${preview.accounts.length} account(s) and ${preview.bills.length} bill(s).`,
        });
        setFile(null);
        setPreview(null);
        setErrors([]);
      })
      .catch((err) => {
        console.error("Import failed", err);
        showToast({ type: "error", message: "Import failed. Please try again." });
      })
      .finally(() => setImporting(false));
  };

  return (
    <div className="mt-4 rounded-2xl border border-surface-200 bg-surface-50 p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={templateHref}
          download="cashflow-onboarding-template.csv"
          className="text-caption font-semibold text-primary-600 underline"
        >
          Download CSV template
        </a>

        <div className="flex-1 min-w-[240px]">
          <label
            htmlFor="bulk-import-file"
            className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-surface-200 bg-white px-4 py-3 hover:border-primary-300 transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            <div className="h-10 w-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
              {parsing ? <Loader2 className="animate-spin" size={20} /> : <UploadCloud size={20} />}
            </div>
            <div className="flex flex-col text-body text-surface-900">
              <span className="font-semibold">{file ? file.name : "Select or drop a CSV file"}</span>
              <span className="text-caption text-surface-500">CSV only · accounts & bills</span>
            </div>
            <input
              ref={inputRef}
              id="bulk-import-file"
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        <Button
          type="button"
          onClick={parseFile}
          disabled={!file || parsing}
          size="sm"
          variant="secondary"
          icon={parsing ? Loader2 : undefined}
          isLoading={parsing}
        >
          {parsing ? "Parsing..." : "Preview import"}
        </Button>
      </div>

      {errors.length > 0 && (
        <div className="rounded-2xl bg-danger-500/10 p-3 text-caption text-danger-600 space-y-1 border border-danger-500/20">
          <div className="font-semibold">Import issues</div>
          <ul className="list-disc pl-4 space-y-0.5">
            {errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {preview && (
        <div className="rounded-2xl bg-white p-3 text-body text-surface-900 flex flex-col gap-3 border border-surface-200">
          <div className="flex flex-wrap gap-3 text-caption text-surface-600">
            <span>
              Accounts to import: <strong>{preview.accounts.length}</strong>
            </span>
            <span>
              Bills to import: <strong>{preview.bills.length}</strong>
            </span>
          </div>

          <div className="flex flex-wrap gap-4">
            {preview.accounts.length > 0 && (
              <div className="space-y-1">
                <div className="font-semibold text-body">Sample accounts</div>
                <ul className="list-disc pl-4 text-caption text-surface-600 space-y-0.5">
                  {preview.accounts.slice(0, 3).map((a) => (
                    <li key={`${a.name}-${a.type}`}>
                      {a.name} — {a.type} — {a.openingBalance.toFixed(2)}
                    </li>
                  ))}
                  {preview.accounts.length > 3 && <li>… and {preview.accounts.length - 3} more</li>}
                </ul>
              </div>
            )}

            {preview.bills.length > 0 && (
              <div className="space-y-1">
                <div className="font-semibold text-body">Sample bills</div>
                <ul className="list-disc pl-4 text-caption text-surface-600 space-y-0.5">
                  {preview.bills.slice(0, 3).map((b) => (
                    <li key={`${b.name}-${b.dueDay}`}>
                      {b.name} — {b.amount.toFixed(2)} on day {b.dueDay}
                      {b.accountName ? ` (from ${b.accountName})` : ""}
                    </li>
                  ))}
                  {preview.bills.length > 3 && <li>… and {preview.bills.length - 3} more</li>}
                </ul>
              </div>
            )}
          </div>

          <Button
            type="button"
            onClick={handleImportClick}
            variant="primary"
            size="sm"
            icon={importing ? Loader2 : undefined}
            isLoading={importing}
            disabled={importing}
            className="self-start"
          >
            {importing ? "Importing..." : "Import into plan"}
          </Button>
        </div>
      )}

      {!preview && errors.length === 0 && (
        <p className="text-caption text-surface-500">
          Use the template to add rows for your <span className="font-medium">accounts</span> and{" "}
          <span className="font-medium">bills</span>, save as CSV, then upload it here to preview and import.
        </p>
      )}
    </div>
  );
}

/**
 * Normalize header casing / whitespace so the component is tolerant of
 * small header differences as long as they map to expected names.
 */
function normalizeRow(rawRow) {
  const normalized = {};
  Object.keys(rawRow || {}).forEach((key) => {
    const normalizedKey = key.trim().toLowerCase();
    normalized[normalizedKey] = rawRow[key];
  });
  // For convenience, also expose canonical names
  return {
    ...normalized,
    type: normalized.type,
    name: normalized.name,
    account_type: normalized.account_type,
    opening_balance: normalized.opening_balance,
    bill_amount: normalized.bill_amount,
    bill_due_day: normalized.bill_due_day,
    bill_payer: normalized.bill_payer,
    bill_category: normalized.bill_category,
    bill_account_name: normalized.bill_account_name,
  };
}

function toNumber(value) {
  if (value == null || value === "") return NaN;
  const n = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : NaN;
}

function rowToAccount(row, line, errs) {
  if (!row.name || !String(row.name).trim()) {
    errs.push(`Row ${line}: account row is missing "name".`);
    return null;
  }

  const openingRaw = row.opening_balance;
  const opening = toNumber(openingRaw);
  if (Number.isNaN(opening)) {
    errs.push(`Row ${line}: invalid opening_balance "${openingRaw}" (expected a number).`);
    return null;
  }

  return {
    name: String(row.name).trim(),
    type: (row.account_type || "deposit").trim(),
    openingBalance: opening,
  };
}

function rowToBill(row, line, errs) {
  if (!row.name || !String(row.name).trim()) {
    errs.push(`Row ${line}: bill row is missing "name".`);
    return null;
  }

  const amountRaw = row.bill_amount;
  const amount = toNumber(amountRaw);
  if (Number.isNaN(amount)) {
    errs.push(`Row ${line}: invalid bill_amount "${amountRaw}" (expected a number).`);
    return null;
  }

  const dueRaw = row.bill_due_day;
  const dueDay = Number(String(dueRaw).trim());
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
    errs.push(`Row ${line}: invalid bill_due_day "${dueRaw}" (expected integer between 1 and 31).`);
    return null;
  }

  return {
    name: String(row.name).trim(),
    amount,
    dueDay,
    payer: (row.bill_payer || "AUTO").trim(),
    category: row.bill_category ? String(row.bill_category).trim() : null,
    accountName: row.bill_account_name ? String(row.bill_account_name).trim() : null,
  };
}
