// ─────────────────────────────────────────────────────────────────────────────
// Local-timezone date utilities
// IMPORTANT: never use `Date.toISOString().slice(0,10)` to produce a calendar
// date string — that converts to UTC and shifts the date by hours, so a record
// added at 4 AM local (UTC+8) gets stored as the previous day. These helpers
// always use the local-timezone Y/M/D components.
// ─────────────────────────────────────────────────────────────────────────────

// Format a Date as 'YYYY-MM-DD' in the user's local timezone.
export function toDateStr(d) {
  const y   = d.getFullYear()
  const m   = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Today as 'YYYY-MM-DD' in local timezone.
export function todayStr() {
  return toDateStr(new Date())
}
