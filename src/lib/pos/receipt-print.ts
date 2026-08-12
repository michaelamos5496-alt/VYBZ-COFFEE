import type { ReceiptPaperWidth } from "@/types/database"

type PaperProfile = {
  /** Passed to the print job's @page size — most browsers/thermal drivers honor this for the physical roll width. */
  page: string
  /** The printable content area, narrower than the roll to leave the printer's fixed margins. */
  content: string
  fontSize: string
}

const PAPER_PROFILES: Record<ReceiptPaperWidth, PaperProfile> = {
  "58mm": { page: "58mm", content: "48mm", fontSize: "10px" },
  "80mm": { page: "80mm", content: "72mm", fontSize: "11px" },
}

/**
 * CSS for printing the receipt at the shop's configured thermal paper
 * width, isolated from the rest of the page (no dialog chrome, no
 * browser UI). Injected as a `<style>` tag by the Receipt component so
 * it can vary per business_settings.receipt_paper_width — `@page` rules
 * can't be scoped by a CSS selector, only declared outright, so this is
 * generated per print rather than living as a fixed rule in globals.css.
 */
export function thermalReceiptPrintCss(paperWidth: ReceiptPaperWidth): string {
  const profile = PAPER_PROFILES[paperWidth]

  return `@media print {
  @page { size: ${profile.page} auto; margin: 0; }
  [data-print-receipt] { width: ${profile.content}; font-size: ${profile.fontSize}; }
}`
}
