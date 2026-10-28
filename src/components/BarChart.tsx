export interface BarGroup {
  label: string
  income: number
  expense: number
}

interface Props {
  groups: BarGroup[]
  /** 需要高亮的柱组下标（超支月份） */
  highlightIndex?: number
}

const WIDTH = 320
const HEIGHT = 168
const PAD = { top: 16, right: 6, bottom: 24, left: 6 }

export default function BarChart({ groups, highlightIndex }: Props) {
  const chartWidth = WIDTH - PAD.left - PAD.right
  const chartHeight = HEIGHT - PAD.top - PAD.bottom
  const maxValue = groups.reduce((max, item) => Math.max(max, item.income, item.expense), 0)
  const scaleMax = Math.max(maxValue, 1) * 1.12
  const step = groups.length > 0 ? chartWidth / groups.length : chartWidth
  const barWidth = Math.min(14, step * 0.26)

  const toHeight = (value: number) => (value / scaleMax) * chartHeight

  return (
    <svg className="bars" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="近六个月收支对比">
      {[0, 0.5, 1].map((ratio) => (
        <line
          key={ratio}
          x1={PAD.left}
          x2={WIDTH - PAD.right}
          y1={PAD.top + chartHeight * ratio}
          y2={PAD.top + chartHeight * ratio}
          stroke="#eef1f9"
          strokeWidth="1"
        />
      ))}
      {typeof highlightIndex === 'number' && groups[highlightIndex] ? (
        <rect
          x={PAD.left + step * highlightIndex + 1}
          y={PAD.top - 6}
          width={step - 2}
          height={chartHeight + 12}
          rx={10}
          fill="rgba(239, 91, 107, 0.08)"
          stroke="rgba(239, 91, 107, 0.45)"
          strokeWidth="1"
          strokeDasharray="4 3"
        />
      ) : null}
      {groups.map((group, index) => {
        const centerX = PAD.left + step * index + step / 2
        const expenseHeight = toHeight(group.expense)
        const incomeHeight = toHeight(group.income)
        return (
          <g key={group.label}>
            {expenseHeight > 0 ? (
              <rect
                x={centerX - barWidth - 1.5}
                y={PAD.top + chartHeight - expenseHeight}
                width={barWidth}
                height={expenseHeight}
                rx={barWidth / 2}
                fill="#ef5b6b"
              />
            ) : null}
            {incomeHeight > 0 ? (
              <rect
                x={centerX + 1.5}
                y={PAD.top + chartHeight - incomeHeight}
                width={barWidth}
                height={incomeHeight}
                rx={barWidth / 2}
                fill="#1fa97a"
              />
            ) : null}
            <text x={centerX} y={HEIGHT - 6} textAnchor="middle" className="bars__label">
              {group.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
