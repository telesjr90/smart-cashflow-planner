const DEFAULT_LOCALE = "en-US";

export const formatDateShort = (dateStr, locale = DEFAULT_LOCALE) => {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(locale, { month: "short", day: "numeric" });
};

export const formatDateLong = (dateStr, locale = DEFAULT_LOCALE) => {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(locale, { weekday: "long", month: "short", day: "numeric" });
};

export const formatMonthYear = (dateStr, locale = DEFAULT_LOCALE) => {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(locale, { month: "short", year: "numeric" });
};

export const formatDateISO = (date) => {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};
