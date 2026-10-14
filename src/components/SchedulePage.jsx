import { LOCALE_OPTIONS, dateLocale, t } from '../i18n'
import DatePicker from './DatePicker'
import DiaryPage from './DiaryPage'
import PlanPage from './PlanPage'

function markedDays(book) {
  const days = new Set()
  for (const [date, list] of Object.entries(book.plans || {})) {
    if (list?.length) days.add(date)
  }
  for (const [date, text] of Object.entries(book.journals || {})) {
    if (String(text || '').trim()) days.add(date)
  }
  for (const [date, mood] of Object.entries(book.moods || {})) {
    if (mood) days.add(date)
  }
  for (const [date, list] of Object.entries(book.stickers || {})) {
    if (list?.length) days.add(date)
  }
  return days
}

export default function SchedulePage({ user, locale, book, selected, setSelected, syncStatus, logout, setLocale, updateBook }) {
  const selectedDate = new Date(`${selected}T12:00:00`)
  const intl = dateLocale(locale)
  const dateLabel = selectedDate.toLocaleDateString(intl, { month: 'long', day: 'numeric' })
  const weekday = selectedDate.toLocaleDateString(intl, { weekday: 'long' })
  const initial = user?.username?.slice(0, 1) || ''

  return (
    <div className="page" data-locale={locale}>
      <header className="topbar">
        <div className="brand-lockup">
          <img
            className="ball-logo"
            src="./assets/five-balls-logo.png"
            alt={t(locale, 'logoAlt')}
          />
          <div>
            <strong>schedule</strong>
            <small>{t(locale, 'brandTag')}</small>
          </div>
        </div>
        <div className="top-right">
          <div className="locale-switch" role="group" aria-label={t(locale, 'language')}>
            {LOCALE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                data-locale={option.id}
                className={locale === option.id ? 'active' : undefined}
                aria-pressed={locale === option.id}
                onClick={() => setLocale(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="user-chip">
            <span className="avatar" aria-hidden="true">
              {initial}
            </span>
            <span className="user-name">{user.username}</span>
            <button className="logout" onClick={logout}>
              {t(locale, 'logout')}
            </button>
          </div>
        </div>
      </header>
      <main>
        <div className="sync-toolbar">
          <span role="status">{syncStatus}</span>
          <div className="jump-day">
            <span>{t(locale, 'jumpToDay')}</span>
            <DatePicker
              locale={locale}
              value={selected}
              onChange={setSelected}
              markedDays={markedDays(book)}
            />
          </div>
        </div>
        <section className="notebook-shell">
          <aside className="book-spine" aria-label={t(locale, 'spineLabel')}>
            <div className="spine-title" aria-hidden="true">
              ✿
            </div>
            <div className="spine-lines" />
            <div className="spine-year">♡</div>
          </aside>
          <div className="notebook-pages page-turn-enter-active" key={selected}>
            <PlanPage
              locale={locale}
              book={book}
              selected={selected}
              setSelected={setSelected}
              dateLabel={dateLabel}
              weekday={weekday}
              updateBook={updateBook}
            />
            <DiaryPage
              locale={locale}
              book={book}
              selected={selected}
              dateLabel={dateLabel}
              weekday={weekday}
              updateBook={updateBook}
            />
          </div>
        </section>
      </main>
      <footer>
        <span>{t(locale, 'footer')}</span>
      </footer>
    </div>
  )
}
