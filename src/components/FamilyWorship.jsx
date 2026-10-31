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
  const [printPreview, setPrintPreview] = useState(null)  // { record, dataUrl }
  const [printFontScale, setPrintFontScale] = useState(1)
  const printCanvasRef = React.useRef(null)
  const printRecordRef = React.useRef(null)
  const pinchRef = React.useRef({ startDist: 0, startScale: 1 })

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

  // 예배지를 캔버스에 렌더 (고해상도). fs = 글자 배율(폭은 항상 꽉 채움)
  const renderWorshipCanvas = (r, fs = 1) => {
    const scale = Math.min(window.devicePixelRatio || 1, 3)
    const W = 820, pad = 48, contentW = W - pad * 2
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const FONT = (w, sz) => w + ' ' + (sz * fs) + 'px -apple-system, "Apple SD Gothic Neo", sans-serif'
    const L = (n) => n * fs   // 줄높이/간격도 배율 적용
    const wrap = (text, font) => {
      ctx.font = font
      const out = []
      String(text).split('\n').forEach(para => {
        if (!para) { out.push(''); return }
        let cur = ''
        for (const ch of para) {
          if (ctx.measureText(cur + ch).width > contentW && cur) { out.push(cur); cur = ch }
          else cur += ch
        }
        out.push(cur)
      })
      return out
    }
    const blocks = []
    // 제목 + 하단 구분선
    blocks.push({ lines: ['🏠 가정예배'], font: FONT('700', 30), lh: L(42), color: '#001f3f', mt: 0, rule: true })
    // 날짜 · 본문
    blocks.push({ lines: wrap(r.date + (r.ref ? ' · 본문: ' + r.ref : ''), FONT('400', 19)), font: FONT('400', 19), lh: L(28), color: '#777', mt: L(10) })
    SECTIONS.forEach(sec => {
      // 섹션 제목(금색 세로 막대 + 남색 글씨)
      blocks.push({ lines: [sec.label], font: FONT('700', 22), lh: L(32), color: '#001f3f', mt: L(24), bar: true })
      const val = r[sec.key]
      blocks.push({
        lines: val ? wrap(val, FONT('400', 21)) : [''],   // 미입력 섹션도 제목+빈 줄로 표시
        font: FONT('400', 21), lh: L(33), color: val ? '#222' : '#999', mt: L(4)
      })
    })
    const advance = (b) => b.mt + b.lines.length * b.lh + (b.rule ? L(16) : 0)
    let H = pad
    blocks.forEach(b => { H += advance(b) })
    H += pad
    canvas.width = Math.round(W * scale)
    canvas.height = Math.round(H * scale)
    ctx.scale(scale, scale)
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H)
    ctx.textBaseline = 'top'
    let y = pad
    blocks.forEach(b => {
      y += b.mt
      if (b.bar) { ctx.fillStyle = '#d4a55a'; ctx.fillRect(pad, y + 3, 4, b.lh - 8) }
      const tx = b.bar ? pad + 14 : pad
      ctx.font = b.font; ctx.fillStyle = b.color
      b.lines.forEach(line => { ctx.fillText(line, tx, y); y += b.lh })
      if (b.rule) {
        ctx.strokeStyle = '#001f3f'; ctx.lineWidth = 2
        ctx.beginPath(); ctx.moveTo(pad, y + 7); ctx.lineTo(W - pad, y + 7); ctx.stroke()
        y += L(16)
      }
    })
    return canvas
  }

  // 캔버스를 A4 PDF로 — 페이지 폭을 가득 채우고, 길면 여러 페이지로 분할.
  // scaleFactor: 핀치 배율(1 = 폭 꽉 채움)
  const canvasToPdfBlob = (srcCanvas, scaleFactor = 1) => {
    const PW = 595.28, PH = 841.89, m = 28
    const availW = PW - m * 2, availH = PH - m * 2
    const W = srcCanvas.width, H = srcCanvas.height
    const f = (availW / W) * scaleFactor          // 소스 px → pt (폭 채움 × 핀치)
    const drawW = W * f                            // 그려질 가로 폭(pt)
    const pageHpx = Math.max(1, Math.floor(availH / f))  // 한 페이지에 담기는 소스 세로 px
    const pageCount = Math.max(1, Math.ceil(H / pageHpx))

    // 페이지별 JPEG 슬라이스
    const slices = []
    for (let p = 0; p < pageCount; p++) {
      const sy = p * pageHpx
      const hpx = Math.min(pageHpx, H - sy)
      const pc = document.createElement('canvas')
      pc.width = W; pc.height = hpx
      const pctx = pc.getContext('2d')
      pctx.fillStyle = '#fff'; pctx.fillRect(0, 0, W, hpx)
      pctx.drawImage(srcCanvas, 0, sy, W, hpx, 0, 0, W, hpx)
      const b64 = pc.toDataURL('image/jpeg', 0.92).split(',')[1]
      const bin = atob(b64)
      const jpg = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) jpg[i] = bin.charCodeAt(i)
      slices.push({ jpg, hpx })
    }

    const enc = (s) => new TextEncoder().encode(s)
    const parts = []; let len = 0; const off = {}
    const push = (u8) => { parts.push(u8); len += u8.length }
    const pStr = (s) => push(enc(s))
    const obj = (n) => { off[n] = len }
    const total_objs = 2 + pageCount * 3
    pStr('%PDF-1.4\n')
    obj(1); pStr('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')
    const kids = slices.map((_, p) => (3 + p * 3) + ' 0 R').join(' ')
    obj(2); pStr('2 0 obj\n<< /Type /Pages /Kids [' + kids + '] /Count ' + pageCount + ' >>\nendobj\n')
    slices.forEach((sl, p) => {
      const pageN = 3 + p * 3, imgN = 4 + p * 3, contN = 5 + p * 3
      const drawH = sl.hpx * f
      const tx = m, ty = PH - m - drawH   // 위 여백부터 아래로
      const content = 'q ' + drawW.toFixed(2) + ' 0 0 ' + drawH.toFixed(2) + ' ' + tx.toFixed(2) + ' ' + ty.toFixed(2) + ' cm /Im0 Do Q'
      obj(pageN); pStr(pageN + ' 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PW + ' ' + PH + '] /Resources << /XObject << /Im0 ' + imgN + ' 0 R >> >> /Contents ' + contN + ' 0 R >>\nendobj\n')
      obj(imgN); pStr(imgN + ' 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + W + ' /Height ' + sl.hpx + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + sl.jpg.length + ' >>\nstream\n')
      push(sl.jpg); pStr('\nendstream\nendobj\n')
      obj(contN); pStr(contN + ' 0 obj\n<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream\nendobj\n')
    })
    const xrefStart = len
    let xref = 'xref\n0 ' + (total_objs + 1) + '\n0000000000 65535 f \n'
    for (let n = 1; n <= total_objs; n++) xref += String(off[n]).padStart(10, '0') + ' 00000 n \n'
    pStr(xref)
    pStr('trailer\n<< /Size ' + (total_objs + 1) + ' /Root 1 0 R >>\nstartxref\n' + xrefStart + '\n%%EOF')
    const out = new Uint8Array(len); let o = 0
    parts.forEach(p => { out.set(p, o); o += p.length })
    return new Blob([out], { type: 'application/pdf' })
  }

  // 설치형 앱(standalone) 여부 — iOS 홈 화면 앱은 웹페이지 인쇄가 막혀 공유 방식이 필요
  const isStandalone = () =>
    (typeof window !== 'undefined') &&
    ((window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true)

  const sharePdf = async (r) => {
    const pdf = canvasToPdfBlob(renderWorshipCanvas(r))
    const file = new File([pdf], '가정예배_' + r.date + '.pdf', { type: 'application/pdf' })
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: '가정예배 ' + r.date }) } catch (e) { /* 취소 */ }
      return true
    }
    return false
  }

  const printRecord = async (r) => {
    // Safari/데스크탑 브라우저: 웹페이지 인쇄창(크기 % 조절 항목 지원)
    // 설치형 앱(홈 화면): 앱 안 미리보기에서 핀치로 크기 조절 후 PDF 공유
    if (isStandalone()) {
      printRecordRef.current = r
      buildPreview(r, 1)
      return
    }
    printViaWindow(r)
  }

  // 글자 배율에 맞춰 캔버스 재렌더 + 미리보기 갱신 (폭은 항상 꽉 채움)
  const buildPreview = (r, fs) => {
    const canvas = renderWorshipCanvas(r, fs)
    printCanvasRef.current = canvas
    setPrintFontScale(fs)
    setPrintPreview({ record: r, dataUrl: canvas.toDataURL('image/jpeg', 0.92) })
  }
  const setFontScale = (fs) => buildPreview(printRecordRef.current, Math.min(1.8, Math.max(0.5, Math.round(fs * 100) / 100)))

  // 핀치 → 글자 크기 조절
  const pinchDist = (touches) => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY)
  const onPinchStart = (e) => { if (e.touches.length === 2) pinchRef.current = { startDist: pinchDist(e.touches), startScale: printFontScale } }
  const onPinchMove = (e) => {
    if (e.touches.length === 2 && pinchRef.current.startDist > 0) {
      setFontScale(pinchRef.current.startScale * (pinchDist(e.touches) / pinchRef.current.startDist))
    }
  }

  const sharePreviewPdf = async () => {
    const r = printPreview.record
    const canvas = printCanvasRef.current
    setPrintPreview(null)
    try {
      const pdf = canvasToPdfBlob(canvas)   // 폭 꽉 채움 + 길면 페이지 분할
      const file = new File([pdf], '가정예배_' + r.date + '.pdf', { type: 'application/pdf' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: '가정예배 ' + r.date }) } catch (e) { /* 취소 */ }
        return
      }
    } catch (e) { /* 폴백 */ }
    printViaWindow(r)
  }

  const printViaWindow = (r) => {
    const w = window.open('', '_blank')
    if (!w) {
      // 홈 화면 앱 등에서 새 창이 막히면 PDF 공유로 우회
      sharePdf(r).then(ok => { if (!ok) alert('인쇄 창을 열 수 없어요. Safari에서 열어 인쇄해 주세요.') })
      return
    }
    const body = SECTIONS.map(sec => {
      const val = r[sec.key]
      const content = val
        ? val.replace(/</g, '&lt;').replace(/\n/g, '<br>')
        : '<span class="empty">—</span>'
      return '<h2>' + sec.label + '</h2><p>' + content + '</p>'
    }).join('')
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>가정예배 ' + r.date + '</title>' +
      '<style>body{font-family:-apple-system,"Apple SD Gothic Neo",sans-serif;padding:0;color:#222;margin:0}' +
      '.content{padding:28px;max-width:700px;margin:0 auto}' +
      'h1{font-size:20px;border-bottom:2px solid #001f3f;padding-bottom:8px}' +
      'h2{font-size:15px;color:#001f3f;margin:18px 0 4px;border-left:3px solid #d4a55a;padding-left:8px}' +
      'p{margin:4px 0;font-size:14px;line-height:1.7}' +
      '.meta{color:#777;font-size:13px;margin-bottom:8px}' +
      '.empty{color:#bbb}' +
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
      '<h1>🏠 가정예배</h1>' +
      '<p class="meta">' + r.date + (r.ref ? ' · 본문: ' + r.ref : '') + '</p>' +
      body + '</div></body></html>')
    w.document.close()
    w.focus()
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

      {printPreview && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.75)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ color: '#fff', fontSize: '13px', marginBottom: '10px', textAlign: 'center' }}>두 손가락으로 글자 크기를 조절하세요<br/><span style={{ opacity: 0.6, fontSize: '11px' }}>(가로 폭은 항상 꽉 채워 인쇄됩니다)</span></div>
          <div
            onTouchStart={onPinchStart} onTouchMove={onPinchMove}
            style={{ width: 'min(80vw, 330px)', aspectRatio: '595.28 / 841.89', background: '#fff', borderRadius: '6px', overflow: 'hidden', position: 'relative', boxShadow: '0 8px 30px rgba(0,0,0,0.4)', touchAction: 'none' }}>
            <div style={{ position: 'absolute', left: '4.7%', top: '3.33%', right: '4.7%', bottom: '3.33%', overflow: 'hidden' }}>
              <img src={printPreview.dataUrl} alt="미리보기"
                style={{ width: '100%', display: 'block' }} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0 4px' }}>
            <button onClick={() => setFontScale(printFontScale - 0.1)}
              style={{ width: '40px', height: '40px', borderRadius: '20px', border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '22px', cursor: 'pointer' }}>−</button>
            <span style={{ color: '#fff', fontSize: '15px', fontWeight: 700, minWidth: '72px', textAlign: 'center' }}>글자 {Math.round(printFontScale * 100)}%</span>
            <button onClick={() => setFontScale(printFontScale + 0.1)}
              style={{ width: '40px', height: '40px', borderRadius: '20px', border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '22px', cursor: 'pointer' }}>+</button>
          </div>
          <input type="range" min="0.5" max="1.8" step="0.05" value={printFontScale}
            onChange={e => setFontScale(parseFloat(e.target.value))}
            style={{ width: 'min(80vw, 330px)', margin: '4px 0 16px' }} />
          <div style={{ display: 'flex', gap: '10px', width: 'min(80vw, 330px)' }}>
            <button onClick={() => setPrintPreview(null)}
              style={{ flex: 1, padding: '13px', borderRadius: '10px', border: 'none', background: 'rgba(255,255,255,0.18)', color: '#fff', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}>취소</button>
            <button onClick={sharePreviewPdf}
              style={{ flex: 2, padding: '13px', borderRadius: '10px', border: 'none', background: '#d4a55a', color: '#001f3f', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}>🖨 이 크기로 프린트</button>
          </div>
        </div>
      )}
    </div>
  )
}