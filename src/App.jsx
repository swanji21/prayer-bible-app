import { useState } from 'react'
import Prayer from './components/Prayer'
import Bible from './components/Bible'
import Journal from './components/Journal'
import Stats from './components/Stats'
import s from './App.module.css'

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']
const now = new Date()
const todayStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 (${DAY_NAMES[now.getDay()]})`

const TABS = [
  { id: 'prayer', label: '기도' },
  { id: 'bible', label: '통독' },
  { id: 'journal', label: '묵상' },
  { id: 'stats', label: '통계' },
]

export default function App() {
  const [tab, setTab] = useState('prayer')

  return (
    <div className={s.app}>
      <header className={s.header}>
        <div className={s.headerTop}>
          <span className={s.appTitle}>✝ 말씀과 기도</span>
          <span className={s.streak}>🔥 연속 기도 중</span>
        </div>
        <span className={s.dateLabel}>{todayStr}</span>
      </header>

      <nav className={s.tabBar}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={`${s.tab} ${tab === t.id ? s.active : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className={s.body}>
        {tab === 'prayer'  && <Prayer />}
        {tab === 'bible'   && <Bible />}
        {tab === 'journal' && <Journal />}
        {tab === 'stats'   && <Stats />}
      </div>
    </div>
  )
}
