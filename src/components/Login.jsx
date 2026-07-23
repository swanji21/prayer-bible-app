import { useState } from 'react'
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../firebase'

const ERRORS = {
  'auth/invalid-email': '이메일 형식이 올바르지 않아요.',
  'auth/user-not-found': '등록되지 않은 이메일이에요.',
  'auth/wrong-password': '비밀번호가 맞지 않아요.',
  'auth/invalid-credential': '이메일 또는 비밀번호가 맞지 않아요.',
  'auth/too-many-requests': '시도가 너무 많아요. 잠시 후 다시 시도해주세요.',
  'auth/network-request-failed': '네트워크 연결을 확인해주세요.',
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!email.trim() || !pw) { setErr('이메일과 비밀번호를 입력해주세요.'); return }
    setBusy(true); setErr(''); setMsg('')
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pw)
    } catch (e) {
      setErr(ERRORS[e.code] || '로그인에 실패했어요. (' + e.code + ')')
    }
    setBusy(false)
  }

  const resetPw = async () => {
    if (!email.trim()) { setErr('비밀번호를 재설정할 이메일을 입력해주세요.'); return }
    setErr(''); setMsg('')
    try {
      await sendPasswordResetEmail(auth, email.trim())
      setMsg('비밀번호 재설정 메일을 보냈어요. 메일함을 확인해주세요.')
    } catch (e) {
      setErr(ERRORS[e.code] || '메일 발송에 실패했어요.')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '28px 22px',
      background: '#001f3f', boxSizing: 'border-box'
    }}>
      <div style={{ fontSize: '26px', fontWeight: '700', color: '#d4a55a', marginBottom: '6px' }}>
        ✝ 말씀과 기도
      </div>
      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', marginBottom: '28px' }}>
        로그인하고 기록을 이어가세요
      </div>

      <div style={{ width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input
          type="email"
          inputMode="email"
          autoComplete="username"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="이메일"
          style={inputStyle}
        />
        <input
          type="password"
          autoComplete="current-password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="비밀번호"
          style={inputStyle}
        />

        {err && <div style={{ fontSize: '13px', color: '#ff8a80', lineHeight: 1.5 }}>{err}</div>}
        {msg && <div style={{ fontSize: '13px', color: '#a5d6a7', lineHeight: 1.5 }}>{msg}</div>}

        <button
          onClick={submit}
          disabled={busy}
          style={{
            padding: '14px', marginTop: '4px', border: 'none', borderRadius: '10px',
            background: '#d4a55a', color: '#001f3f', fontSize: '15px', fontWeight: '700',
            cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1
          }}>
          {busy ? '로그인 중...' : '로그인'}
        </button>

        <button
          onClick={resetPw}
          style={{
            padding: '10px', border: 'none', background: 'transparent',
            color: 'rgba(255,255,255,0.5)', fontSize: '13px', cursor: 'pointer'
          }}>
          비밀번호를 잊으셨나요?
        </button>
      </div>
    </div>
  )
}

const inputStyle = {
  padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.18)',
  background: 'rgba(255,255,255,0.07)', color: '#fff', fontSize: '15px',
  outline: 'none', boxSizing: 'border-box', width: '100%'
}
