export type BarChartPoint = {
  label: string
  value: number
  secondaryValue?: number
}

export function BarChart({
  data,
  valueFormatter = (v) => v.toString(),
  secondaryLabel,
  emptyMessage = "No data yet",
}: {
  data: BarChartPoint[]
  valueFormatter?: (value: number) => string
  secondaryLabel?: string
  emptyMessage?: string
}) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const hasData = data.some((d) => d.value > 0)

  if (!hasData) {
    return (
      <div className="text-muted-foreground flex h-64 items-center justify-center rounded-lg border border-dashed text-sm">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="flex h-64 items-stretch gap-1.5 sm:gap-2">
      {data.map((point, index) => {
        const heightPercent = Math.max(2, (point.value / max) * 100)
        const title = [
          point.label,
          valueFormatter(point.value),
          secondaryLabel && point.secondaryValue !== undefined
            ? `${point.secondaryValue} ${secondaryLabel}`
            : null,
        ]
          .filter(Boolean)
          .join(" — ")

        return (
          <div
            key={`${point.label}-${index}`}
            className="group flex flex-1 flex-col items-center justify-end gap-2"
            title={title}
          >
            <span className="text-muted-foreground hidden text-xs tabular-nums opacity-0 transition-opacity group-hover:opacity-100 sm:block">
              {valueFormatter(point.value)}
            </span>
            <div className="bg-muted flex w-full flex-1 items-end overflow-hidden rounded-t-sm">
              <div
                className="bg-chart-1 group-hover:bg-primary w-full rounded-t-sm transition-colors"
                style={{ height: `${heightPercent}%` }}
              />
            </div>
            <span className="text-muted-foreground w-full truncate text-center text-[10px] sm:text-xs">
              {point.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
