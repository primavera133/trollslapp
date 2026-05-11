import React, { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg'
import type { WeekCount } from '../services/db'

type Foreground = 'year' | 'average'

interface Props {
  // All-years combined data
  allYears: WeekCount[]
  // Single year data — shown on top of the all-years curve when set
  selectedYear: WeekCount[] | null
  // Number of distinct years in allYears — used to show average when a year is selected
  yearCount?: number
  // Which layer is in front when both are shown
  foreground?: Foreground
  width: number
  height?: number
}

export type { Foreground }

const WEEKS = 52
const PADDING = { top: 12, right: 8, bottom: 32, left: 40 }

const COLOR_ALL_SOLO = '#023e8a'  // dark blue — all-years when no year selected
const COLOR_ALL_BG = '#8ecae6'    // light blue — all-years average as background
const COLOR_YEAR = '#023e8a'      // dark blue — selected year overlay

export function Histogram({ allYears, selectedYear, yearCount, foreground = 'year', width, height = 220 }: Props) {
  const chartW = width - PADDING.left - PADDING.right
  const chartH = height - PADDING.top - PADDING.bottom
  const barW = Math.max(1, chartW / WEEKS - 1)

  const showAverage = selectedYear != null && (yearCount ?? 0) > 1
  const divisor = showAverage ? (yearCount ?? 1) : 1

  const allMap = useMemo(() => {
    const m = new Map<number, number>()
    for (const d of allYears) m.set(d.week, d.total / divisor)
    return m
  }, [allYears, divisor])

  const yearMap = useMemo(() => {
    if (!selectedYear) return null
    const m = new Map<number, number>()
    for (const d of selectedYear) m.set(d.week, d.total)
    return m
  }, [selectedYear])

  const maxCount = useMemo(() => {
    const allMax = Math.max(0, ...Array.from(allMap.values()))
    const yearMax = selectedYear ? Math.max(0, ...selectedYear.map(d => d.total)) : 0
    return Math.max(1, Math.ceil(Math.max(allMax, yearMax)))
  }, [allMap, selectedYear])

  const scaleY = (count: number) => (count / maxCount) * chartH

  // Y-axis tick marks: 0, 50%, 100%
  const yTicks = [0, Math.round(maxCount / 2), Math.round(maxCount)]

  // X-axis labels: show months (approx week → month mapping)
  const monthLabels: { week: number; label: string }[] = [
    { week: 1, label: 'Jan' }, { week: 5, label: 'Feb' }, { week: 9, label: 'Mar' },
    { week: 14, label: 'Apr' }, { week: 18, label: 'Maj' }, { week: 22, label: 'Jun' },
    { week: 27, label: 'Jul' }, { week: 31, label: 'Aug' }, { week: 36, label: 'Sep' },
    { week: 40, label: 'Okt' }, { week: 45, label: 'Nov' }, { week: 49, label: 'Dec' },
  ]

  if (allYears.length === 0) {
    return (
      <View style={[styles.empty, { width, height }]}>
        <Text style={styles.emptyText}>Inga observationer</Text>
      </View>
    )
  }

  const totalObs = allYears.reduce((sum, d) => sum + d.total, 0)
  const peakWeek = allYears.reduce((best, d) => d.total > best.total ? d : best, allYears[0])

  return (
    <Svg
      width={width}
      height={height}
      accessibilityRole="image"
      accessibilityLabel={`Fenologidiagram med ${totalObs} observationer. Flest observationer vecka ${peakWeek?.week ?? '?'}.`}
    >
      {/* Y-axis ticks and gridlines */}
      {yTicks.map(tick => {
        const y = PADDING.top + chartH - scaleY(tick)
        return (
          <React.Fragment key={tick}>
            <Line
              x1={PADDING.left}
              y1={y}
              x2={PADDING.left + chartW}
              y2={y}
              stroke="#e0e0e0"
              strokeWidth={1}
            />
            <SvgText
              x={PADDING.left - 4}
              y={y + 4}
              fontSize={9}
              fill="#717171"
              textAnchor="end"
            >
              {Math.round(tick)}
            </SvgText>
          </React.Fragment>
        )
      })}

      {/* Render back layer first, then front layer on top */}
      {(() => {
        const allBars = Array.from({ length: WEEKS }, (_, i) => {
          const week = i + 1
          const count = allMap.get(week) ?? 0
          const barH = scaleY(count)
          const x = PADDING.left + i * (chartW / WEEKS)
          const y = PADDING.top + chartH - barH
          return (
            <Rect
              key={`all-${week}`}
              x={x}
              y={y}
              width={barW}
              height={barH}
              fill={yearMap ? COLOR_ALL_BG : COLOR_ALL_SOLO}
            />
          )
        })

        const yearBars = yearMap ? Array.from({ length: WEEKS }, (_, i) => {
          const week = i + 1
          const count = yearMap.get(week) ?? 0
          if (count === 0) return null
          const barH = scaleY(count)
          const x = PADDING.left + i * (chartW / WEEKS)
          const y = PADDING.top + chartH - barH
          return (
            <Rect
              key={`year-${week}`}
              x={x}
              y={y}
              width={barW}
              height={barH}
              fill={COLOR_YEAR}
            />
          )
        }) : null

        if (foreground === 'average') {
          return <>{yearBars}{allBars}</>
        }
        return <>{allBars}{yearBars}</>
      })()}

      {/* X-axis baseline */}
      <Line
        x1={PADDING.left}
        y1={PADDING.top + chartH}
        x2={PADDING.left + chartW}
        y2={PADDING.top + chartH}
        stroke="#ccc"
        strokeWidth={1}
      />

      {/* Month labels */}
      {monthLabels.map(({ week, label }) => {
        const x = PADDING.left + (week - 1) * (chartW / WEEKS)
        return (
          <SvgText
            key={label}
            x={x}
            y={height - 6}
            fontSize={9}
            fill="#717171"
          >
            {label}
          </SvgText>
        )
      })}
    </Svg>
  )
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#767676',
    fontSize: 14,
  },
})
