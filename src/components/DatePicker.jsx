import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { dateLocale, t } from '../i18n'
import { localDay, today } from '../notebook'

function weekStartsOn(locale) {
  return locale === 'en' ? 0 : 1
}

function buildCells(year, month, weekStart) {
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const lead = (first.getDay() - weekStart + 7) % 7
  const cells = []
  for (let i = 0; i < lead; i += 1) cells.push(null)
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(localDay(new Date(year, month, day)))
  }
  while (cells.length % 7) cells.push(null)
  return cells
}

function weekdayLabels(locale, weekStart) {
  const intl = dateLocale(locale)
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(2024, 0, 7 + ((weekStart + i) % 7))
    return date.toLocaleDateString(intl, { weekday: 'narrow' })
  })
}

export default function DatePicker({ locale, value, onChange, markedDays }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const dialogId = useId()
  const selected = new Date(`${value}T12:00:00`)
  const [cursor, setCursor] = useState({ year: selected.getFullYear(), month: selected.getMonth() })
  const weekStart = weekStartsOn(locale)

  useEffect(() => {
    if (!open) return undefined
    const current = new Date(`${value}T12:00:00`)
    setCursor({ year: current.getFullYear(), month: current.getMonth() })
    function onPointer(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    function onKey(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, value])

  const cells = useMemo(
    () => buildCells(cursor.year, cursor.month, weekStart),
    [cursor.year, cursor.month, weekStart],
  )
  const labels = useMemo(() => weekdayLabels(locale, weekStart), [locale, weekStart])
  const title = new Date(cursor.year, cursor.month, 1).toLocaleDateString(dateLocale(locale), {
    year: 'numeric',
    month: 'long',
  })
  const triggerLabel = selected.toLocaleDateString(dateLocale(locale), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  function shiftMonth(delta) {
    setCursor((current) => {
      const next = new Date(current.year, current.month + delta, 1)
      return { year: next.getFullYear(), month: next.getMonth() }
    })
  }

  function choose(day) {
    onChange(day)
    setOpen(false)
  }

  return (
    <div className="date-picker" ref={rootRef}>
      <button
        type="button"
        className="date-picker-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
        aria-label={t(locale, 'pickDate')}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="date-picker-glyph" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <rect x="3.5" y="5" width="17" height="15.5" rx="3" stroke="currentColor" strokeWidth="1.8" />
            <path d="M3.5 10h17M8 3.5v4M16 3.5v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <span>{triggerLabel}</span>
      </button>
      {open && (
        <div className="date-picker-popover" id={dialogId} role="dialog" aria-label={t(locale, 'pickDate')}>
          <header className="date-picker-nav">
            <button type="button" aria-label={t(locale, 'prevMonth')} onClick={() => shiftMonth(-1)}>
              ‹
            </button>
            <strong>{title}</strong>
            <button type="button" aria-label={t(locale, 'nextMonth')} onClick={() => shiftMonth(1)}>
              ›
            </button>
          </header>
          <div className="date-picker-weekdays">
            {labels.map((label, index) => (
              <span key={index}>{label}</span>
            ))}
          </div>
          <div className="date-picker-grid">
            {cells.map((day, index) => (
              day ? (
                <button
                  key={day}
                  type="button"
                  className={[
                    value === day ? 'selected' : '',
                    day === today ? 'today' : '',
                    markedDays?.has(day) ? 'marked' : '',
                  ].filter(Boolean).join(' ') || undefined}
                  onClick={() => choose(day)}
                >
                  {Number(day.slice(8))}
                </button>
              ) : <span key={`empty-${index}`} />
            ))}
          </div>
          <button type="button" className="date-picker-today" onClick={() => choose(today)}>
            {t(locale, 'today')}
          </button>
        </div>
      )}
    </div>
  )
}
