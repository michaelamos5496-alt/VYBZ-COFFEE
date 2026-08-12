import { describe, expect, it } from "vitest"

import { endOfUTCDay, getDateRange, startOfUTCDay } from "./date-ranges"

describe("startOfUTCDay", () => {
  it("truncates to midnight UTC", () => {
    const result = startOfUTCDay(new Date("2026-03-05T14:32:10.123Z"))
    expect(result.toISOString()).toBe("2026-03-05T00:00:00.000Z")
  })
})

describe("endOfUTCDay", () => {
  it("returns one millisecond before the next midnight UTC", () => {
    const result = endOfUTCDay(new Date("2026-03-05T14:32:10.123Z"))
    expect(result.toISOString()).toBe("2026-03-05T23:59:59.999Z")
  })
})

describe("getDateRange", () => {
  const now = new Date("2026-03-05T14:32:10.000Z")

  it("'today' starts at midnight UTC and ends now", () => {
    const range = getDateRange("today", now)
    expect(range.start.toISOString()).toBe("2026-03-05T00:00:00.000Z")
    expect(range.end).toBe(now)
  })

  it("'7days' spans the last 7 calendar days inclusive of today", () => {
    const range = getDateRange("7days", now)
    // today (03-05) + 6 prior days = 02-27
    expect(range.start.toISOString()).toBe("2026-02-27T00:00:00.000Z")
    expect(range.end).toBe(now)
  })

  it("'30days' spans the last 30 calendar days inclusive of today", () => {
    const range = getDateRange("30days", now)
    expect(range.start.toISOString()).toBe("2026-02-04T00:00:00.000Z")
    expect(range.end).toBe(now)
  })
})
