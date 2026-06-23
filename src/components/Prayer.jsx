import { useState, useEffect, useRef } from 'react'
import { useLocalStorage } from '../useLocalStorage'
import s from './Prayer.module.css'

const CATS = ['전체', '가족', '직장', '교회', '전도', '감사', '치유', '기타']
const DEFAULT_PRAYERS = [
  { id: 1, text: '가족의 건강과 평안을 위해', cat: '가족', done: false },
  { id: 2, text: '직장에서의 지혜와 성실함', cat: '직장', done: false },
  { id: 3, text: '교회 공동체가 하나되길', cat: '교회', done: false },
  { id: 4, text: '전도 대상자 김민수 구원', cat: '전도', done: false },
]

const VERSES = [
  { text: '아무것도 염려하지 말고 오직 모든 일에 기도와 간구로 너희 구할 것을 감사함으로 하나님께 아뢰라', ref: '빌립보서 4:6' },
  { text: '너는 내게 부르짖으라 내가 네게 응답하겠고 크고 은밀한 일을 네게 보이리라', ref: '예레미야 33:3' },
  { text: '구하라 그리하면 너희에게 주실 것이요 찾으라 그리하면 찾아낼 것이요', ref: '마태복음 7:7' },
]

function fmt(sec) {
  return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0')
}

export default function Prayer() {
  const [prayers, setPrayers] = useLocalStorage('pb_prayers', DEFAULT_PRAYERS)
  const [nextId, setNextId] = useLocalStorage('pb_prayer_nextid', 5)
  const [activeCat, setActiveCat] = useState('전체')
  const [showModal, setShowModal] = useState(false)
  const [newText, setNewText] = useState('')
  const [newCat, setNewCat] = useState('가족')
  const [totalSaved, setTotalSaved] = useLocalStorage('pb_timer_total', 0)
  const [elapsed, setElapsed] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [completed, setCompleted] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    return () => clearInterval(intervalRef.current)
  }, [])

  const start = () => {
    setCompleted(false)
    intervalRef.current = setInterval(() => {
      setElapsed(e => e + 1)
    }, 1000)
    setIsRunning(true)
  }

  const stop = () => {
    clearInterval(intervalRef.current)
    setIsRunning(false)
  }

  const toggle = () => {
    if (isRunning) { stop() } else { start() }
  }

  const reset = () => {
    stop()
    setElapsed(0)
    setCompleted(false)
  }

  const complete = () => {
    stop()
    setTotalSaved(totalSaved + elapsed)
    setElapsed(0)
    setCompleted(true)
  }

  const verse = VERSES[new Date().getDate() % VERSES.length]
  const filtered = activeCat === '전체' ? prayers : prayers.filter(p => p.cat === activeCat)
  const doneCount = prayers.filter(p => p.done).length
  const filteredDone = filtered.filter(p => p.done).length
  const progPct = filtered.length ? (filteredDone / filtered.length) * 100 : 0

  const togglePrayer = (id) => setPrayers(prayers.map(p => p.id === id ? { ...p, done: !p.done } : p))
  const deletePrayer = (id, e) => { e.stopPropagation(); setPrayers(prayers.filter(p => p.id !== id)) }

  const addPrayer = () => {
    if (!newText.trim()) return
    setPrayers([...prayers, { id: nextId, text: newText.trim(), cat: newCat, done: false }])
    setNextId(nextId + 1)
    setNewText('')
    setNewCat('가족')
    setShowModal(false)
  }

  const totalMins = Math.floor(totalSaved / 60)
  const totalSecs = totalSaved % 60

  return (
    <div className={s.wrap}>
      <div className={s.verse}>
        <p>"{verse.text}"</p>
        <span>{verse.ref}</span>
      </div>

      <div className={s.catTabs}>
        {CATS.map(c => {
          const cnt = c === '전체' ? prayers.length : prayers.filter(p => p.cat === c).length
          return (
            <button key={c} className={s.catTab + (activeCat === c ? ' ' + s.catActive : '')} onClick={() => setActiveCat(c)}>
              {c}{cnt > 0 && <span className={s.catBadge}>{cnt}</span>}
            </button>
          )
        })}
      </div>

      <div className={s.progressRow}>
        <span className={s.progressText}>
          {activeCat === '전체' ? '전체 ' + doneCount + '/' + prayers.length : activeCat + ' ' + filteredDone + '/' + filtered.length} 완료
        </span>
        <div className={s.progressBar}>
          <div className={s.progressFill} style={{ width: progPct + '%' }} />
        </div>
      </div>

      <div className={s.list}>
        {filtered.length === 0 && <div className={s.empty}>이 카테고리에 기도 제목이 없어요</div>}
        {filtered.map(p => (
          <div key={p.id} className={s.item + (p.done ? ' ' + s.done : '')} onClick={() => togglePrayer(p.id)}>
            <div className={s.circle}>
              {p.done && <svg width="12" height="12" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </div>
            <span className={s.itemText}>{p.text}</span>
            <span className={s.cat}>{p.cat}</span>
            <button className={s.del} onClick={(e) => deletePrayer(p.id, e)}>x</button>
          </div>
        ))}
      </div>
      <button className={s.addBtn} onClick={() => setShowModal(true)}>+ 기도 제목 추가</button>

      <div className={s.timer}>
        <div className={s.timerLabel}>기도 시간</div>
        <div className={s.timerVal}>{fmt(elapsed)}</div>
        <div className={s.timerBtns}>
          <button className={s.tbtn} onClick={reset}>↺</button>
          <button className={s.tbtn + (isRunning ? ' ' + s.running : '')} onClick={toggle}>
            {isRunning ? '⏸' : '▶'}
          </button>
        </div>
        {completed && (
          <div className={s.timerDone}>🙏 기도 완료! 오늘도 수고하셨어요</div>
        )}
        {!completed && elapsed > 0 && !isRunning && (
          <button className={s.completeBtn} onClick={complete}>기도 완료 — 저장하기</button>
        )}
        <div className={s.timerTotal}>누적 기도 시간 {fmt(totalSaved)}</div>
      </div>

      {showModal && (
        <div className={s.overlay} onClick={() => setShowModal(false)}>
          <div className={s.sheet} onClick={e => e.stopPropagation()}>
            <div className={s.sheetTitle}>기도 제목 추가</div>
            <input className={s.sheetInput} value={newText} onChange={e => setNewText(e.target.value)}
              placeholder="기도 제목을 입력하세요" onKeyDown={e => e.key === 'Enter' && addPrayer()} autoFocus />
            <div className={s.catRow}>
              {CATS.filter(c => c !== '전체').map(c => (
                <button key={c} className={s.catBtn + (newCat === c ? ' ' + s.catSel : '')} onClick={() => setNewCat(c)}>{c}</button>
              ))}
            </div>
            <div className={s.sheetBtns}>
              <button className={s.cancelBtn} onClick={() => setShowModal(false)}>취소</button>
              <button className={s.confirmBtn} onClick={addPrayer}>추가</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}