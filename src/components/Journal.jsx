import { useState } from 'react'
import { useLocalStorage } from '../useLocalStorage'
import s from './Journal.module.css'

export default function Journal() {
  const [journals, setJournals] = useLocalStorage('pb_journals', [
    { id: 1, date: '2025.05.01', ref: '시편 23:1', text: '여호와는 나의 목자시니 내게 부족함이 없으리로다. 오늘 이 말씀이 마음에 깊이 와닿았습니다.' },
    { id: 2, date: '2025.04.30', ref: '빌립보서 4:13', text: '모든 것을 하실 수 있느니라는 말씀을 붙잡고 하루를 시작했습니다.' },
  ])
  const [nextJid, setNextJid] = useLocalStorage('pb_journal_nextid', 3)
  const [ref, setRef] = useState('')
  const [text, setText] = useState('')

  const save = () => {
    if (!text.trim()) return
    const d = new Date()
    const date = `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`
    setJournals([...journals, { id: nextJid, date, ref: ref.trim() || '말씀 묵상', text: text.trim() }])
    setNextJid(nextJid + 1)
    setRef('')
    setText('')
  }

  const deleteJournal = (id) => {
    setJournals(journals.filter(j => j.id !== id))
  }

  const sorted = [...journals].reverse()

  return (
    <div className={s.wrap}>
      <div className={s.compose}>
        <input
          className={s.refInput}
          value={ref}
          onChange={e => setRef(e.target.value)}
          placeholder="성경 구절 (예: 시편 23:1)"
        />
        <textarea
          className={s.textArea}
          rows={4}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="오늘의 묵상을 기록하세요..."
        />
        <button className={s.saveBtn} onClick={save}>묵상 저장</button>
      </div>

      {sorted.length === 0 && (
        <div className={s.empty}>아직 묵상 기록이 없어요. 첫 번째 묵상을 남겨보세요 ✍</div>
      )}

      {sorted.map(j => (
        <div key={j.id} className={s.card}>
          <div className={s.cardTop}>
            <span className={s.cardDate}>{j.date}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className={s.cardRef}>{j.ref}</span>
              <button className={s.delBtn} onClick={() => deleteJournal(j.id)}>×</button>
            </div>
          </div>
          <p className={s.cardText}>{j.text}</p>
        </div>
      ))}
    </div>
  )
}
