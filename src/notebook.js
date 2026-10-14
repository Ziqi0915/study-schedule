export const legacyKey = 'study-notebook-v2'

export const localDay = (d) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)

export const today = localDay(new Date())

export function starter() {
  return {
    plans: {
      [today]: [
        { id: 1, time: '08:30', title: '英语听力 30 分钟', note: '通勤时完成一组练习', done: false },
        { id: 2, time: '10:00', title: 'React 组件复习', note: '整理 useState 与 useEffect', done: false },
        { id: 3, time: '19:30', title: '阅读与今日复盘', note: '写下三条今天学到的内容', done: false },
      ],
    },
    journals: { [today]: '今天想把时间留给真正重要的事情。' },
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

export const dayName = (value) =>
  new Date(`${value}T12:00:00`).toLocaleDateString('zh-CN', { weekday: 'short' })

export const dayNumber = (value) => new Date(`${value}T12:00:00`).getDate()

export function weekDates() {
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() + i - 3)
    return localDay(date)
  })
}
