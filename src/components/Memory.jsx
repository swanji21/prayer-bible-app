import React, { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore'
import s from './Prayer.module.css'

const DEFAULT_TOPICS = ['구원', '믿음', '사랑', '위로', '지혜', '감사', '기타']

const OT = ['창세기','출애굽기','레위기','민수기','신명기','여호수아','사사기','룻기','사무엘상','사무엘하','열왕기상','열왕기하','역대상','역대하','에스라','느헤미야','에스더','욥기','시편','잠언','전도서','아가','이사야','예레미야','예레미야애가','에스겔','다니엘','호세아','요엘','아모스','오바댜','요나','미가','나훔','하박국','스바냐','학개','스가랴','말라기']
const NT = ['마태복음','마가복음','누가복음','요한복음','사도행전','로마서','고린도전서','고린도후서','갈라디아서','에베소서','빌립보서','골로새서','데살로니가전서','데살로니가후서','디모데전서','디모데후서','디도서','빌레몬서','히브리서','야고보서','베드로전서','베드로후서','요한일서','요한이서','요한삼서','유다서','요한계시록']
const ALL_BOOKS = [...OT, ...NT]
const BOOK_ORDER = Object.fromEntries(ALL_BOOKS.map((b, i) => [b, i]))

// 본문에서 맨 앞 성경구절 표시(예: "누가복음 10:20")를 분리 + 책/장/절 추출
function parseVerseStatic(raw) {
  const t = (raw || '').trim()
  if (!t) return { ref: '', body: '', book: '', chap: 9999, verse: 9999 }
  let ref = '', body = t
  const nl = t.indexOf('\n')
  if (nl > 0 && nl < 40) {
    ref = t.slice(0, nl).trim(); body = t.slice(nl + 1).trim()
  } else {
    const m = t.match(/^([가-힣]{1,7}(?:\s?[상하전후일이삼]?)?\s*\d+\s*:\s*\d+(?:\s*[-~]\s*\d+)?)\s+(.*)$/s)
    if (m) { ref = m[1].replace(/\s+/g, ' ').trim(); body = m[2].trim() }
  }
  // ref에서 책이름 / 장 / 절 뽑기
  let book = '', chap = 9999, verse = 9999
  if (ref) {
    const rm = ref.match(/^([가-힣]+)\s*(\d+)\s*:\s*(\d+)/)
    if (rm) { book = rm[1]; chap = parseInt(rm[2], 10); verse = parseInt(rm[3], 10) }
  }
  return { ref, body, book, chap, verse }
}

// 성경 순서 → 장 → 절 순 정렬 비교 (v.book 태그 우선, 없으면 본문에서 추출한 책)
function verseSort(a, b) {
  const pa = parseVerseStatic(a.text), pb = parseVerseStatic(b.text)
  const bookA = a.book || pa.book, bookB = b.book || pb.book
  const oa = bookA in BOOK_ORDER ? BOOK_ORDER[bookA] : 9999
  const ob = bookB in BOOK_ORDER ? BOOK_ORDER[bookB] : 9999
  if (oa !== ob) return oa - ob
  if (pa.chap !== pb.chap) return pa.chap - pb.chap
  return pa.verse - pb.verse
}

export default function Memory() {
  const [verses, setVerses] = useState([])
  const [topics, setTopics] = useState(DEFAULT_TOPICS)
  const [viewMode, setViewMode] = useState('topic')
  const [activeCat, setActiveCat] = useState('전체')
  const [bookTab, setBookTab] = useState('구약')
  const [expandedId, setExpandedId] = useState(null)

  const [showModal, setShowModal] = useState(false)
  const [newText, setNewText] = useState('')
  const [newTopic, setNewTopic] = useState('구원')
  const [newBook, setNewBook] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [editTopic, setEditTopic] = useState('')
  const [editBook, setEditBook] = useState('')

  const [showCatMgr, setShowCatMgr] = useState(false)
  const [newTopicName, setNewTopicName] = useState('')

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'memory'), snap => {
      setVerses(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [])

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'memoryCats'), d => {
      if (d.exists() && Array.isArray(d.data().list) && d.data().list.length > 0) {
        setTopics(d.data().list)
      }
    })
    return unsub
  }, [])

  useEffect(() => { setActiveCat('전체') }, [viewMode])

  const saveTopics = async (list) => {
    setTopics(list)
    await setDoc(doc(db, 'settings', 'memoryCats'), { list })
  }

  const addTopic = async () => {
    const name = newTopicName.trim()
    if (!name || topics.includes(name)) { setNewTopicName(''); return }
    await saveTopics([...topics, name])
    setNewTopicName('')
  }

  const removeTopic = async (name) => {
    if (!confirm('"' + name + '" 주제를 삭제할까요?\n(이 주제의 암송 구절은 "기타"로 이동해요)')) return
    const affected = verses.filter(v => v.topic === name)
    await Promise.all(affected.map(v => updateDoc(doc(db, 'memory', v.id), { topic: '기타' })))
    const next = topics.filter(c => c !== name)
    await saveTopics(next.includes('기타') ? next : [...next, '기타'])
    if (activeCat === name) setActiveCat('전체')
  }

  const moveTopic = async (idx, dir) => {
    const next = [...topics]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    await saveTopics(next)
  }

  const addVerse = async () => {
    if (!newText.trim()) return
    const topic = topics.includes(newTopic) ? newTopic : (topics[0] || '기타')
    await addDoc(collection(db, 'memory'), { text: newText.trim(), topic, book: newBook })
    setNewText(''); setNewTopic(topics[0] || '구원'); setNewBook(''); setShowModal(false)
  }

  const deleteVerse = async (id) => {
    if (!confirm('이 암송 구절을 삭제할까요?')) return
    await deleteDoc(doc(db, 'memory', id))
  }

  const startEdit = (v) => {
    setEditingId(v.id); setEditText(v.text || ''); setEditTopic(v.topic || (topics[0] || '기타')); setEditBook(v.book || '')
  }

  const saveEdit = async () => {
    await updateDoc(doc(db, 'memory', editingId), { text: editText.trim(), topic: editTopic, book: editBook })
    setEditingId(null)
  }

  const shareVerse = async (v) => {
    const parsed = parseVerseStatic(v.text)
    const tag = [v.book, v.topic].filter(Boolean).join(' · ')
    const header = [parsed.ref, tag].filter(Boolean).join('  ·  ')
    const text = (header ? '📖 ' + header + '\n' : '') + parsed.body
    try {
      if (navigator.share) await navigator.share({ title: '말씀 암송', text })
      else { await navigator.clipboard.writeText(text); alert('클립보드에 복사되었습니다') }
    } catch (e) { /* 취소 */ }
  }

  const printVerse = (v) => {
    const w = window.open('', '_blank')
    if (!w) { alert('팝업이 차단되어 있어요. 팝업을 허용해주세요.'); return }
    const parsed = parseVerseStatic(v.text)
    const safe = parsed.body.replace(/</g, '&lt;').replace(/\n/g, '<br>')
    const refLine = parsed.ref
    const tag = [v.book, v.topic].filter(Boolean).join(' · ')
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>말씀 암송</title>' +
      '<style>body{font-family:-apple-system,"Apple SD Gothic Neo",sans-serif;padding:0;color:#222;margin:0}' +
      '.content{padding:40px 32px;max-width:700px;margin:0 auto;text-align:center}' +
      '.ref{font-size:16px;font-weight:700;color:#b8863b;margin-bottom:16px}' +
      '.txt{font-size:22px;line-height:2;color:#333}' +
      '.tag{margin-top:26px;font-size:14px;color:#001f3f;font-weight:700}' +
      '.bar{position:sticky;top:0;display:flex;gap:8px;padding:12px 16px;background:#001f3f;box-shadow:0 2px 8px rgba(0,0,0,0.15)}' +
      '.bar button{flex:1;padding:12px;font-size:15px;font-weight:700;border:none;border-radius:8px;cursor:pointer}' +
      '.back{background:rgba(255,255,255,0.15);color:#fff}' +
      '.print{background:#d4a55a;color:#001f3f}' +
      '@media print{.bar{display:none}}</style></head><body>' +
      '<div class="bar">' +
      '<button class="back" onclick="window.close()">← 돌아가기</button>' +
      '<button class="print" onclick="window.print()">🖨 인쇄하기</button>' +
      '</div>' +
      '<div class="content">' +
      (refLine ? '<div class="ref">' + refLine + '</div>' : '') +
      '<div class="txt">' + safe + '</div>' +
      (tag ? '<div class="tag">' + tag + '</div>' : '') +
      '</div></body></html>')
    w.document.close()
    w.focus()
  }

  const sectionBooks = (bookTab === '구약' ? OT : NT).filter(b => verses.some(v => v.book === b))

  const parseVerse = parseVerseStatic

  let filtered
  if (viewMode === 'topic') {
    filtered = activeCat === '전체' ? verses : verses.filter(v => v.topic === activeCat)
  } else {
    filtered = activeCat === '전체'
      ? verses.filter(v => (bookTab === '구약' ? OT : NT).includes(v.book))
      : verses.filter(v => v.book === activeCat)
  }
  filtered = [...filtered].sort(verseSort)

  return (
    <div className={s.wrap}>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        <button onClick={() => setViewMode('topic')} style={toggleStyle(viewMode === 'topic')}>주제별</button>
        <button onClick={() => setViewMode('book')} style={toggleStyle(viewMode === 'book')}>성경별</button>
      </div>

      {viewMode === 'book' && (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
          {['구약', '신약'].map(sec => (
            <button key={sec} onClick={() => { setBookTab(sec); setActiveCat('전체') }} style={subToggleStyle(bookTab === sec)}>{sec}</button>
          ))}
        </div>
      )}

      <div className={s.catTabs}>
        <button className={s.catTab + (activeCat === '전체' ? ' ' + s.catActive : '')} onClick={() => setActiveCat('전체')}>전체</button>
        {viewMode === 'topic'
          ? topics.map(c => {
              const cnt = verses.filter(v => v.topic === c).length
              return (
                <button key={c} className={s.catTab + (activeCat === c ? ' ' + s.catActive : '')} onClick={() => setActiveCat(c)}>
                  {c}{cnt > 0 && <span className={s.catBadge}>{cnt}</span>}
                </button>
              )
            })
          : sectionBooks.map(c => {
              const cnt = verses.filter(v => v.book === c).length
              return (
                <button key={c} className={s.catTab + (activeCat === c ? ' ' + s.catActive : '')} onClick={() => setActiveCat(c)}>
                  {c}<span className={s.catBadge}>{cnt}</span>
                </button>
              )
            })}
        {viewMode === 'topic' && (
          <button className={s.catTab} onClick={() => setShowCatMgr(true)} style={{ opacity: 0.7 }}>⚙ 편집</button>
        )}
      </div>

      <button className={s.addBtn} style={{ margin: '4px 0 10px' }} onClick={() => {
        setNewTopic(viewMode === 'topic' && activeCat !== '전체' ? activeCat : (topics[0] || '구원'))
        setNewBook(viewMode === 'book' && activeCat !== '전체' ? activeCat : '')
        setShowModal(true)
      }}>+ 암송 구절 추가</button>

      <div className={s.list}>
        {filtered.length === 0 && <div className={s.empty}>암송 구절이 없어요</div>}
        {filtered.map(v => {
          const isOpen = expandedId === v.id
          if (editingId === v.id) {
            return (
              <div key={v.id} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px' }}>
                <textarea className={s.sheetInput} value={editText} onChange={e => setEditText(e.target.value)} placeholder="본문 내용" rows={3} style={{ resize: 'vertical' }} />
                <div style={{ fontSize: '12px', color: 'var(--text2)', margin: '4px 0 6px' }}>주제</div>
                <div className={s.catRow}>
                  {topics.map(c => (
                    <button key={c} className={s.catBtn + (editTopic === c ? ' ' + s.catSel : '')} onClick={() => setEditTopic(c)}>{c}</button>
                  ))}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text2)', margin: '4px 0 6px' }}>성경 (선택)</div>
                <select className={s.sheetInput} value={editBook} onChange={e => setEditBook(e.target.value)}>
                  <option value="">선택 안 함</option>
                  <optgroup label="구약">{OT.map(b => <option key={b} value={b}>{b}</option>)}</optgroup>
                  <optgroup label="신약">{NT.map(b => <option key={b} value={b}>{b}</option>)}</optgroup>
                </select>
                <div className={s.sheetBtns}>
                  <button className={s.cancelBtn} onClick={() => setEditingId(null)}>취소</button>
                  <button className={s.confirmBtn} onClick={saveEdit}>저장</button>
                </div>
              </div>
            )
          }
          return (
            <div key={v.id} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              <div onClick={() => setExpandedId(isOpen ? null : v.id)} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '11px 12px', cursor: 'pointer' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {(() => {
                    const { ref, body } = parseVerse(v.text)
                    return (
                      <>
                        {ref && <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--gold-mid, #b8863b)', marginBottom: '3px' }}>{ref}</div>}
                        <div style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap', ...(isOpen ? {} : { overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }) }}>{body}</div>
                      </>
                    )
                  })()}
                </div>
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0, alignItems: 'center' }}>
                  {v.book && <span className={s.cat}>{v.book}</span>}
                  {v.topic && <span className={s.cat}>{v.topic}</span>}
                  <span style={{ color: 'var(--text2)', fontSize: '12px' }}>{isOpen ? '▲' : '▼'}</span>
                </div>
              </div>
              {isOpen && (
                <div style={{ padding: '0 12px 12px' }}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button className={s.catBtn} onClick={() => shareVerse(v)}>📤 공유</button>
                    <button className={s.catBtn} onClick={() => printVerse(v)}>🖨 프린트</button>
                    <button className={s.catBtn} onClick={() => startEdit(v)}>✏ 수정</button>
                    <button className={s.catBtn} onClick={() => deleteVerse(v.id)} style={{ color: '#e57373' }}>x 삭제</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showModal && (
        <div className={s.overlay} onClick={() => setShowModal(false)}>
          <div className={s.sheet} onClick={e => e.stopPropagation()}>
            <div className={s.sheetTitle}>암송 구절 추가</div>
            <textarea className={s.sheetInput} value={newText} onChange={e => setNewText(e.target.value)} placeholder="본문 내용" rows={3} style={{ resize: 'vertical' }} autoFocus />
            <div style={{ fontSize: '12px', color: 'var(--text2)', margin: '2px 0 6px' }}>주제</div>
            <div className={s.catRow}>
              {topics.map(c => (
                <button key={c} className={s.catBtn + (newTopic === c ? ' ' + s.catSel : '')} onClick={() => setNewTopic(c)}>{c}</button>
              ))}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text2)', margin: '2px 0 6px' }}>성경 (선택)</div>
            <select className={s.sheetInput} value={newBook} onChange={e => setNewBook(e.target.value)}>
              <option value="">선택 안 함</option>
              <optgroup label="구약">{OT.map(b => <option key={b} value={b}>{b}</option>)}</optgroup>
              <optgroup label="신약">{NT.map(b => <option key={b} value={b}>{b}</option>)}</optgroup>
            </select>
            <div className={s.sheetBtns}>
              <button className={s.cancelBtn} onClick={() => setShowModal(false)}>취소</button>
              <button className={s.confirmBtn} onClick={addVerse}>추가</button>
            </div>
          </div>
        </div>
      )}

      {showCatMgr && (
        <div className={s.overlay} onClick={() => setShowCatMgr(false)}>
          <div className={s.sheet} onClick={e => e.stopPropagation()}>
            <div className={s.sheetTitle}>주제 관리</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '4px 0 12px', maxHeight: '260px', overflowY: 'auto' }}>
              {topics.map((c, idx) => (
                <div key={c} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 10px', background: 'var(--bg2)', borderRadius: '8px' }}>
                  <span style={{ flex: 1, fontSize: '14px', color: 'var(--text)' }}>{c}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text2)', marginRight: '4px' }}>{verses.filter(v => v.topic === c).length}개</span>
                  <button onClick={() => moveTopic(idx, -1)} disabled={idx === 0} style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: '6px', background: 'transparent', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.3 : 1, color: 'var(--text)' }}>▲</button>
                  <button onClick={() => moveTopic(idx, 1)} disabled={idx === topics.length - 1} style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: '6px', background: 'transparent', cursor: idx === topics.length - 1 ? 'default' : 'pointer', opacity: idx === topics.length - 1 ? 0.3 : 1, color: 'var(--text)' }}>▼</button>
                  <button onClick={() => removeTopic(c)} style={{ padding: '4px 9px', border: 'none', borderRadius: '6px', background: '#e57373', color: 'white', cursor: 'pointer' }}>x</button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input className={s.sheetInput} style={{ flex: 1, margin: 0 }} value={newTopicName} onChange={e => setNewTopicName(e.target.value)}
                placeholder="새 주제 이름" onKeyDown={e => e.key === 'Enter' && addTopic()} />
              <button className={s.confirmBtn} style={{ flex: 'none', padding: '0 18px' }} onClick={addTopic}>추가</button>
            </div>
            <div className={s.sheetBtns} style={{ marginTop: '12px' }}>
              <button className={s.confirmBtn} onClick={() => setShowCatMgr(false)}>완료</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const toggleStyle = (active) => ({
  flex: 1, padding: '9px', borderRadius: '10px', fontSize: '14px', fontWeight: '700',
  border: 'none', cursor: 'pointer',
  background: active ? 'var(--navy)' : 'var(--bg2)',
  color: active ? 'var(--gold-mid)' : 'var(--text2)'
})

const subToggleStyle = (active) => ({
  flex: 1, padding: '7px', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
  border: '0.5px solid var(--border)', cursor: 'pointer',
  background: active ? 'var(--gold-light)' : 'transparent',
  color: active ? '#5a3e12' : 'var(--text2)'
})
