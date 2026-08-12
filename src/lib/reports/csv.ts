export type CsvColumn<T> = {
  key: keyof T
  label: string
  format?: (value: T[keyof T], row: T) => string
}

function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/** Builds a CSV string (with header row) from typed rows. Pure — no DOM/browser APIs. */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((col) => escapeCsvCell(col.label)).join(",")

  const lines = rows.map((row) =>
    columns
      .map((col) => {
        const raw = row[col.key]
        const formatted = col.format
          ? col.format(raw, row)
          : raw === null || raw === undefined
            ? ""
            : String(raw)
        return escapeCsvCell(formatted)
      })
      .join(",")
  )

  return [header, ...lines].join("\r\n")
}

/** Triggers a browser download of CSV content. Not testable in Node — kept separate from toCsv on purpose. */
export function downloadCsv(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
