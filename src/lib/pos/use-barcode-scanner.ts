"use client"

import { useEffect, useRef } from "react"

// A USB/Bluetooth barcode scanner in "keyboard wedge" mode is just a
// keyboard that types very fast — no driver, SDK, or specific hardware
// required. It types the barcode's characters in a tight burst (a few
// milliseconds apart, far faster than a person can type) and finishes
// with Enter. This listens for that pattern globally and hands the
// completed code to the caller, who looks it up as a product SKU.
const MAX_GAP_MS = 75
const MIN_CODE_LENGTH = 3

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable
}

export function useBarcodeScanner(onScan: (code: string) => void, enabled = true) {
  const bufferRef = useRef("")
  const lastKeyTimeRef = useRef(0)
  const onScanRef = useRef(onScan)

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    if (!enabled) return

    function handleKeyDown(event: KeyboardEvent) {
      // A focused input/textarea/select handles its own typing (e.g. the
      // product search box, which has its own scan-on-Enter handling).
      if (isTypingTarget(event.target)) return

      const now = Date.now()
      const gap = now - lastKeyTimeRef.current
      lastKeyTimeRef.current = now

      if (gap > MAX_GAP_MS) {
        bufferRef.current = ""
      }

      if (event.key === "Enter") {
        const code = bufferRef.current
        bufferRef.current = ""
        if (code.length >= MIN_CODE_LENGTH) {
          onScanRef.current(code)
        }
        return
      }

      if (event.key.length === 1) {
        bufferRef.current += event.key
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [enabled])
}
