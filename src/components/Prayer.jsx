import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore'
import s from './Prayer.module.css'

const CATS = ['전체', '가족', '직장', '교회', '전도', '감사', '치유', '기타']

const VERSES = [
  { text: '아무것도 염려하지 말고 오직 모든 일에 기도와 간구로 너희 구할 것을 감사함으로 하나님께 아뢰라', ref: '빌립보서 4:6' },
  { text: '너는 내게 부르짖으라 내가 네게 응답하겠고 크고 은밀한 일을 네게 보이리라', ref: '예레미야 33:3' },
  { text: '구하라 그리하면 너희에게 주실 것이요 찾으라 그리하면 찾아낼 것이요', ref: '마태복음 7:7' },
]

function fmt(sec) {
  return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0')
}

export default function Prayer() {
  const [prayers, setPrayers] = useState([])
  const [activeCat, setActiveCat] = useState('전체')
  const [showModal, setShowModal] = useState(false)
  const [newText, setNewText] = useState('')
  const [newCat, setNewCat] = useState('가족')
  const [totalSaved, setTotalSaved] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [completed, setCompleted] = useState(false)
  const intervalRef = { current: null }

  useEffect(() => {
    getDoc(doc(db, 'stats', 'timer')).then(d => {
      if (d.exists()) setTotalSaved(d.data().total || 0)
    })
  }, [])

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'prayers'), snap => {
      setPrayers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [])

  useEffect(() => {
    return () => clearInterval(intervalRef.current)
  }, [])

  const start = () => {
    setCompleted(false)
    intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    setIsRunning(true)
  }

  const stop = () => { clearInterval(intervalRef.current); setIsRunning(false) }

  const toggle = () => { if (isRunning) { stop() } else { start() } }

  const reset = () => { stop(); setElapsed(0); setCompleted(false) }

  const complete = async () => {
    stop()
    const newTotal = totalSaved + elapsed
    setTotalSaved(newTotal)
    await setDoc(doc(db, 'stats', 'timer'), { total: newTotal })
    setElapsed(0)
    setCompleted(true)
  }

  const togglePrayer = async (id, done) => {
    await updateDoc(doc(db, 'prayers', id), { done: !done })
  }

  const deletePrayer = async (id, e) => {
    e.stopPropagation()
    await deleteDoc(doc(db, 'prayers', id))
  }

  const addPrayer = async () => {
    if (!newText.trim()) return
    await addDoc(collection(db, 'prayers'), { text: newText.trim(), cat: newCat, done: false })
    setNewText(''); setNewCat('가족'); setShowModal(false)
  }

  const verse = VERSES[new Date().getDate() % VERSES.length]
  const filtered = activeCat === '전체' ? prayers : prayers.filter(p => p.cat === activeCat)
  const doneCount = prayers.filter(p => p.done).length
  const filteredDone = filtered.filter(p => p.done).length
  const progPct = filtered.length ? (filteredDone / filtered.length) * 100 : 0

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
          <div key={p.id} className={s.item + (p.done ? ' ' + s.done : '')} onClick={() => togglePrayer(p.id, p.done)}>
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
        {completed && <div className={s.timerDone}>🙏 기도 완료! 오늘도 수고하셨어요</div>}
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