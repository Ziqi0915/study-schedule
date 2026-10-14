import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { legacyKey, legacyNotebook, starter, today } from '../notebook'

export function useNotebook() {
  const [phase, setPhase] = useState('checking')
  const [user, setUser] = useState(null)
  const [notice, setNotice] = useState('')
  const [book, setBook] = useState(starter)
  const [selected, setSelected] = useState(today)
  const [syncStatus, setSyncStatus] = useState('')

  const revisionRef = useRef(0)
  const timerRef = useRef(null)
  const loadingRef = useRef(true)
  const savingRef = useRef(false)
  const pendingRef = useRef(false)
  const dirtyRef = useRef(false)
  const phaseRef = useRef(phase)
  const bookRef = useRef(book)
  const saveRemoteRef = useRef(null)

  useEffect(() => { phaseRef.current = phase }, [phase])

  const replaceBook = useCallback((next) => {
    loadingRef.current = true
    bookRef.current = next
    setBook(next)
    queueMicrotask(() => { loadingRef.current = false })
  }, [])

  const signedOut = useCallback((message) => {
    clearTimeout(timerRef.current)
    dirtyRef.current = false
    setNotice(message)
    setUser(null)
    setPhase('auth')
  }, [])

  const saveRemote = useCallback(async () => {
    if (savingRef.current) {
      pendingRef.current = true
      return false
    }
    clearTimeout(timerRef.current)
    savingRef.current = true
    setSyncStatus('正在保存…')
    try {
      const result = await api('PUT', 'notebook', { book: bookRef.current, revision: revisionRef.current })
      revisionRef.current = result.revision
      dirtyRef.current = false
      setSyncStatus('已保存')
      return true
    } catch (e) {
      if (e.status === 401) signedOut('登录已过期，请重新登录')
      else if (e.status === 409) {
        const latest = await api('GET', 'notebook').catch(() => null)
        if (latest) {
          revisionRef.current = latest.revision
          dirtyRef.current = false
          replaceBook(latest.book || starter())
        }
        setSyncStatus('笔记已在其他设备上更新，已载入最新内容')
      } else {
        setSyncStatus(e.message + '，稍后自动重试')
        timerRef.current = setTimeout(() => { saveRemoteRef.current?.() }, 5000)
      }
      return false
    } finally {
      savingRef.current = false
      if (pendingRef.current) {
        pendingRef.current = false
        saveRemoteRef.current?.()
      }
    }
  }, [replaceBook, signedOut])

  useEffect(() => { saveRemoteRef.current = saveRemote }, [saveRemote])

  const enter = useCallback(async (u) => {
    setUser(u)
    setNotice('')
    try {
      const result = await api('GET', 'notebook')
      revisionRef.current = result.revision
      const legacy = result.book ? null : legacyNotebook()
      const notebook = result.book || legacy || starter()
      setSelected(today)
      loadingRef.current = true
      bookRef.current = notebook
      setBook(notebook)
      setPhase('app')
      if (result.book) {
        setSyncStatus('已同步')
        queueMicrotask(() => { loadingRef.current = false })
      } else {
        const saved = await saveRemote()
        if (saved && legacy) localStorage.setItem(legacyKey + '-claimed', '1')
        loadingRef.current = false
      }
    } catch (e) {
      signedOut(e.status === 401 ? '登录已过期，请重新登录' : e.message)
    }
  }, [saveRemote, signedOut])

  const logout = useCallback(async () => {
    if (dirtyRef.current) await saveRemote()
    await api('POST', 'logout', {}).catch(() => {})
    signedOut('')
    replaceBook(starter())
    revisionRef.current = 0
  }, [replaceBook, saveRemote, signedOut])

  const updateBook = useCallback((updater) => {
    setBook((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      bookRef.current = next
      return next
    })
  }, [])

  useEffect(() => {
    if (loadingRef.current || phaseRef.current !== 'app') return
    dirtyRef.current = true
    setSyncStatus('有未保存的修改')
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { saveRemoteRef.current?.() }, 600)
  }, [book])

  useEffect(() => {
    const onHide = () => {
      if (dirtyRef.current && !savingRef.current) {
        fetch('/api/notebook', {
          method: 'PUT',
          keepalive: true,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ book: bookRef.current, revision: revisionRef.current }),
        })
      }
    }
    window.addEventListener('pagehide', onHide)
    return () => window.removeEventListener('pagehide', onHide)
  }, [])

  useEffect(() => {
    let cancelled = false
    api('GET', 'me')
      .then((r) => { if (!cancelled) enter(r.user) })
      .catch((e) => { if (!cancelled) signedOut(e.status === 401 ? '' : e.message) })
    return () => { cancelled = true }
  }, [enter, signedOut])

  return {
    phase,
    user,
    notice,
    book,
    selected,
    setSelected,
    syncStatus,
    enter,
    logout,
    updateBook,
  }
}
