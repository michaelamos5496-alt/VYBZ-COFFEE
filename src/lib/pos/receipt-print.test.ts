import { describe, expect, it } from "vitest"

import { thermalReceiptPrintCss } from "./receipt-print"

describe("thermalReceiptPrintCss", () => {
  it("sizes the print page and content for an 80mm roll", () => {
    const css = thermalReceiptPrintCss("80mm")
    expect(css).toContain("@page { size: 80mm auto; margin: 0; }")
    expect(css).toContain("width: 72mm")
  })

  it("sizes the print page and content for a 58mm roll", () => {
    const css = thermalReceiptPrintCss("58mm")
    expect(css).toContain("@page { size: 58mm auto; margin: 0; }")
    expect(css).toContain("width: 48mm")
  })

  it("uses a smaller font for the narrower 58mm roll", () => {
    const wide = thermalReceiptPrintCss("80mm")
    const narrow = thermalReceiptPrintCss("58mm")
    expect(narrow).toContain("10px")
    expect(wide).toContain("11px")
  })
})
