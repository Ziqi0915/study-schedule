import { createApp, computed, ref, watch } from 'vue'
import './schedule.css'

const storageKey = 'study-notebook-v2'
const today = new Date().toISOString().slice(0, 10)
const starter = {
  plans: {
    [today]: [
      { id: 1, time: '08:30', title: '英语听力 30 分钟', note: '通勤时完成一组练习', done: false },
      { id: 2, time: '10:00', title: 'Vue 组件复习', note: '整理 computed 与 watch', done: false },
      { id: 3, time: '19:30', title: '阅读与今日复盘', note: '写下三条今天学到的内容', done: false }
    ]
  },
  journals: { [today]: '今天想把时间留给真正重要的事情。' }
}
function load() { try { return JSON.parse(localStorage.getItem(storageKey)) || starter } catch { return starter } }

const app = {
  setup() {
    const book = ref(load())
    const selected = ref(today)
    const showForm = ref(false)
    const newTask = ref({ time: '09:00', title: '', note: '' })
    const selectedDate = computed(() => new Date(`${selected.value}T12:00:00`))
    const dateLabel = computed(() => selectedDate.value.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' }))
    const weekday = computed(() => selectedDate.value.toLocaleDateString('zh-CN', { weekday: 'long' }))
    const tasks = computed(() => (book.value.plans[selected.value] || []).slice().sort((a, b) => a.time.localeCompare(b.time)))
    const journal = computed({ get: () => book.value.journals[selected.value] || '', set: value => { book.value.journals[selected.value] = value } })
    const doneCount = computed(() => tasks.value.filter(task => task.done).length)
    const progress = computed(() => tasks.value.length ? Math.round(doneCount.value / tasks.value.length * 100) : 0)
    const dates = computed(() => Array.from({ length: 7 }, (_, i) => { const date = new Date(); date.setDate(date.getDate() + i - 3); return date.toISOString().slice(0, 10) }))
    watch(book, value => localStorage.setItem(storageKey, JSON.stringify(value)), { deep: true })
    const dayName = value => new Date(`${value}T12:00:00`).toLocaleDateString('zh-CN', { weekday: 'short' })
    const dayNumber = value => new Date(`${value}T12:00:00`).getDate()
    function addTask() {
      if (!newTask.value.title.trim()) return
      if (!book.value.plans[selected.value]) book.value.plans[selected.value] = []
      book.value.plans[selected.value].push({ id: Date.now(), ...newTask.value, title: newTask.value.title.trim(), done: false })
      newTask.value = { time: '09:00', title: '', note: '' }
      showForm.value = false
    }
    function removeTask(id) { book.value.plans[selected.value] = (book.value.plans[selected.value] || []).filter(task => task.id !== id) }
    function clearDay() { if (confirm('清除今天的全部学习计划？')) book.value.plans[selected.value] = [] }
    return { selected, showForm, newTask, dateLabel, weekday, tasks, journal, doneCount, progress, dates, dayName, dayNumber, addTask, removeTask, clearDay }
  },
  template: `
  <div class="page">
    <header class="topbar">
      <div class="brand-lockup"><div class="ball-set" aria-label="五颗球是一套整体标志"><i class="ball yellow"><b></b><em></em></i><i class="ball pink"><b></b><em></em></i><i class="ball orange"><b></b><em></em></i><i class="ball blue"><b></b><em></em></i><i class="ball green"><b></b><em></em></i></div><div><strong>schedule</strong><small>MY STUDY NOTEBOOK</small></div></div>
      <div class="top-note">把每一天，写成自己的小故事 <span>✦</span></div>
    </header>
    <main>
      <section class="intro"><div class="eyebrow">A NOTEBOOK FOR LITTLE PLANS <i></i></div><h1>今天的页角，<em>留给你。</em></h1><p>写下时间表，也写下此刻的心情。每完成一件小事，就为这本笔记添上一颗星。</p><span class="scribble">✎</span></section>
      <section class="notebook-shell">
        <aside class="book-spine"><div class="spine-title">MY<br>DAILY<br>NOTE</div><div class="spine-mark">✳</div><div class="spine-lines"></div><div class="spine-year">2026</div></aside>
        <div class="notebook-pages">
          <div class="page-column plan-page">
            <div class="page-heading"><div><span class="date-kicker">{{ weekday }} · {{ dateLabel }}</span><h2>今日计划</h2></div><button class="clear" @click="clearDay">清除</button></div>
            <div class="week-tabs"><button v-for="date in dates" :key="date" :class="{active: selected === date}" @click="selected = date"><span>{{ dayName(date) }}</span><b>{{ dayNumber(date) }}</b></button></div>
            <div class="progress-line"><span>今天完成了 {{ doneCount }} / {{ tasks.length }} 件小事</span><b>{{ progress }}%</b><i><em :style="{ width: progress + '%' }"></em></i></div>
            <div class="plans"><div v-if="!tasks.length" class="empty">这一页还很空，写下一个小目标吧。</div><article v-for="task in tasks" :key="task.id" class="plan-row" :class="{done: task.done}"><button class="check" @click="task.done = !task.done">{{ task.done ? '✓' : '' }}</button><time>{{ task.time }}</time><div><h3>{{ task.title }}</h3><p>{{ task.note }}</p></div><button class="remove" @click="removeTask(task.id)">×</button></article></div>
            <button class="add-plan" @click="showForm = !showForm">＋ 添加一个时间段</button>
            <div v-if="showForm" class="task-form"><input v-model="newTask.time" type="time"><input v-model="newTask.title" placeholder="要完成什么？" @keyup.enter="addTask"><input v-model="newTask.note" placeholder="给自己的一句提示（可选）" @keyup.enter="addTask"><button @click="addTask">写进计划</button></div>
            <div class="page-doodle">✦　✧　✦<small>one page at a time</small></div>
          </div>
          <div class="page-column diary-page">
            <div class="page-heading"><div><span class="date-kicker">DEAR DIARY · {{ dateLabel }}</span><h2>今日札记</h2></div><span class="page-number">02</span></div>
            <div class="diary-rule"><span>亲爱的自己：</span></div><textarea v-model="journal" placeholder="今天发生了什么？\n有什么值得记住的瞬间？\n慢慢写，不需要完美。"></textarea><div class="mood-row"><span>今天的心情</span><button>☀️</button><button>🌱</button><button>🌙</button><button>☁️</button><button>✦</button></div><div class="diary-sticker"><div class="sticker-ball pink"><b></b></div><span>keep going,<br><em>you are doing well.</em></span></div><div class="bottom-line">写于 {{ weekday }}　♡</div>
          </div>
        </div>
      </section>
    </main>
    <footer><span>schedule · ONE NOTEBOOK, EVERY DAY</span><span>留一点空白，也是一种安排 <b>✿</b></span></footer>
  </div>`
}
createApp(app).mount('#app')
