import React, { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import s from './Journal.module.css'

function SecItem({ label, val, s }) {
  const [expanded, setExpanded] = React.useState(false)
  const isLong = val && val.length > 150
  return (
    <div className={s.secItem}>
      <div className={s.secLabel}>{label}</div>
      <div className={s.secTextWrap}>
        {isLong && !expanded
          ? <p className={s.secTextClamped}>{val}</p>
          : <p className={s.secTextFull}>{val}</p>
        }
        {isLong && (
          <button className={s.moreBtn} onClick={() => setExpanded(e => !e)}>
            {expanded ? '접기 ▲' : '더보기 ▼'}
          </button>
        )}
      </div>
    </div>
  )
}

const SEC_LABELS = ['본문 말씀', '관주', '오늘의 묵상', '나눔과 실천', '기도']
const SEC_KEYS = ['scripture', 'crossref', 'meditation', 'sharing', 'prayer']
const PLACEHOLDERS = [
  '오늘 읽은 말씀 구절을 적어보세요...',
  '참고 구절을 적어보세요 (예: 요 3:16, 롬 8:28)',
  '말씀을 통해 느낀 점을 적어보세요...',
  '오늘 삶에서 나누고 실천할 것을 적어보세요...',
  '오늘의 기도 제목을 적어보세요...',
]
const ROWS = [2, 2, 3, 3, 3]

const emptyForm = { ref: '', scripture: '', crossref: '', meditation: '', sharing: '', prayer: '' }

export default function Journal() {
  const [journals, setJournals] = useState([])
  const today = new Date()
  const todayVal = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0')
  const [selectedDate, setSelectedDate] = useState(todayVal)
  const [form, setForm] = useState(emptyForm)
  const [expandedId, setExpandedId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [editDate, setEditDate] = useState('')
  const [monthOpen, setMonthOpen] = useState({})

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'journals'), snap => {
      setJournals(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [])

  const updateForm = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const updateEditForm = (key, val) => setEditForm(f => ({ ...f, [key]: val }))

  const save = async () => {
    const has = Object.values(form).some(v => v.trim())
    if (!has) return
    const parts = selectedDate.split('-')
    const date = parts[0] + '.' + parts[1] + '.' + parts[2]
    await addDoc(collection(db, 'journals'), { date, ...form })
    setForm(emptyForm)
  }

  const deleteJournal = async (id) => {
    await deleteDoc(doc(db, 'journals', id))
  }

  const startEdit = (j) => {
    setEditingId(j.id)
    setEditForm({
      ref: j.ref || '',
      scripture: j.scripture || '',
      crossref: j.crossref || '',
      meditation: j.meditation || '',
      sharing: j.sharing || '',
      prayer: j.prayer || '',
    })
    const parts = j.date.split('.')
    setEditDate(parts[0] + '-' + parts[1] + '-' + parts[2])
    setExpandedId(null)
  }

  const saveEdit = async () => {
    const parts = editDate.split('-')
    const date = parts[0] + '.' + parts[1] + '.' + parts[2]
    await updateDoc(doc(db, 'journals', editingId), { date, ...editForm })
    setEditingId(null)
  }

  const sorted = [...journals].sort((a, b) => b.date.localeCompare(a.date))

  const monthGroups = []
  sorted.forEach(j => {
    const key = (j.date || '').slice(0, 7)
    let g = monthGroups.find(x => x.key === key)
    if (!g) { g = { key, items: [] }; monthGroups.push(g) }
    g.items.push(j)
  })

  const monthLabel = (key) => {
    const parts = key.split('.')
    if (parts.length < 2) return key
    return parts[0] + '년 ' + parseInt(parts[1], 10) + '월'
  }

  const buildJournalText = (j) => {
    let t = '📖 묵상 — ' + j.date + '\n'
    if (j.ref) t += '본문: ' + j.ref + '\n'
    t += '\n'
    SEC_LABELS.forEach((label, i) => {
      const val = j[SEC_KEYS[i]]
      if (val) t += '[' + label + ']\n' + val + '\n\n'
    })
    return t.trim()
  }

  const shareJournal = async (j) => {
    const text = buildJournalText(j)
    try {
      if (navigator.share) {
        await navigator.share({ title: '묵상 ' + j.date, text })
      } else {
        await navigator.clipboard.writeText(text)
        alert('클립보드에 복사되었습니다')
      }
    } catch (e) { /* 사용자가 공유 취소 */ }
  }

  const printJournal = (j) => {
    const w = window.open('', '_blank')
    if (!w) { alert('팝업이 차단되어 있어요. 팝업을 허용해주세요.'); return }
    const body = SEC_LABELS.map((label, i) => {
      const val = j[SEC_KEYS[i]]
      return val ? '<h2>' + label + '</h2><p>' + val.replace(/</g, '&lt;').replace(/\n/g, '<br>') + '</p>' : ''
    }).join('')
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>묵상 ' + j.date + '</title>' +
      '<style>body{font-family:-apple-system,"Apple SD Gothic Neo",sans-serif;padding:28px;color:#222;max-width:700px;margin:0 auto}' +
      'h1{font-size:20px;border-bottom:2px solid #001f3f;padding-bottom:8px}' +
      'h2{font-size:15px;color:#001f3f;margin:18px 0 4px;border-left:3px solid #d4a55a;padding-left:8px}' +
      'p{margin:4px 0;font-size:14px;line-height:1.7}' +
      '.meta{color:#777;font-size:13px;margin-bottom:8px}</style></head><body>' +
      '<h1>📖 묵상</h1>' +
      '<p class="meta">' + j.date + (j.ref ? ' · 본문: ' + j.ref : '') + '</p>' +
      body + '</body></html>')
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 300)
  }

  return (
    <div className={s.wrap}>
      {/* 작성 폼 */}
      <div className={s.compose}>
        <div className={s.dateRow}>
          <label className={s.dateLabel}>날짜</label>
          <input type="date" className={s.dateInput} value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
        </div>
        <input className={s.refInput} value={form.ref} onChange={e => updateForm('ref', e.target.value)} placeholder="성경 구절 (예: 시편 23:1)" />
        {SEC_LABELS.map((label, i) => (
          <div key={label} className={s.sectionBlock}>
            <div className={s.sectionTag}>{label}</div>
            <textarea className={s.sectionArea} rows={ROWS[i]} value={form[SEC_KEYS[i]]} onChange={e => updateForm(SEC_KEYS[i], e.target.value)} placeholder={PLACEHOLDERS[i]} />
          </div>
        ))}
        <button className={s.saveBtn} onClick={save}>묵상 저장</button>
      </div>

      {journals.length === 0 && <div className={s.empty}>아직 묵상 기록이 없어요</div>}

      {monthGroups.map((g, gi) => {
        const isMonthOpen = monthOpen[g.key] !== undefined ? monthOpen[g.key] : gi === 0
        return (
          <div key={g.key}>
            <button
              onClick={() => setMonthOpen(m => ({ ...m, [g.key]: !isMonthOpen }))}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', margin: '14px 0 8px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', color: 'var(--text)' }}>
              <span>📅 {monthLabel(g.key)}</span>
              <span style={{ fontSize: '12px', fontWeight: '400', color: 'var(--text2)' }}>{g.items.length}건 {isMonthOpen ? '▲' : '▼'}</span>
            </button>
            {isMonthOpen && g.items.map(j => {
        const isOpen = expandedId === j.id
        const isEditing = editingId === j.id

        if (isEditing) {
          return (
            <div key={j.id} className={s.card}>
              <div className={s.editHeader}>
                <div className={s.dateRow}>
                  <label className={s.dateLabel}>날짜</label>
                  <input type="date" className={s.dateInput} value={editDate} onChange={e => setEditDate(e.target.value)} />
                </div>
              </div>
              <div className={s.editBody}>
                <input className={s.refInput} value={editForm.ref} onChange={e => updateEditForm('ref', e.target.value)} placeholder="성경 구절" />
                {SEC_LABELS.map((label, i) => (
                  <div key={label} className={s.sectionBlock}>
                    <div className={s.sectionTag}>{label}</div>
                    <textarea className={s.sectionArea} rows={ROWS[i]} value={editForm[SEC_KEYS[i]]} onChange={e => updateEditForm(SEC_KEYS[i], e.target.value)} placeholder={PLACEHOLDERS[i]} />
                  </div>
                ))}
                <div className={s.editBtns}>
                  <button className={s.cancelEditBtn} onClick={() => setEditingId(null)}>취소</button>
                  <button className={s.saveEditBtn} onClick={saveEdit}>저장</button>
                </div>
              </div>
            </div>
          )
        }

        return (
          <div key={j.id} className={s.card}>
            <div className={s.cardTop} onClick={() => setExpandedId(isOpen ? null : j.id)}>
              <div>
                <span className={s.cardDate}>{j.date}</span>
                {j.ref && <span className={s.cardRef}>{j.ref}</span>}
              </div>
              <div className={s.cardRight}>
                <button className={s.editBtn} onClick={e => { e.stopPropagation(); shareJournal(j) }} title="공유">📤</button>
                <button className={s.editBtn} onClick={e => { e.stopPropagation(); printJournal(j) }} title="프린트">🖨</button>
                <button className={s.editBtn} onClick={e => { e.stopPropagation(); startEdit(j) }}>✏</button>
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
                    <SecItem key={label} label={label} val={val} s={s} />
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
          </div>
        )
      })}
    </div>
  )
}