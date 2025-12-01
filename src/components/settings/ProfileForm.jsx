// File: src/components/settings/ProfileForm.jsx
import React from "react";
import { Users, CheckCircle2, Copy } from "lucide-react";

/**
 * Household & Profile settings card.
 *
 * Controlled by the parent (Settings), which owns all state.
 * This component just renders the UI and surfaces changes via callbacks.
 */
export default function ProfileForm({
  uid,
  householdCount,
  localHouseholdId,
  localRole,
  dirtyProfile,
  onProfileChange,
  onSaveProfile,
}) {
  const handleCopyUserId = () => {
    if (!uid) return;
    try {
      navigator.clipboard.writeText(uid);
      alert("Copied User ID!");
    } catch {
      alert("Unable to copy User ID");
    }
  };

  return (
    <section className="mt-2">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="text-indigo-500" size={18} />
            <div className="text-sm font-semibold text-slate-900">
              Household &amp; Profile
            </div>
          </div>
          {householdCount > 1 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
              <CheckCircle2 size={13} />
              Synced
            </span>
          )}
        </div>

        {/* User ID Copy */}
        <div className="mb-3">
          <label className="block text-[11px] font-medium text-slate-500 mb-1">
            Your User ID
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600">
              {uid || "(not signed in)"}
            </div>
            <button
              type="button"
              onClick={handleCopyUserId}
              className="text-slate-500 hover:text-slate-700"
            >
              <Copy size={14} />
            </button>
          </div>
        </div>

        {/* Profile form */}
        <div className="space-y-2 text-[11px]">
          <div className="flex items-center justify-between gap-2">
            <label className="text-slate-500" htmlFor="household-id">
              Household ID
            </label>
            <input
              id="household-id"
              type="text"
              className="w-32 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-800"
              value={localHouseholdId}
              onChange={(e) => onProfileChange("householdId", e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <label className="text-slate-500" htmlFor="role">
              Role
            </label>
            <select
              id="role"
              className="w-32 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-800"
              value={localRole}
              onChange={(e) => onProfileChange("role", e.target.value)}
            >
              <option value="H">Partner H</option>
              <option value="W">Partner W</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {dirtyProfile && (
          <div className="mt-3 flex items-center justify-end">
            <button
              type="button"
              onClick={onSaveProfile}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-700"
            >
              <CheckCircle2 size={12} /> Save profile
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
