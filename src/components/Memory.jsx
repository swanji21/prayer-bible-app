import React, { useState, useEffect } from 'react'
import { db } from '../firebase'
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore'
import s from './Prayer.module.css'

const DEFAULT_CATS = ['구원', '믿음', '사랑', '위로', '지혜', '감사', '기타']

export default function Memory() {
  const [verses, setVerses] = useState([])
  const [cats, setCats] = useState(DEFAULT_CATS)
  const [activeCat, setActiveCat] = useState('전체')
  const [expandedId, setExpandedId] = useState(null)

  const [showModal, setShowModal] = useState(false)
  const [newRef, setNewRef] = useState('')
  const [newText, setNewText] = useState('')
  const [newCat, setNewCat] = useState('구원')

  const [editingId, setEditingId] = useState(null)
  const [editRef, setEditRef] = useState('')
  const [editText, setEditText] = useState('')
  const [editCat, setEditCat] = useState('')

  const [showCatMgr, setShowCatMgr] = useState(false)
  const [newCatName, setNewCatName] = useState('')

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'memory'), snap => {
      setVerses(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [])

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'memoryCats'), d => {
      if (d.exists() && Array.isArray(d.data().list) && d.data().list.length > 0) {
        setCats(d.data().list)
      }
    })
    return unsub
  }, [])

  const saveCats = async (list) => {
    setCats(list)
    await setDoc(doc(db, 'settings', 'memoryCats'), { list })
  }

  const addCat = async () => {
    const name = newCatName.trim()
    if (!name || cats.includes(name)) { setNewCatName(''); return }
    await saveCats([...cats, name])
    setNewCatName('')
  }

  const removeCat = async (name) => {
    if (!confirm('"' + name + '" 카테고리를 삭제할까요?\n(이 카테고리의 암송 구절은 "기타"로 이동해요)')) return
    const affected = verses.filter(v => v.cat === name)
    await Promise.all(affected.map(v => updateDoc(doc(db, 'memory', v.id), { cat: '기타' })))
    const next = cats.filter(c => c !== name)
    await saveCats(next.includes('기타') ? next : [...next, '기타'])
    if (activeCat === name) setActiveCat('전체')
  }

  const moveCat = async (idx, dir) => {
    const next = [...cats]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    await saveCats(next)
  }

  const addVerse = async () => {
    if (!newRef.trim() && !newText.trim()) return
    const cat = cats.includes(newCat) ? newCat : (cats[0] || '기타')
    await addDoc(collection(db, 'memory'), { ref: newRef.trim(), text: newText.trim(), cat })
    setNewRef(''); setNewText(''); setNewCat(cats[0] || '구원'); setShowModal(false)
  }

  const deleteVerse = async (id) => {
    if (!confirm('이 암송 구절을 삭제할까요?')) return
    await deleteDoc(doc(db, 'memory', id))
  }

  const startEdit = (v) => {
    setEditingId(v.id); setEditRef(v.ref || ''); setEditText(v.text || ''); setEditCat(v.cat || (cats[0] || '기타'))
  }

  const saveEdit = async () => {
    await updateDoc(doc(db, 'memory', editingId), { ref: editRef.trim(), text: editText.trim(), cat: editCat })
    setEditingId(null)
  }

  const shareVerse = async (v) => {
    const text = '📖 ' + (v.ref || '') + '\n' + (v.text || '')
    try {
      if (navigator.share) await navigator.share({ title: '말씀 암송', text })
      else { await navigator.clipboard.writeText(text); alert('클립보드에 복사되었습니다') }
    } catch (e) { /* 취소 */ }
  }

  const printVerse = (v) => {
    const w = window.open('', '_blank')
    if (!w) { alert('팝업이 차단되어 있어요. 팝업을 허용해주세요.'); return }
    const safe = (v.text || '').replace(/</g, '&lt;').replace(/\n/g, '<br>')
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>말씀 암송</title>' +
      '<style>body{font-family:-apple-system,"Apple SD Gothic Neo",sans-serif;padding:0;color:#222;margin:0}' +
      '.content{padding:32px;max-width:700px;margin:0 auto;text-align:center}' +
      '.ref{font-size:16px;color:#001f3f;font-weight:700;margin-bottom:16px}' +
      '.txt{font-size:20px;line-height:1.9;color:#333}' +
      '.cat{margin-top:22px;font-size:13px;color:#999}' +
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
      '<div class="ref">' + (v.ref || '') + '</div>' +
      '<div class="txt">' + safe + '</div>' +
      (v.cat ? '<div class="cat">[' + v.cat + ']</div>' : '') +
      '</div></body></html>')
    w.document.close()
    w.focus()
  }

  const filtered = activeCat === '전체' ? verses : verses.filter(v => v.cat === activeCat)

  return (
    <div className={s.wrap}>
      <div className={s.catTabs}>
        <button className={s.catTab + (activeCat === '전체' ? ' ' + s.catActive : '')} onClick={() => setActiveCat('전체')}>
          전체{verses.length > 0 && <span className={s.catBadge}>{verses.length}</span>}
        </button>
        {cats.map(c => {
          const cnt = verses.filter(v => v.cat === c).length
          return (
            <button key={c} className={s.catTab + (activeCat === c ? ' ' + s.catActive : '')} onClick={() => setActiveCat(c)}>
              {c}{cnt > 0 && <span className={s.catBadge}>{cnt}</span>}
            </button>
          )
        })}
        <button className={s.catTab} onClick={() => setShowCatMgr(true)} style={{ opacity: 0.7 }}>⚙ 편집</button>
      </div>

      <div className={s.list}>
        {filtered.length === 0 && <div className={s.empty}>암송 구절이 없어요</div>}
        {filtered.map(v => {
          const isOpen = expandedId === v.id
          if (editingId === v.id) {
            return (
              <div key={v.id} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px' }}>
                <input className={s.sheetInput} value={editRef} onChange={e => setEditRef(e.target.value)} placeholder="성경구절 (예: 요 3:16)" />
                <textarea className={s.sheetInput} value={editText} onChange={e => setEditText(e.target.value)} placeholder="본문 내용" rows={3} style={{ resize: 'vertical' }} />
                <div className={s.catRow}>
                  {cats.map(c => (
                    <button key={c} className={s.catBtn + (editCat === c ? ' ' + s.catSel : '')} onClick={() => setEditCat(c)}>{c}</button>
                  ))}
                </div>
                <div className={s.sheetBtns}>
                  <button className={s.cancelBtn} onClick={() => setEditingId(null)}>취소</button>
                  <button className={s.confirmBtn} onClick={saveEdit}>저장</button>
                </div>
              </div>
            )
          }
          return (
            <div key={v.id} style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              <div onClick={() => setExpandedId(isOpen ? null : v.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 12px', cursor: 'pointer' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>{v.ref || '(구절 없음)'}</div>
                  {!isOpen && v.text && <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.text}</div>}
                </div>
                {v.cat && <span className={s.cat}>{v.cat}</span>}
                <span style={{ color: 'var(--text2)', fontSize: '12px' }}>{isOpen ? '▲' : '▼'}</span>
              </div>
              {isOpen && (
                <div style={{ padding: '0 12px 12px' }}>
                  {v.text && <p style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--text)', whiteSpace: 'pre-wrap', margin: '0 0 10px' }}>{v.text}</p>}
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

      <button className={s.addBtn} onClick={() => { setNewCat(activeCat !== '전체' ? activeCat : (cats[0] || '구원')); setShowModal(true) }}>+ 암송 구절 추가</button>

      {showModal && (
        <div className={s.overlay} onClick={() => setShowModal(false)}>
          <div className={s.sheet} onClick={e => e.stopPropagation()}>
            <div className={s.sheetTitle}>암송 구절 추가</div>
            <input className={s.sheetInput} value={newRef} onChange={e => setNewRef(e.target.value)} placeholder="성경구절 (예: 요 3:16)" />
            <textarea className={s.sheetInput} value={newText} onChange={e => setNewText(e.target.value)} placeholder="본문 내용" rows={3} style={{ resize: 'vertical' }} />
            <div className={s.catRow}>
              {cats.map(c => (
                <button key={c} className={s.catBtn + (newCat === c ? ' ' + s.catSel : '')} onClick={() => setNewCat(c)}>{c}</button>
              ))}
            </div>
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
            <div className={s.sheetTitle}>카테고리 관리</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '4px 0 12px', maxHeight: '260px', overflowY: 'auto' }}>
              {cats.map((c, idx) => (
                <div key={c} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 10px', background: 'var(--bg2)', borderRadius: '8px' }}>
                  <span style={{ flex: 1, fontSize: '14px', color: 'var(--text)' }}>{c}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text2)', marginRight: '4px' }}>{verses.filter(v => v.cat === c).length}개</span>
                  <button onClick={() => moveCat(idx, -1)} disabled={idx === 0} style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: '6px', background: 'transparent', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.3 : 1, color: 'var(--text)' }}>▲</button>
                  <button onClick={() => moveCat(idx, 1)} disabled={idx === cats.length - 1} style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: '6px', background: 'transparent', cursor: idx === cats.length - 1 ? 'default' : 'pointer', opacity: idx === cats.length - 1 ? 0.3 : 1, color: 'var(--text)' }}>▼</button>
                  <button onClick={() => removeCat(c)} style={{ padding: '4px 9px', border: 'none', borderRadius: '6px', background: '#e57373', color: 'white', cursor: 'pointer' }}>x</button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input className={s.sheetInput} style={{ flex: 1, margin: 0 }} value={newCatName} onChange={e => setNewCatName(e.target.value)}
                placeholder="새 카테고리 이름" onKeyDown={e => e.key === 'Enter' && addCat()} />
              <button className={s.confirmBtn} style={{ flex: 'none', padding: '0 18px' }} onClick={addCat}>추가</button>
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
