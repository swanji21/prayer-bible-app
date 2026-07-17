import React, { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import s from './FamilyWorship.module.css'

const SECTIONS = [
  { key: 'opening', label: '입례송', placeholder: '입례송 찬송가 번호 또는 제목을 적어보세요...' },
  { key: 'prayer1', label: '기도', placeholder: '기도 내용을 적어보세요...' },
  { key: 'hymn1', label: '가정찬송', placeholder: '찬송가 번호 또는 제목을 적어보세요...' },
  { key: 'word', label: '말씀', placeholder: '오늘 읽은 말씀 본문을 적어보세요...' },
  { key: 'meditation', label: '묵상', placeholder: '말씀을 통해 묵상한 내용을 적어보세요...' },
  { key: 'sharing', label: '말씀나눔', placeholder: '가족과 나눈 말씀 내용을 적어보세요...' },
  { key: 'hymn2', label: '찬송', placeholder: '찬송가 번호 또는 제목을 적어보세요...' },
  { key: 'prayer2', label: '기도', placeholder: '기도 내용을 적어보세요...' },
  { key: 'intercession', label: '도고기도', placeholder: '도고기도 내용을 적어보세요...' },
  { key: 'thanksgiving', label: '감사고백', placeholder: '오늘 감사한 것들을 적어보세요...' },
]

const emptyForm = Object.fromEntries([['ref', ''], ...SECTIONS.map(s => [s.key, ''])])

function SecItem({ label, val, s: css }) {
  const [expanded, setExpanded] = React.useState(false)
  const isLong = val && val.length > 150
  return (
    <div className={css.secItem}>
      <div className={css.secLabel}>{label}</div>
      <div className={css.secTextWrap}>
        {isLong && !expanded
          ? <p className={css.secTextClamped}>{val}</p>
          : <p className={css.secTextFull}>{val}</p>
        }
        {isLong && (
          <button className={css.moreBtn} onClick={() => setExpanded(e => !e)}>
            {expanded ? '접기 ▲' : '더보기 ▼'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function FamilyWorship() {
  const [records, setRecords] = useState([])
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
    const unsub = onSnapshot(collection(db, 'familyworship'), snap => {
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })))
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
    await addDoc(collection(db, 'familyworship'), { date, ...form })
    setForm(emptyForm)
  }

  const deleteRecord = async (id) => {
    await deleteDoc(doc(db, 'familyworship', id))
  }

  const startEdit = (r) => {
    setEditingId(r.id)
    setEditForm(Object.fromEntries([['ref', r.ref || ''], ...SECTIONS.map(sec => [sec.key, r[sec.key] || ''])]))
    const parts = r.date.split('.')
    setEditDate(parts[0] + '-' + parts[1] + '-' + parts[2])
    setExpandedId(null)
  }

  const saveEdit = async () => {
    const parts = editDate.split('-')
    const date = parts[0] + '.' + parts[1] + '.' + parts[2]
    await updateDoc(doc(db, 'familyworship', editingId), { date, ...editForm })
    setEditingId(null)
  }

  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date))

  const monthGroups = []
  sorted.forEach(r => {
    const key = (r.date || '').slice(0, 7)
    let g = monthGroups.find(x => x.key === key)
    if (!g) { g = { key, items: [] }; monthGroups.push(g) }
    g.items.push(r)
  })

  const monthLabel = (key) => {
    const parts = key.split('.')
    if (parts.length < 2) return key
    return parts[0] + '년 ' + parseInt(parts[1], 10) + '월'
  }

  const buildWorshipText = (r) => {
    let t = '🏠 가정예배 — ' + r.date + '\n'
    if (r.ref) t += '본문: ' + r.ref + '\n'
    t += '\n'
    SECTIONS.forEach(sec => {
      if (r[sec.key]) t += '[' + sec.label + ']\n' + r[sec.key] + '\n\n'
    })
    return t.trim()
  }

  const shareRecord = async (r) => {
    const text = buildWorshipText(r)
    try {
      if (navigator.share) {
        await navigator.share({ title: '가정예배 ' + r.date, text })
      } else {
        await navigator.clipboard.writeText(text)
        alert('클립보드에 복사되었습니다')
      }
    } catch (e) { /* 사용자가 공유 취소 */ }
  }

  const printRecord = (r) => {
    const w = window.open('', '_blank')
    if (!w) { alert('팝업이 차단되어 있어요. 팝업을 허용해주세요.'); return }
    const body = SECTIONS.map(sec => {
      const val = r[sec.key]
      const content = val
        ? val.replace(/</g, '&lt;').replace(/\n/g, '<br>')
        : '<span class="empty">—</span>'
      return '<h2>' + sec.label + '</h2><p>' + content + '</p>'
    }).join('')
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>가정예배 ' + r.date + '</title>' +
      '<style>body{font-family:-apple-system,"Apple SD Gothic Neo",sans-serif;padding:28px;color:#222;max-width:700px;margin:0 auto}' +
      'h1{font-size:20px;border-bottom:2px solid #001f3f;padding-bottom:8px}' +
      'h2{font-size:15px;color:#001f3f;margin:18px 0 4px;border-left:3px solid #d4a55a;padding-left:8px}' +
      'p{margin:4px 0;font-size:14px;line-height:1.7}' +
      '.meta{color:#777;font-size:13px;margin-bottom:8px}' +
      '.empty{color:#bbb}</style></head><body>' +
      '<h1>🏠 가정예배</h1>' +
      '<p class="meta">' + r.date + (r.ref ? ' · 본문: ' + r.ref : '') + '</p>' +
      body + '</body></html>')
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 300)
  }

  return (
    <div className={s.wrap}>
      <div className={s.compose}>
        <div className={s.composeHeader}>
          <div className={s.dateRow}>
            <label className={s.dateLabel}>날짜</label>
            <input type="date" className={s.dateInput} value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
          </div>
          <input className={s.refInput} value={form.ref} onChange={e => updateForm('ref', e.target.value)} placeholder="본문 말씀 (예: 느헤미야 3:1-5)" />
        </div>
        {SECTIONS.map(sec => (
          <div key={sec.key} className={s.sectionBlock}>
            <div className={s.sectionTag}>{sec.label}</div>
            <textarea className={s.sectionArea} rows={sec.key === 'word' || sec.key === 'meditation' || sec.key === 'sharing' ? 3 : 2}
              value={form[sec.key]} onChange={e => updateForm(sec.key, e.target.value)} placeholder={sec.placeholder} />
          </div>
        ))}
        <button className={s.saveBtn} onClick={save}>가정예배 저장</button>
      </div>

      {records.length === 0 && <div className={s.empty}>아직 가정예배 기록이 없어요 🏠</div>}

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
            {isMonthOpen && g.items.map(r => {
        const isOpen = expandedId === r.id
        const isEditing = editingId === r.id

        if (isEditing) {
          return (
            <div key={r.id} className={s.card}>
              <div className={s.editHeader}>
                <div className={s.dateRow}>
                  <label className={s.dateLabel}>날짜</label>
                  <input type="date" className={s.dateInput} value={editDate} onChange={e => setEditDate(e.target.value)} />
                </div>
                <input className={s.refInput} value={editForm.ref} onChange={e => updateEditForm('ref', e.target.value)} placeholder="본문 말씀" />
              </div>
              <div className={s.editBody}>
                {SECTIONS.map(sec => (
                  <div key={sec.key} className={s.sectionBlock}>
                    <div className={s.sectionTag}>{sec.label}</div>
                    <textarea className={s.sectionArea} rows={2} value={editForm[sec.key]} onChange={e => updateEditForm(sec.key, e.target.value)} placeholder={sec.placeholder} />
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
          <div key={r.id} className={s.card}>
            <div className={s.cardTop} onClick={() => setExpandedId(isOpen ? null : r.id)}>
              <div>
                <span className={s.cardDate}>{r.date}</span>
                {r.ref && <span className={s.cardRef}>{r.ref}</span>}
              </div>
              <div className={s.cardRight}>
                <button className={s.editBtn} onClick={e => { e.stopPropagation(); shareRecord(r) }} title="공유">📤</button>
                <button className={s.editBtn} onClick={e => { e.stopPropagation(); printRecord(r) }} title="프린트">🖨</button>
                <button className={s.editBtn} onClick={e => { e.stopPropagation(); startEdit(r) }}>✏</button>
                <button className={s.delBtn} onClick={e => { e.stopPropagation(); deleteRecord(r.id) }}>x</button>
                <span className={s.expandIcon}>{isOpen ? 'A' : 'V'}</span>
              </div>
            </div>
            {!isOpen && <p className={s.preview}>{r.thanksgiving || r.meditation || r.word || '(내용 없음)'}</p>}
            {isOpen && (
              <div className={s.sections}>
                {SECTIONS.map(sec => {
                  const val = r[sec.key]
                  if (!val) return null
                  return <SecItem key={sec.key} label={sec.label} val={val} s={s} />
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