import { useState } from 'react'
import { t } from '../i18n'
import { dayName, dayNumber, today, weekDates } from '../notebook'

export default function PlanPage({ locale, book, selected, setSelected, dateLabel, weekday, updateBook }) {
  const [showForm, setShowForm] = useState(false)
  const [newTask, setNewTask] = useState({ time: '09:00', title: '', note: '' })

  const tasks = (book.plans[selected] || []).slice().sort((a, b) => a.time.localeCompare(b.time))
  const doneCount = tasks.filter((task) => task.done).length
  const progress = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0
  const dates = weekDates(selected)

  function addTask() {
    if (!newTask.title.trim()) return
    updateBook((prev) => {
      const plans = { ...prev.plans }
      const day = [...(plans[selected] || [])]
      day.push({ id: Date.now(), ...newTask, title: newTask.title.trim(), done: false })
      plans[selected] = day
      return { ...prev, plans }
    })
    setNewTask({ time: '09:00', title: '', note: '' })
    setShowForm(false)
  }

  function removeTask(id) {
    updateBook((prev) => ({
      ...prev,
      plans: {
        ...prev.plans,
        [selected]: (prev.plans[selected] || []).filter((task) => task.id !== id),
      },
    }))
  }

  function clearDay() {
    if (confirm(t(locale, 'clearConfirm'))) {
      updateBook((prev) => ({ ...prev, plans: { ...prev.plans, [selected]: [] } }))
    }
  }

  function toggleDone(id) {
    updateBook((prev) => ({
      ...prev,
      plans: {
        ...prev.plans,
        [selected]: (prev.plans[selected] || []).map((task) =>
          task.id === id ? { ...task, done: !task.done } : task,
        ),
      },
    }))
  }

  return (
    <div className="page-column plan-page">
      <div className="page-heading">
        <div>
          <span className="date-kicker">
            {weekday} · {dateLabel}
          </span>
          <h2>{t(locale, 'planTitle')}</h2>
        </div>
        <button className="clear" onClick={clearDay}>
          {t(locale, 'clear')}
        </button>
      </div>
      <div className="week-tabs">
        {dates.map((date) => (
          <button
            key={date}
            className={[selected === date ? 'active' : '', date === today ? 'is-today' : ''].filter(Boolean).join(' ') || undefined}
            onClick={() => setSelected(date)}
          >
            <span>{dayName(date, locale)}</span>
            <b>{dayNumber(date)}</b>
          </button>
        ))}
      </div>
      <div className="progress-line">
        <span>
          {t(locale, 'progress', doneCount, tasks.length)}
        </span>
        <b>{progress}%</b>
        <i>
          <em style={{ width: progress + '%' }} />
        </i>
      </div>
      <div className="plans">
        {!tasks.length && <div className="empty">{t(locale, 'emptyPlans')}</div>}
        {tasks.map((task) => (
          <article key={task.id} className={`plan-row${task.done ? ' done' : ''}`}>
            <button className="check" onClick={() => toggleDone(task.id)}>
              {task.done ? '✓' : ''}
            </button>
            <time>{task.time}</time>
            <div>
              <h3>{task.title}</h3>
              <p>{task.note}</p>
            </div>
            <button className="remove" onClick={() => removeTask(task.id)}>
              ×
            </button>
          </article>
        ))}
      </div>
      <button className="add-plan" onClick={() => setShowForm((v) => !v)}>
        {t(locale, 'addSlot')}
      </button>
      {showForm && (
        <div className="task-form">
          <input
            type="time"
            value={newTask.time}
            onChange={(e) => setNewTask((t0) => ({ ...t0, time: e.target.value }))}
          />
          <input
            value={newTask.title}
            onChange={(e) => setNewTask((t0) => ({ ...t0, title: e.target.value }))}
            placeholder={t(locale, 'taskWhat')}
            onKeyUp={(e) => e.key === 'Enter' && addTask()}
          />
          <input
            value={newTask.note}
            onChange={(e) => setNewTask((t0) => ({ ...t0, note: e.target.value }))}
            placeholder={t(locale, 'taskHint')}
            onKeyUp={(e) => e.key === 'Enter' && addTask()}
          />
          <button onClick={addTask}>{t(locale, 'savePlan')}</button>
        </div>
      )}
    </div>
  )
}
