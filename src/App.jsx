import { useEffect } from 'react'
import AuthScreen from './components/AuthScreen'
import SchedulePage from './components/SchedulePage'
import { DEFAULT_LOCALE, normalizeLocale, t } from './i18n'
import { useNotebook } from './hooks/useNotebook'

export default function App() {
  const {
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
  } = useNotebook()

  const locale = normalizeLocale(user?.locale || DEFAULT_LOCALE)

  useEffect(() => {
    const active = phase === 'app' ? locale : DEFAULT_LOCALE
    document.documentElement.lang = active === 'zh-Hant' ? 'zh-Hant' : active === 'en' ? 'en' : 'zh-Hans'
    document.documentElement.dataset.locale = active
  }, [phase, locale])

  if (phase === 'checking') {
    return (
      <div className="auth-page">
        <p className="auth-loading">{t(DEFAULT_LOCALE, 'opening')}</p>
      </div>
    )
  }

  if (phase === 'auth') {
    return <AuthScreen notice={notice} onAuthed={enter} />
  }

  return (
    <SchedulePage
      user={user}
      locale={locale}
      book={book}
      selected={selected}
      setSelected={setSelected}
      syncStatus={syncStatus}
      logout={logout}
      setLocale={setLocale}
      updateBook={updateBook}
    />
  )
}
