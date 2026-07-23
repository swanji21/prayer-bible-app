import { useState, useEffect } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './firebase'
import Prayer from './components/Prayer'
import Bible from './components/Bible'
import Journal from './components/Journal'
import FamilyWorship from './components/FamilyWorship'
import Stats from './components/Stats'
import Login from './components/Login'
import s from './App.module.css'

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']
const now = new Date()
const todayStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 (${DAY_NAMES[now.getDay()]})`

const TABS = [
  { id: 'prayer', label: '기도' },
  { id: 'bible', label: '통독' },
  { id: 'journal', label: '묵상' },
  { id: 'family', label: '가정예배' },
  { id: 'stats', label: '통계' },
]

export default function App() {
  const [tab, setTab] = useState('prayer')
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    return onAuthStateChanged(auth, u => { setUser(u); setAuthReady(true) })
  }, [])

  if (!authReady) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#001f3f', color: 'rgba(255,255,255,0.6)', fontSize: '14px'
      }}>불러오는 중...</div>
    )
  }

  if (!user) return <Login />

  return (
    <div className={s.app}>
      <header className={s.header}>
        <div className={s.headerTop}>
          <span className={s.appTitle}>✝ 말씀과 기도</span>
          <span className={s.streak}>🔥 연속 기도 중</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className={s.dateLabel}>{todayStr}</span>
          <button
            onClick={() => { if (confirm('로그아웃 할까요?')) signOut(auth) }}
            style={{
              padding: '3px 9px', fontSize: '11px', borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.2)', background: 'transparent',
              color: 'rgba(255,255,255,0.5)', cursor: 'pointer'
            }}>
            로그아웃
          </button>
        </div>
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
        {tab === 'family'  && <FamilyWorship />}
        {tab === 'stats'   && <Stats />}
      </div>
    </div>
  )
}
