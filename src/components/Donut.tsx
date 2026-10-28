import { yuan } from '../lib/format'

export interface DonutSlice {
  label: string
  value: number
  color: string
}

interface Props {
  data: DonutSlice[]
  size?: number
  thickness?: number
  centerLabel?: string
  centerValue?: number
}

export default function Donut({ data, size = 150, thickness = 20, centerLabel, centerValue }: Props) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const radius = (size - thickness) / 2
  const circumference = Math.PI * 2 * radius
  const center = size / 2
  const gap = data.length > 1 ? 2.5 : 0

  let offset = 0
  const slices = data.map((item) => {
    const length = total > 0 ? (item.value / total) * circumference : 0
    const visible = Math.max(length - gap, 0.6)
    const slice = {
      key: item.label,
      color: item.color,
      dashArray: `${visible} ${circumference - visible}`,
      dashOffset: -offset
    }
    offset += length
    return slice
  })

  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#eef1f9" strokeWidth={thickness} />
        <g transform={`rotate(-90 ${center} ${center})`}>
          {slices.map((slice) => (
            <circle
              key={slice.key}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth={thickness}
              strokeDasharray={slice.dashArray}
              strokeDashoffset={slice.dashOffset}
            />
          ))}
        </g>
      </svg>
      <div className="donut__center">
        <span className="donut__label">{centerLabel ?? '合计'}</span>
        <span className="donut__value">{yuan(centerValue ?? total)}</span>
      </div>
    </div>
  )
}
