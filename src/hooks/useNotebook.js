import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { DEFAULT_LOCALE, normalizeLocale, t } from '../i18n'
import { legacyKey, legacyNotebook, starter, today } from '../notebook'

export function useNotebook() {
  const [phase, setPhase] = useState('checking')
  const [user, setUser] = useState(null)
  const [notice, setNotice] = useState('')
  const [book, setBook] = useState(() => starter())
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
  const localeRef = useRef(DEFAULT_LOCALE)

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
    localeRef.current = DEFAULT_LOCALE
    setPhase('auth')
  }, [])

  const saveRemote = useCallback(async () => {
    if (savingRef.current) {
      pendingRef.current = true
      return false
    }
    clearTimeout(timerRef.current)
    savingRef.current = true
    const locale = localeRef.current
    setSyncStatus(t(locale, 'syncSaving'))
    try {
      const result = await api('PUT', 'notebook', { book: bookRef.current, revision: revisionRef.current })
      revisionRef.current = result.revision
      dirtyRef.current = false
      setSyncStatus(t(locale, 'syncSaved'))
      return true
    } catch (e) {
      if (e.status === 401) signedOut(t(locale, 'sessionExpired'))
      else if (e.status === 409) {
        const latest = await api('GET', 'notebook').catch(() => null)
        if (latest) {
          revisionRef.current = latest.revision
          dirtyRef.current = false
          replaceBook(latest.book || starter(locale))
        }
        setSyncStatus(t(locale, 'syncConflict'))
      } else {
        setSyncStatus(t(locale, 'syncRetry', e.message))
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
    const locale = normalizeLocale(u?.locale)
    localeRef.current = locale
    setUser({ ...u, locale })
    setNotice('')
    try {
      const result = await api('GET', 'notebook')
      revisionRef.current = result.revision
      const legacy = result.book ? null : legacyNotebook()
      const notebook = result.book || legacy || starter(locale)
      setSelected(today)
      loadingRef.current = true
      bookRef.current = notebook
      setBook(notebook)
      setPhase('app')
      if (result.book) {
        setSyncStatus(t(locale, 'syncSynced'))
        queueMicrotask(() => { loadingRef.current = false })
      } else {
        const saved = await saveRemote()
        if (saved && legacy) localStorage.setItem(legacyKey + '-claimed', '1')
        loadingRef.current = false
      }
    } catch (e) {
      signedOut(e.status === 401 ? t(locale, 'sessionExpired') : e.message)
    }
  }, [saveRemote, signedOut])

  const logout = useCallback(async () => {
    if (dirtyRef.current) await saveRemote()
    await api('POST', 'logout', {}).catch(() => {})
    signedOut('')
    replaceBook(starter())
    revisionRef.current = 0
  }, [replaceBook, saveRemote, signedOut])

  const setLocale = useCallback(async (nextLocale) => {
    const locale = normalizeLocale(nextLocale)
    if (locale === localeRef.current) return
    const previous = localeRef.current
    localeRef.current = locale
    setUser((u) => (u ? { ...u, locale } : u))
    try {
      const { user: saved } = await api('PUT', 'locale', { locale })
      const confirmed = normalizeLocale(saved?.locale)
      localeRef.current = confirmed
      setUser((u) => (u ? { ...u, locale: confirmed } : u))
    } catch (e) {
      localeRef.current = previous
      setUser((u) => (u ? { ...u, locale: previous } : u))
      if (e.status === 401) signedOut(t(previous, 'sessionExpired'))
      else setSyncStatus(t(previous, 'syncRetry', e.message))
    }
  }, [signedOut])

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
    setSyncStatus(t(localeRef.current, 'syncDirty'))
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
    setLocale,
    updateBook,
  }
}
