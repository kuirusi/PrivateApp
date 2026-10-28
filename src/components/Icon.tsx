interface IconProps {
  name: 'list' | 'stats' | 'me' | 'plus' | 'calendar' | 'note' | 'chevron'
  size?: number
}

const PATHS: Record<IconProps['name'], JSX.Element> = {
  list: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h10" />
    </>
  ),
  stats: (
    <>
      <path d="M5 20V11" />
      <path d="M12 20V4" />
      <path d="M19 20V14" />
    </>
  ),
  me: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M4.5 20c0-3.6 3.4-5.5 7.5-5.5s7.5 1.9 7.5 5.5" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5.5" width="17" height="15" rx="3" />
      <path d="M8 3.5v4M16 3.5v4M3.5 10.5h17" />
    </>
  ),
  note: (
    <>
      <path d="M5 4.5h14v11l-4 4H5z" />
      <path d="M15 19.5v-4h4" />
    </>
  ),
  chevron: <path d="M9 6l6 6-6 6" />
}

export default function Icon({ name, size = 22 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  )
}
