export type ReportPeriod = "today" | "7days" | "30days"

export type DateRange = {
  start: Date
  end: Date
}

/**
 * Midnight UTC for the given date. Both this and the `sales_by_day` /
 * `dashboard_stats` Postgres functions treat "today" as the UTC
 * calendar day (Supabase's default session timezone), so the client and
 * the database always agree on where a day boundary falls.
 */
export function startOfUTCDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

export function endOfUTCDay(date: Date): Date {
  const start = startOfUTCDay(date)
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1)
}

const PERIOD_DAYS: Record<ReportPeriod, number> = {
  today: 1,
  "7days": 7,
  "30days": 30,
}

/** Resolves a report period into a concrete [start, end] range, ending "now". */
export function getDateRange(period: ReportPeriod, now: Date = new Date()): DateRange {
  const days = PERIOD_DAYS[period]
  const start = new Date(startOfUTCDay(now).getTime() - (days - 1) * 24 * 60 * 60 * 1000)
  return { start, end: now }
}

export const PERIOD_LABELS: Record<ReportPeriod, string> = {
  today: "Today",
  "7days": "Last 7 days",
  "30days": "Last 30 days",
}
