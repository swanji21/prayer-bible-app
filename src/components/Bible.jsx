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

const TOTAL_CHAPTERS = Object.values(BIBLE_BOOKS).flat().reduce((a, b) => a + b.chapters, 0)

export default function Bible() {
  const [readChapters, setReadChapters] = useState({})
  const [noteMap, setNoteMap] = useState({})
  const [activeSection, setActiveSection] = useState('구약')
  const [expandedBook, setExpandedBook] = useState(null)
  const [loading, setLoading] = useState(true)

  const todayKey = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'bible', 'progress'), d => {
      if (d.exists()) {
        setReadChapters(d.data().readChapters || {})
        setNoteMap(d.data().noteMap || {})
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const saveToFirebase = async (newRead, newNotes) => {
    await setDoc(doc(db, 'bible', 'progress'), {
      readChapters: newRead,
      noteMap: newNotes
    })
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

  const totalRead = Object.values(readChapters).reduce((a, b) => a + b.length, 0)
  const pct = Math.min(100, Math.round((totalRead / TOTAL_CHAPTERS) * 100))

  const books = BIBLE_BOOKS[activeSection]
  const sectionTotal = books.reduce((a, b) => a + b.chapters, 0)
  const sectionRead = books.reduce((a, b) => a + (readChapters[b.name] || []).length, 0)
  const sectionPct = Math.round((sectionRead / sectionTotal) * 100)

  if (loading) return <div className={s.loading}>불러오는 중...</div>

  return (
    <div className={s.wrap}>
      <div className={s.planHeader}>
        <div className={s.planTitle}>전체 성경 통독 — 1,189장</div>
        <div className={s.progBg}><div className={s.progFill} style={{ width: pct + '%' }} /></div>
        <div className={s.planInfo}>
          <span>{totalRead} / {TOTAL_CHAPTERS}장 읽음</span>
          <span>{pct}% 완료</span>
        </div>
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
        <span className={s.secProgressTxt}>{activeSection} {sectionRead}/{sectionTotal}장</span>
        <div className={s.progBg} style={{flex:1}}><div className={s.progFill} style={{width: sectionPct + '%'}} /></div>
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
    </div>
  )
}