// Date display. All times are shown in Asia/Kathmandu.
const TZ = "Asia/Kathmandu";

const dateFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** "08 Oct 2026" */
export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

/** "08 Oct 2026, 14:05" */
export function formatDateTime(iso: string): string {
  return dateTimeFmt.format(new Date(iso));
}

/** Date-only strings (YYYY-MM-DD) are calendar dates: format without timezone shifts. */
export function formatDateOnly(ymd: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(`${ymd}T00:00:00Z`),
  );
}

/** "08 Oct – 14 Oct 2026" */
export function formatDateRange(start: string, end: string): string {
  return `${formatDate(start)} – ${formatDate(end)}`;
}

const BS_MONTHS = [
  "Baishakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin",
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra",
];

/** "2083-06-23" -> "23 Ashwin 2083 BS" */
export function formatBs(bs: string): string {
  const [y, m, d] = bs.split("-");
  const month = BS_MONTHS[Number(m) - 1];
  if (!y || !month || !d) return `${bs} BS`;
  return `${Number(d)} ${month} ${y} BS`;
}
