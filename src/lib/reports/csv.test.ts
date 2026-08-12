import { describe, expect, it } from "vitest"

import { toCsv } from "./csv"

type Row = { name: string; total: number; note: string | null }

describe("toCsv", () => {
  it("builds a header row from column labels", () => {
    const csv = toCsv<Row>([], [
      { key: "name", label: "Name" },
      { key: "total", label: "Total" },
    ])
    expect(csv).toBe("Name,Total")
  })

  it("renders one line per row in column order", () => {
    const rows: Row[] = [
      { name: "Cappuccino", total: 35, note: null },
      { name: "Latte", total: 38, note: null },
    ]
    const csv = toCsv(rows, [
      { key: "name", label: "Name" },
      { key: "total", label: "Total" },
    ])
    expect(csv).toBe("Name,Total\r\nCappuccino,35\r\nLatte,38")
  })

  it("applies a custom formatter per column", () => {
    const rows: Row[] = [{ name: "Cappuccino", total: 35, note: null }]
    const csv = toCsv(rows, [
      { key: "name", label: "Name" },
      { key: "total", label: "Total", format: (value) => `GH₵${Number(value).toFixed(2)}` },
    ])
    expect(csv).toBe("Name,Total\r\nCappuccino,GH₵35.00")
  })

  it("renders null/undefined values as an empty cell", () => {
    const rows: Row[] = [{ name: "Cappuccino", total: 35, note: null }]
    const csv = toCsv(rows, [
      { key: "name", label: "Name" },
      { key: "note", label: "Note" },
    ])
    expect(csv).toBe("Name,Note\r\nCappuccino,")
  })

  it("quotes and escapes values containing commas, quotes, or newlines", () => {
    const rows: Row[] = [
      { name: 'Two, "Special" items\nSecond line', total: 10, note: null },
    ]
    const csv = toCsv(rows, [{ key: "name", label: "Name" }])
    expect(csv).toBe('Name\r\n"Two, ""Special"" items\nSecond line"')
  })

  it("leaves plain values unquoted", () => {
    const rows: Row[] = [{ name: "Plain Name", total: 10, note: null }]
    const csv = toCsv(rows, [{ key: "name", label: "Name" }])
    expect(csv).toBe("Name\r\nPlain Name")
  })
})
