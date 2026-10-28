import Icon from './Icon'

export type TabKey = 'list' | 'stats' | 'me'

interface Props {
  tab: TabKey
  onChange: (tab: TabKey) => void
}

const ITEMS: { key: TabKey; label: string; icon: 'list' | 'stats' | 'me' }[] = [
  { key: 'list', label: '明细', icon: 'list' },
  { key: 'stats', label: '统计', icon: 'stats' },
  { key: 'me', label: '我的', icon: 'me' }
]

export default function TabBar({ tab, onChange }: Props) {
  return (
    <nav className="tabbar">
      {ITEMS.map((item) => (
        <button
          type="button"
          key={item.key}
          className={`tabbar__item ${tab === item.key ? 'tabbar__item--active' : ''}`}
          onClick={() => onChange(item.key)}
        >
          <Icon name={item.icon} />
          <span className="tabbar__label">{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
