import { useState, useEffect } from 'react'
import { db } from '../firebase'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import s from './Bible.module.css'

const BIBLE_BOOKS = {
  '구약': [
    { name: '창세기', chapters: 50 }, { name: '출애굽기', chapters: 40 }, { name: '레위기', chapters: 27 },
    { name: '민수기', chapters: 36 }, { name: '신명기', chapters: 34 }, { name: '여호수아', chapters: 24 },
    { name: '사사기', chapters: 21 }, { name: '룻기', chapters: 4 }, { name: '사무엘상', chapters: 31 },
    { name: '사무엘하', chapters: 24 }, { name: '열왕기상', chapters: 22 }, { name: '열왕기하', chapters: 25 },
    { name: '역대상', chapters: 29 }, { name: '역대하', chapters: 36 }, { name: '에스라', chapters: 10 },
    { name: '느헤미야', chapters: 13 }, { name: '에스더', chapters: 10 }, { name: '욥기', chapters: 42 },
    { name: '시편', chapters: 150 }, { name: '잠언', chapters: 31 }, { name: '전도서', chapters: 12 },
    { name: '아가', chapters: 8 }, { name: '이사야', chapters: 66 }, { name: '예레미야', chapters: 52 },
    { name: '예레미야애가', chapters: 5 }, { name: '에스겔', chapters: 48 }, { name: '다니엘', chapters: 12 },
    { name: '호세아', chapters: 14 }, { name: '요엘', chapters: 3 }, { name: '아모스', chapters: 9 },
    { name: '오바댜', chapters: 1 }, { name: '요나', chapters: 4 }, { name: '미가', chapters: 7 },
    { name: '나훔', chapters: 3 }, { name: '하박국', chapters: 3 }, { name: '스바냐', chapters: 3 },
    { name: '학개', chapters: 2 }, { name: '스가랴', chapters: 14 }, { name: '말라기', chapters: 4 },
  ],
  '신약': [
    { name: '마태복음', chapters: 28 }, { name: '마가복음', chapters: 16 }, { name: '누가복음', chapters: 24 },
    { name: '요한복음', chapters: 21 }, { name: '사도행전', chapters: 28 }, { name: '로마서', chapters: 16 },
    { name: '고린도전서', chapters: 16 }, { name: '고린도후서', chapters: 13 }, { name: '갈라디아서', chapters: 6 },
    { name: '에베소서', chapters: 6 }, { name: '빌립보서', chapters: 4 }, { name: '골로새서', chapters: 4 },
    { name: '데살로니가전서', chapters: 5 }, { name: '데살로니가후서', chapters: 3 }, { name: '디모데전서', chapters: 6 },
    { name: '디모데후서', chapters: 4 }, { name: '디도서', chapters: 3 }, { name: '빌레몬서', chapters: 1 },
    { name: '히브리서', chapters: 13 }, { name: '야고보서', chapters: 5 }, { name: '베드로전서', chapters: 5 },
    { name: '베드로후서', chapters: 3 }, { name: '요한일서', chapters: 5 }, { name: '요한이서', chapters: 1 },
    { name: '요한삼서', chapters: 1 }, { name: '유다서', chapters: 1 }, { name: '요한계시록', chapters: 22 },
  ]
}

const ALL_BOOKS = [...BIBLE_BOOKS['구약'], ...BIBLE_BOOKS['신약']]
const TOTAL_CHAPTERS = ALL_BOOKS.reduce((a, b) => a + b.chapters, 0)

export default function Bible() {
  const [readChapters, setReadChapters] = useState({})
  const [noteMap, setNoteMap] = useState({})
  const [activeSection, setActiveSection] = useState('구약')
  const [expandedBook, setExpandedBook] = useState(null)
  const [loading, setLoading] = useState(true)
  const [plans, setPlans] = useState({})
  const [activePlan, setActivePlan] = useState('전체')
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [newPlanName, setNewPlanName] = useState('')
  const [selectedBooks, setSelectedBooks] = useState([])

  const todayKey = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'bible', 'progress'), d => {
      if (d.exists()) {
        const data = d.data()
        setReadChapters(data.readChapters || {})
        setNoteMap(data.noteMap || {})
        setPlans(data.plans || {})
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const saveToFirebase = async (newRead, newNotes, newPlans = plans) => {
    await setDoc(doc(db, 'bible', 'progress'), {
      readChapters: newRead,
      noteMap: newNotes,
      plans: newPlans
    })
  }

  const getPlanBooks = (planId) => {
    if (planId === '전체') return ALL_BOOKS
    if (plans[planId]) {
      return ALL_BOOKS.filter(b => {
        const planBooks = plans[planId].books || []
        return planBooks.includes(b.name)
      })
    }
    return []
  }

  const toggleChapter = async (bookName, chNum) => {
    const prev = readChapters[bookName] || []
    const next = prev.includes(chNum) ? prev.filter(c => c !== chNum) : [...prev, chNum].sort((a,b)=>a-b)
    const newRead = { ...readChapters, [bookName]: next }
    setReadChapters(newRead)
    await saveToFirebase(newRead, noteMap)
  }

  const markBookAll = async (bookName, chapters) => {
    const all = Array.from({ length: chapters }, (_, i) => i + 1)
    const current = readChapters[bookName] || []
    const allDone = current.length >= chapters
    const newRead = { ...readChapters, [bookName]: allDone ? [] : all }
    setReadChapters(newRead)
    await saveToFirebase(newRead, noteMap)
  }

  const updateNote = async (val) => {
    const newNotes = { ...noteMap, [todayKey]: val }
    setNoteMap(newNotes)
    await saveToFirebase(readChapters, newNotes)
  }

  const addPlan = async () => {
    if (!newPlanName.trim() || selectedBooks.length === 0) {
      alert('계획명과 성경책을 선택해주세요')
      return
    }
    const planId = Date.now().toString()
    const newPlans = {
      ...plans,
      [planId]: { name: newPlanName, books: selectedBooks, createdAt: new Date().toISOString() }
    }
    setPlans(newPlans)
    await saveToFirebase(readChapters, noteMap, newPlans)
    setNewPlanName('')
    setSelectedBooks([])
    setShowPlanModal(false)
    setActivePlan(planId)
  }

  const deletePlan = async (planId) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      const newPlans = { ...plans }
      delete newPlans[planId]
      setPlans(newPlans)
      await saveToFirebase(readChapters, noteMap, newPlans)
      setActivePlan('전체')
    }
  }

  const currentBooks = getPlanBooks(activePlan)
  const planTotal = currentBooks.reduce((a, b) => a + b.chapters, 0)
  const planRead = currentBooks.reduce((a, b) => a + (readChapters[b.name] || []).length, 0)
  const planPct = planTotal > 0 ? Math.round((planRead / planTotal) * 100) : 0

  const totalRead = Object.values(readChapters).reduce((a, b) => a + b.length, 0)
  const totalPct = Math.min(100, Math.round((totalRead / TOTAL_CHAPTERS) * 100))

  const books = currentBooks.filter(b => BIBLE_BOOKS[activeSection]?.some(sb => sb.name === b.name))

  if (loading) return <div className={s.loading}>불러오는 중...</div>

  return (
    <div className={s.wrap}>
      <div className={s.planHeader}>
        <div className={s.planTitle}>
          {activePlan === '전체' ? '전체 성경 통독 — 1,189장' : plans[activePlan]?.name || '계획'}
        </div>
        <div className={s.progBg}>
          <div className={s.progFill} style={{ width: (activePlan === '전체' ? totalPct : planPct) + '%' }} />
        </div>
        <div className={s.planInfo}>
          <span>{activePlan === '전체' ? totalRead : planRead} / {activePlan === '전체' ? TOTAL_CHAPTERS : planTotal}장 읽음</span>
          <span>{activePlan === '전체' ? totalPct : planPct}% 완료</span>
        </div>
      </div>

      <div className={s.planTabs}>
        <button className={activePlan === '전체' ? s.planTabActive : s.planTab} onClick={() => setActivePlan('전체')}>전체</button>
        {Object.entries(plans).map(([id, plan]) => (
          <div key={id} style={{ position: 'relative' }}>
            <button className={activePlan === id ? s.planTabActive : s.planTab} onClick={() => setActivePlan(id)} style={{ paddingRight: '24px' }}>
              {plan.name}
            </button>
            <button onClick={() => deletePlan(id)} style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', width: '20px', height: '20px', border: 'none', background: 'transparent', color: 'var(--text2)', cursor: 'pointer', fontSize: '14px' }} title="삭제">✕</button>
          </div>
        ))}
        <button className={s.planTab} onClick={() => setShowPlanModal(true)} style={{ fontSize: '18px', lineHeight: '1', padding: '8px 10px' }} title="계획 추가">+</button>
      </div>

      <div className={s.sectionTabs}>
        {Object.keys(BIBLE_BOOKS).map(sec => {
          const bs = BIBLE_BOOKS[sec]
          const tot = bs.reduce((a,b)=>a+b.chapters,0)
          const rd = bs.reduce((a,b)=>a+(readChapters[b.name]||[]).length,0)
          return (
            <button key={sec} className={s.secTab + (activeSection===sec ? ' ' + s.secActive : '')} onClick={() => setActiveSection(sec)}>
              {sec}
              <span className={s.secPct}>{Math.round((rd/tot)*100)}%</span>
            </button>
          )
        })}
      </div>

      <div className={s.secProgress}>
        <span className={s.secProgressTxt}>
          {activeSection} {books.reduce((a,b)=>a+(readChapters[b.name]||[]).length,0)}/{books.reduce((a,b)=>a+b.chapters,0)}장
        </span>
        <div className={s.progBg} style={{flex:1}}>
          <div className={s.progFill} style={{width: books.length > 0 ? Math.round((books.reduce((a,b)=>a+(readChapters[b.name]||[]).length,0) / books.reduce((a,b)=>a+b.chapters,0)) * 100) + '%' : '0%'}} />
        </div>
      </div>

      <div className={s.bookList}>
        {books.map(({ name, chapters }) => {
          const readList = readChapters[name] || []
          const done = readList.length >= chapters
          const partial = readList.length > 0 && !done
          const isExpanded = expandedBook === name

          return (
            <div key={name} className={s.bookItem}>
              <div className={s.bookRow + (done ? ' ' + s.bookDone : partial ? ' ' + s.bookPartial : '')}>
                <div className={s.bookDot} />
                <span className={s.bookName} onClick={() => setExpandedBook(isExpanded ? null : name)}>{name}</span>
                <span className={s.bookProgress}>{readList.length}/{chapters}</span>
                <button className={s.bookAllBtn} onClick={() => markBookAll(name, chapters)}>
                  {done ? '초기화' : '완독'}
                </button>
                <button className={s.bookExpandBtn} onClick={() => setExpandedBook(isExpanded ? null : name)}>
                  {isExpanded ? '▲' : '▼'}
                </button>
              </div>

              {isExpanded && (
                <div className={s.chapterGrid}>
                  {Array.from({ length: chapters }, (_, i) => i + 1).map(ch => (
                    <button key={ch} className={s.chBtn + (readList.includes(ch) ? ' ' + s.chDone : '')}
                      onClick={() => toggleChapter(name, ch)}>
                      {ch}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className={s.noteBox}>
        <div className={s.noteLabel}>오늘의 말씀 메모</div>
        <textarea className={s.noteArea} rows={3}
          value={noteMap[todayKey] || ''}
          onChange={e => updateNote(e.target.value)}
          placeholder="오늘 읽은 말씀 중 기억할 구절을 적어보세요..." />
      </div>

      {showPlanModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg)', borderRadius: '12px', padding: '20px', maxWidth: '500px', maxHeight: '80vh', overflow: 'auto', width: '90%' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--text)' }}>통독 계획 추가</h3>
            <input type="text" placeholder="계획명 (예: 1년 통독)" value={newPlanName} onChange={e => setNewPlanName(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '16px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: '14px', boxSizing: 'border-box' }} />
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '10px' }}>성경책 선택 ({selectedBooks.length}권)</div>
              <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px', background: 'var(--bg2)' }}>
                {ALL_BOOKS.map(book => (
                  <label key={book.name} style={{ display: 'flex', alignItems: 'center', padding: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text)' }}>
                    <input type="checkbox" checked={selectedBooks.includes(book.name)} onChange={e => { if (e.target.checked) { setSelectedBooks([...selectedBooks, book.name]) } else { setSelectedBooks(selectedBooks.filter(b => b !== book.name)) } }} style={{ marginRight: '8px', cursor: 'pointer' }} />
                    {book.name}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={addPlan} style={{ flex: 1, padding: '10px', background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>추가</button>
              <button onClick={() => setShowPlanModal(false)} style={{ flex: 1, padding: '10px', background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
