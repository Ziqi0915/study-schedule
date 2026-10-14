import AuthScreen from './components/AuthScreen'
import SchedulePage from './components/SchedulePage'
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
    updateBook,
  } = useNotebook()

  if (phase === 'checking') {
    return (
      <div className="auth-page">
        <p className="auth-loading">正在打开笔记本…</p>
      </div>
    )
  }

  if (phase === 'auth') {
    return <AuthScreen notice={notice} onAuthed={enter} />
  }

  return (
    <SchedulePage
      user={user}
      book={book}
      selected={selected}
      setSelected={setSelected}
      syncStatus={syncStatus}
      logout={logout}
      updateBook={updateBook}
    />
  )
}
