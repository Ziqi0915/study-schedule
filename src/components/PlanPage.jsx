import { useState } from 'react'
import { dayName, dayNumber, weekDates } from '../notebook'

export default function PlanPage({ book, selected, setSelected, dateLabel, weekday, updateBook }) {
  const [showForm, setShowForm] = useState(false)
  const [newTask, setNewTask] = useState({ time: '09:00', title: '', note: '' })

  const tasks = (book.plans[selected] || []).slice().sort((a, b) => a.time.localeCompare(b.time))
  const doneCount = tasks.filter((task) => task.done).length
  const progress = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0
  const dates = weekDates()

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
    if (confirm('清除今天的全部学习计划？')) {
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
          <h2>今日计划</h2>
        </div>
        <button className="clear" onClick={clearDay}>
          清除
        </button>
      </div>
      <div className="week-tabs">
        {dates.map((date) => (
          <button
            key={date}
            className={selected === date ? 'active' : undefined}
            onClick={() => setSelected(date)}
          >
            <span>{dayName(date)}</span>
            <b>{dayNumber(date)}</b>
          </button>
        ))}
      </div>
      <div className="progress-line">
        <span>
          今天完成了 {doneCount} / {tasks.length} 件小事
        </span>
        <b>{progress}%</b>
        <i>
          <em style={{ width: progress + '%' }} />
        </i>
      </div>
      <div className="plans">
        {!tasks.length && <div className="empty">这一页还很空，写下一个小目标吧。</div>}
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
        ＋ 添加一个时间段
      </button>
      {showForm && (
        <div className="task-form">
          <input
            type="time"
            value={newTask.time}
            onChange={(e) => setNewTask((t) => ({ ...t, time: e.target.value }))}
          />
          <input
            value={newTask.title}
            onChange={(e) => setNewTask((t) => ({ ...t, title: e.target.value }))}
            placeholder="要完成什么？"
            onKeyUp={(e) => e.key === 'Enter' && addTask()}
          />
          <input
            value={newTask.note}
            onChange={(e) => setNewTask((t) => ({ ...t, note: e.target.value }))}
            placeholder="给自己的一句提示（可选）"
            onKeyUp={(e) => e.key === 'Enter' && addTask()}
          />
          <button onClick={addTask}>写进计划</button>
        </div>
      )}
      <div className="page-doodle">
        ✦　✧　✦<small>今天也加油</small>
      </div>
    </div>
  )
}
