import { useState } from 'react'
import { useLocalStorage } from '../useLocalStorage'
import s from './Journal.module.css'

const SEC_LABELS = ['본문 말씀', '오늘의 묵상', '나눔과 실천', '기도']
const SEC_KEYS = ['scripture', 'meditation', 'sharing', 'prayer']

export default function Journal() {
  const [journals, setJournals] = useLocalStorage('pb_journals', [])
  const [nextJid, setNextJid] = useLocalStorage('pb_journal_nextid', 1)
  const today = new Date()
  const todayVal = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0')
  const [selectedDate, setSelectedDate] = useState(todayVal)
  const [ref, setRef] = useState('')
  const [scripture, setScripture] = useState('')
  const [meditation, setMeditation] = useState('')
  const [sharing, setSharing] = useState('')
  const [prayer, setPrayer] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const save = () => {
    const has = ref || scripture || meditation || sharing || prayer
    if (!has) return
    const parts = selectedDate.split('-')
    const date = parts[0] + '.' + parts[1] + '.' + parts[2]
    setJournals([...journals, { id: nextJid, date, ref, scripture, meditation, sharing, prayer }])
    setNextJid(nextJid + 1)
    setRef(''); setScripture(''); setMeditation(''); setSharing(''); setPrayer('')
  }

  const deleteJournal = (id) => setJournals(journals.filter(j => j.id !== id))
  const sorted = [...journals].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className={s.wrap}>
      <div className={s.compose}>
        <div className={s.dateRow}>
          <label className={s.dateLabel}>날짜</label>
          <input type="date" className={s.dateInput} value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
        </div>
        <input className={s.refInput} value={ref} onChange={e => setRef(e.target.value)} placeholder="성경 구절 (예: 시편 23:1)" />
        <div className={s.sectionBlock}>
          <div className={s.sectionTag}>본문 말씀</div>
          <textarea className={s.sectionArea} rows={2} value={scripture} onChange={e => setScripture(e.target.value)} placeholder="오늘 읽은 말씀 구절을 적어보세요..." />
        </div>
        <div className={s.sectionBlock}>
          <div className={s.sectionTag}>오늘의 묵상</div>
          <textarea className={s.sectionArea} rows={3} value={meditation} onChange={e => setMeditation(e.target.value)} placeholder="말씀을 통해 느낀 점을 적어보세요..." />
        </div>
        <div className={s.sectionBlock}>
          <div className={s.sectionTag}>나눔과 실천</div>
          <textarea className={s.sectionArea} rows={3} value={sharing} onChange={e => setSharing(e.target.value)} placeholder="오늘 삶에서 나누고 실천할 것을 적어보세요..." />
        </div>
        <div className={s.sectionBlock}>
          <div className={s.sectionTag}>기도</div>
          <textarea className={s.sectionArea} rows={3} value={prayer} onChange={e => setPrayer(e.target.value)} placeholder="오늘의 기도 제목을 적어보세요..." />
        </div>
        <button className={s.saveBtn} onClick={save}>묵상 저장</button>
      </div>

      {journals.length === 0 && <div className={s.empty}>아직 묵상 기록이 없어요</div>}

      {sorted.map(j => {
        const isOpen = expandedId === j.id
        return (
          <div key={j.id} className={s.card}>
            <div className={s.cardTop} onClick={() => setExpandedId(isOpen ? null : j.id)}>
              <div>
                <span className={s.cardDate}>{j.date}</span>
                {j.ref && <span className={s.cardRef}>{j.ref}</span>}
              </div>
              <div className={s.cardRight}>
                <button className={s.delBtn} onClick={e => { e.stopPropagation(); deleteJournal(j.id) }}>x</button>
                <span className={s.expandIcon}>{isOpen ? 'A' : 'V'}</span>
              </div>
            </div>
            {!isOpen && <p className={s.preview}>{j.meditation || j.scripture || ''}</p>}
            {isOpen && (
              <div className={s.sections}>
                {SEC_LABELS.map((label, i) => {
                  const val = j[SEC_KEYS[i]]
                  if (!val) return null
                  return (
                    <div key={label} className={s.secItem}>
                      <div className={s.secLabel}>{label}</div>
                      <p className={s.secText}>{val}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}