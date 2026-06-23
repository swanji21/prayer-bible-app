import { useState } from 'react'
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
  { text: '너는 내게 부르짖으라 내가 네게 응답하겠고 네가 알지 못하는 크고 은밀한 일을 네게 보이리라', ref: '예레미야 33:3' },
  { text: '구하라 그리하면 너희에게 주실 것이요 찾으라 그리하면 찾아낼 것이요', ref: '마태복음 7:7' },
]

export default function Prayer() {
  const [prayers, setPrayers] = useLocalStorage('pb_prayers', DEFAULT_PRAYERS)
  const [nextId, setNextId] = useLocalStorage('pb_prayer_nextid', 5)
  const [activeCat, setActiveCat] = useState('전체')
  const [showModal, setShowModal] = useState(false)
  const [newText, setNewText] = useState('')
  const [newCat, setNewCat] = useState('가족')
  const [timerSec, setTimerSec] = useLocalStorage('pb_timer', 0)
  const [running, setRunning] = useState(false)
  const [intervalId, setIntervalId] = useState(null)

  const verse = VERSES[new Date().getDate() % VERSES.length]

  const filtered = activeCat === '전체' ? prayers : prayers.filter(p => p.cat === activeCat)
  const doneCount = prayers.filter(p => p.done).length

  const togglePrayer = (id) => setPrayers(prayers.map(p => p.id === id ? { ...p, done: !p.done } : p))
  const deletePrayer = (id, e) => { e.stopPropagation(); setPrayers(prayers.filter(p => p.id !== id)) }

  const addPrayer = () => {
    if (!newText.trim()) return
    setPrayers([...prayers, { id: nextId, text: newText.trim(), cat: newCat, done: false }])
    setNextId(nextId + 1)
    setNewText(''); setNewCat('가족'); setShowModal(false)
  }

  const startTimer = () => {
    const id = setInterval(() => setTimerSec(s => s + 1), 1000)
    setIntervalId(id); setRunning(true)
  }
  const stopTimer = () => { clearInterval(intervalId); setRunning(false) }
  const resetTimer = () => { stopTimer(); setTimerSec(0) }
  const toggleTimer = () => running ? stopTimer() : startTimer()

  const mm = String(Math.floor(timerSec / 60)).padStart(2, '0')
  const ss = String(timerSec % 60).padStart(2, '0')

  return (
    <div className={s.wrap}>
      <div className={s.verse}>
        <p>"{verse.text}"</p>
        <span>{verse.ref}</span>
      </div>

      {/* 카테고리 탭 */}
      <div className={s.catTabs}>
        {CATS.map(c => {
          const cnt = c === '전체' ? prayers.length : prayers.filter(p => p.cat === c).length
          return (
            <button key={c} className={`${s.catTab} ${activeCat === c ? s.catActive : ''}`} onClick={() => setActiveCat(c)}>
              {c}
              {cnt > 0 && <span className={s.catBadge}>{cnt}</span>}
            </button>
          )
        })}
      </div>

      {/* 완료 현황 */}
      <div className={s.progressRow}>
        <span className={s.progressText}>
          {activeCat === '전체' ? `전체 ${doneCount}/${prayers.length}` : `${activeCat} ${filtered.filter(p=>p.done).length}/${filtered.length}`} 완료
        </span>
        <div className={s.progressBar}>
          <div className={s.progressFill} style={{
            width: `${filtered.length ? (filtered.filter(p=>p.done).length / filtered.length) * 100 : 0}%`
          }} />
        </div>
      </div>

      {/* 기도 목록 */}
      <div className={s.list}>
        {filtered.length === 0 && (
          <div className={s.empty}>이 카테고리에 기도 제목이 없어요</div>
        )}
        {filtered.map(p => (
          <div key={p.id} className={`${s.item} ${p.done ? s.done : ''}`} onClick={() => togglePrayer(p.id)}>
            <div className={s.circle}>
              {p.done && <svg width="12" height="12" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </div>
            <span className={s.itemText}>{p.text}</span>
            <span className={s.cat}>{p.cat}</span>
            <button className={s.del} onClick={(e) => deletePrayer(p.id, e)}>×</button>
          </div>
        ))}
      </div>
      <button className={s.addBtn} onClick={() => setShowModal(true)}>+ 기도 제목 추가</button>

      {/* 타이머 */}
      <div className={s.timer}>
        <div>
          <div className={s.timerLabel}>기도 시간</div>
          <div className={s.timerVal}>{mm}:{ss}</div>
        </div>
        <div className={s.timerBtns}>
          <button className={s.tbtn} onClick={resetTimer}>↺</button>
          <button className={`${s.tbtn} ${running ? s.running : ''}`} onClick={toggleTimer}>{running ? '⏸' : '▶'}</button>
        </div>
      </div>

      {/* 추가 모달 */}
      {showModal && (
        <div className={s.overlay} onClick={() => setShowModal(false)}>
          <div className={s.sheet} onClick={e => e.stopPropagation()}>
            <div className={s.sheetTitle}>기도 제목 추가</div>
            <input className={s.sheetInput} value={newText} onChange={e => setNewText(e.target.value)}
              placeholder="기도 제목을 입력하세요" onKeyDown={e => e.key === 'Enter' && addPrayer()} autoFocus />
            <div className={s.catRow}>
              {CATS.filter(c => c !== '전체').map(c => (
                <button key={c} className={`${s.catBtn} ${newCat === c ? s.catSel : ''}`} onClick={() => setNewCat(c)}>{c}</button>
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
