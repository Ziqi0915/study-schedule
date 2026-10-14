import { DEFAULT_LOCALE, dateLocale, messagesFor, normalizeLocale } from './i18n'

export const legacyKey = 'study-notebook-v2'

export const localDay = (d) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)

export const today = localDay(new Date())

export function starter(locale = DEFAULT_LOCALE) {
  const copy = messagesFor(locale)
  return {
    plans: {
      [today]: copy.starterPlans.map((task, index) => ({
        id: index + 1,
        ...task,
        done: false,
      })),
    },
    journals: { [today]: copy.starterJournal },
    moods: {},
    stickers: {},
  }
}

export function legacyNotebook() {
  if (localStorage.getItem(legacyKey + '-claimed')) return null
  try {
    const data = JSON.parse(localStorage.getItem(legacyKey))
    return data?.plans && data?.journals ? data : null
  } catch {
    return null
  }
}

export const dayName = (value, locale = DEFAULT_LOCALE) =>
  new Date(`${value}T12:00:00`).toLocaleDateString(dateLocale(normalizeLocale(locale)), { weekday: 'short' })

export const dayNumber = (value) => new Date(`${value}T12:00:00`).getDate()

export function weekDates() {
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() + i - 3)
    return localDay(date)
  })
}
