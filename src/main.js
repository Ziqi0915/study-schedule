import { createApp, computed, ref, watch } from 'vue/dist/vue.esm-bundler.js'
import './schedule.css'

const storageKey = 'study-notebook-v2'
const localDay = d => new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,10)
const today = localDay(new Date())
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
    const mood = computed({get:()=>book.value.moods?.[selected.value] || '',set:v=>{book.value.moods ||= {};book.value.moods[selected.value]=v}})
    const doneCount = computed(() => tasks.value.filter(task => task.done).length)
    const progress = computed(() => tasks.value.length ? Math.round(doneCount.value / tasks.value.length * 100) : 0)
    const dates = computed(() => Array.from({ length: 7 }, (_, i) => { const date = new Date(); date.setDate(date.getDate() + i - 3); return localDay(date) }))
    const apiUrl = ref('http://localhost:3001')
    const secret = ref('')
    const connected = ref(false)
    const syncStatus = ref('保存在此浏览器')
    const settings = ref(false)
    let revision = 0, timer, loading = false, saving = false, pending = false
    async function request(method, body) {
      const res = await fetch(apiUrl.value.replace(/\/$/, '') + '/api/notebook', {method, headers: {Authorization: 'Bearer '+secret.value, 'Content-Type':'application/json'}, body: body && JSON.stringify(body)})
      if (!res.ok) throw new Error(res.status === 409 ? '其他设备已修改，请重新连接后确认内容' : '连接或保存失败，请检查服务和密钥')
      return res.json()
    }
    async function saveRemote() {
      if (!connected.value) return
      if (saving) {pending=true;return}
      saving=true; syncStatus.value='正在保存…'
      try {const result=await request('PUT',{book:book.value,revision});revision=result.revision;syncStatus.value='已保存到本地后端'}
      catch(e){connected.value=false;syncStatus.value=e.message+'；浏览器草稿已保留'}
      finally{saving=false;if(pending){pending=false;saveRemote()}}
    }
    async function connect() {
      if(saving)return
      clearTimeout(timer);connected.value=false;loading=true
      try {
        const result=await request('GET')
        if(result.book && !confirm('载入后端笔记？当前浏览器内容将另存为备份。'))return
        localStorage.setItem(storageKey+'-backup',JSON.stringify(book.value))
        revision=result.revision
        if(result.book)book.value=result.book
        await Promise.resolve()
        connected.value=true;syncStatus.value='已连接本地后端';settings.value=false
        if(!result.book)await saveRemote()
      }catch(e){syncStatus.value=e.message}
      finally{loading=false}
    }
    watch(book, value => {
      try{localStorage.setItem(storageKey, JSON.stringify(value))}catch{syncStatus.value='浏览器保存失败，请检查存储空间'}
      if(!loading && connected.value){clearTimeout(timer);timer=setTimeout(saveRemote,500)}
    }, { deep: true })
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
    return { mood, apiUrl, secret, connected, syncStatus, settings, connect, selected, showForm, newTask, dateLabel, weekday, tasks, journal, doneCount, progress, dates, dayName, dayNumber, addTask, removeTask, clearDay }
  },
  template: `
  <div class="page">
    <header class="topbar">
      <div class="brand-lockup"><img class="ball-logo" src="./assets/five-balls-logo.png" alt="五颗不同颜色的球形角色整体标志"><div><strong>schedule</strong><small>MY STUDY NOTEBOOK</small></div></div>
      <div class="top-note">把每一天，写成自己的小故事 <span>✦</span></div>
    </header>
    <main>
      <div class="sync-toolbar"><span role="status">{{ syncStatus }}</span><button @click="settings=!settings">连接存储</button><label>翻到这一天 <input type="date" v-model="selected" required aria-label="选择日期"></label></div>
      <form v-if="settings" class="connection-form" @submit.prevent="connect"><label>后端地址<input v-model="apiUrl" type="url" required></label><label>访问密钥<input v-model="secret" type="password" required minlength="24" autocomplete="off"></label><button>连接并载入</button><small>密钥仅用于当前页面连接。后端保存计划和日记，浏览器同时保留草稿。</small></form>
      <section class="intro"><div class="eyebrow">A NOTEBOOK FOR LITTLE PLANS <i></i></div><h1>今天的页角，<em>留给你。</em></h1><p>写下时间表，也写下此刻的心情。每完成一件小事，就为这本笔记添上一颗星。</p><span class="scribble">✎</span><img class="sticker sticker-sleep" src="./assets/stickers/sleep.png" alt="睡觉手绘贴纸"><img class="sticker sticker-heart" src="./assets/stickers/heart.png" alt="爱心对话框贴纸"><img class="sticker sticker-bird" src="./assets/stickers/bird.png" alt="蓝色小鸟贴纸"></section>
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
            <div class="diary-rule"><span>亲爱的自己：</span></div><textarea v-model="journal" placeholder="今天发生了什么？\n有什么值得记住的瞬间？\n慢慢写，不需要完美。"></textarea><div class="mood-row"><span>今天的心情</span><button v-for="m in ['☀️','🌱','🌙','☁️','✦']" :key="m" :aria-pressed="mood===m" :class="{chosen:mood===m}" @click="mood=m">{{m}}</button></div><div class="diary-sticker"><img class="fruit-sticker" src="./assets/stickers/green-character.png" alt="青苹果贴纸"><span>keep going,<br><em>you are doing well.</em></span></div><div class="bottom-line">写于 {{ weekday }}　♡</div>
          </div>
        </div>
      </section>
    </main>
    <footer><span>schedule · ONE NOTEBOOK, EVERY DAY</span><span>留一点空白，也是一种安排 <b>✿</b></span></footer>
  </div>`
}
createApp(app).mount('#app')
