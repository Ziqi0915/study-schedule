import { useState } from 'react'
import { api } from '../api'

export default function AuthScreen({ notice = '', onAuthed }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ username: '', password: '', confirm: '' })
  const [error, setError] = useState(notice)
  const [busy, setBusy] = useState(false)

  function switchMode(next) {
    setMode(next)
    setError('')
    setForm((f) => ({ ...f, password: '', confirm: '' }))
  }

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (mode === 'register' && form.password !== form.confirm) {
      setError('两次输入的密码不一致')
      return
    }
    setBusy(true)
    try {
      const { user } = await api('POST', mode, {
        username: form.username.trim(),
        password: form.password,
      })
      onAuthed(user)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img className="sticker auth-sticker" src="./assets/stickers/sleep.png" alt="" />
        <img className="auth-logo" src="./assets/five-balls-logo.png" alt="schedule 五颗球标志" />
        <h1>{mode === 'login' ? '欢迎回来' : '创建你的笔记本'}</h1>
        <p className="auth-sub">
          {mode === 'login'
            ? '登录后继续书写今天的计划与札记。'
            : '注册一个账号，计划和札记会保存在服务器上，换设备也能接着写。'}
        </p>
        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={mode === 'login' ? 'active' : undefined}
            onClick={() => switchMode('login')}
          >
            登录
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            className={mode === 'register' ? 'active' : undefined}
            onClick={() => switchMode('register')}
          >
            注册
          </button>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <label>
            用户名
            <input
              value={form.username}
              onChange={(e) => setField('username', e.target.value)}
              autoComplete="username"
              required
              minLength={2}
              maxLength={32}
              autoFocus
            />
          </label>
          <label>
            密码
            <input
              value={form.password}
              onChange={(e) => setField('password', e.target.value)}
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={mode === 'register' ? 8 : 1}
              maxLength={128}
              placeholder={mode === 'register' ? '至少 8 位' : undefined}
            />
          </label>
          {mode === 'register' && (
            <label>
              确认密码
              <input
                value={form.confirm}
                onChange={(e) => setField('confirm', e.target.value)}
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
              />
            </label>
          )}
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <button className="auth-submit" disabled={busy}>
            {busy ? '请稍候…' : mode === 'login' ? '登录' : '注册并进入'}
          </button>
        </form>
      </div>
    </div>
  )
}
