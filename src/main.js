import { createApp, computed, nextTick, ref, watch } from 'vue/dist/vue.esm-bundler.js'
import './schedule.css'

const legacyKey = 'study-notebook-v2'
const localDay = d => new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,10)
const today = localDay(new Date())
const starter = () => ({
  plans: {
    [today]: [
      { id: 1, time: '08:30', title: '英语听力 30 分钟', note: '通勤时完成一组练习', done: false },
      { id: 2, time: '10:00', title: 'Vue 组件复习', note: '整理 computed 与 watch', done: false },
      { id: 3, time: '19:30', title: '阅读与今日复盘', note: '写下三条今天学到的内容', done: false }
    ]
  },
  journals: { [today]: '今天想把时间留给真正重要的事情。' }
})
function legacyNotebook() {
  if (localStorage.getItem(legacyKey + '-claimed')) return null
  try { const data = JSON.parse(localStorage.getItem(legacyKey)); return data?.plans && data?.journals ? data : null } catch { return null }
}

async function api(method, path, body) {
  let res
  try { res = await fetch('/api/' + path, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body && JSON.stringify(body) }) }
  catch { throw Object.assign(new Error('无法连接服务器，请确认后端已启动'), { status: 0 }) }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.error || (res.status >= 500 ? '无法连接服务器，请确认后端已启动' : '请求失败')), { status: res.status })
  return data
}

const AuthScreen = {
  props: { notice: String },
  emits: ['authed'],
  setup(props, { emit }) {
    const mode = ref('login')
    const form = ref({ username: '', password: '', confirm: '' })
    const error = ref(props.notice || '')
    const busy = ref(false)
    function switchMode(next) { mode.value = next; error.value = ''; form.value.password = ''; form.value.confirm = '' }
    async function submit() {
      error.value = ''
      if (mode.value === 'register' && form.value.password !== form.value.confirm) { error.value = '两次输入的密码不一致'; return }
      busy.value = true
      try { const { user } = await api('POST', mode.value, { username: form.value.username.trim(), password: form.value.password }); emit('authed', user) }
      catch (e) { error.value = e.message }
      finally { busy.value = false }
    }
    return { mode, form, error, busy, switchMode, submit }
  },
  template: `
  <div class="auth-page">
    <div class="auth-card">
      <img class="sticker auth-sticker" src="./assets/stickers/sleep.png" alt="">
      <img class="auth-logo" src="./assets/five-balls-logo.png" alt="schedule 五颗球标志">
      <h1>{{ mode === 'login' ? '欢迎回来' : '创建你的笔记本' }}</h1>
      <p class="auth-sub">{{ mode === 'login' ? '登录后继续书写今天的计划与札记。' : '注册一个账号，计划和札记会保存在服务器上，换设备也能接着写。' }}</p>
      <div class="auth-tabs" role="tablist"><button type="button" role="tab" :aria-selected="mode === 'login'" :class="{ active: mode === 'login' }" @click="switchMode('login')">登录</button><button type="button" role="tab" :aria-selected="mode === 'register'" :class="{ active: mode === 'register' }" @click="switchMode('register')">注册</button></div>
      <form class="auth-form" @submit.prevent="submit">
        <label>用户名<input v-model="form.username" autocomplete="username" required minlength="2" maxlength="32" autofocus></label>
        <label>密码<input v-model="form.password" type="password" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" required :minlength="mode === 'register' ? 8 : 1" maxlength="128" :placeholder="mode === 'register' ? '至少 8 位' : ''"></label>
        <label v-if="mode === 'register'">确认密码<input v-model="form.confirm" type="password" autocomplete="new-password" required minlength="8" maxlength="128"></label>
        <p v-if="error" class="auth-error" role="alert">{{ error }}</p>
        <button class="auth-submit" :disabled="busy">{{ busy ? '请稍候…' : (mode === 'login' ? '登录' : '注册并进入') }}</button>
      </form>
    </div>
  </div>`
}

const app = {
  components: { AuthScreen },
  setup() {
    const phase = ref('checking')
    const user = ref(null)
    const notice = ref('')
    const book = ref(starter())
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
    const initial = computed(() => user.value?.username.slice(0, 1) || '')
    const syncStatus = ref('')
    let revision = 0, timer, loading = true, saving = false, pending = false, dirty = false

    async function replaceBook(next) {
      loading = true
      book.value = next
      await nextTick()
      loading = false
    }
    function signedOut(message) {
      clearTimeout(timer)
      dirty = false
      notice.value = message
      user.value = null
      phase.value = 'auth'
    }
    async function enter(u) {
      user.value = u
      notice.value = ''
      try {
        const result = await api('GET', 'notebook')
        revision = result.revision
        const legacy = result.book ? null : legacyNotebook()
        selected.value = today
        phase.value = 'app'
        await replaceBook(result.book || legacy || starter())
        if (result.book) syncStatus.value = '已同步'
        else if (await saveRemote() && legacy) localStorage.setItem(legacyKey + '-claimed', '1')
      } catch (e) {
        signedOut(e.status === 401 ? '登录已过期，请重新登录' : e.message)
      }
    }
    async function saveRemote() {
      if (saving) { pending = true; return false }
      clearTimeout(timer)
      saving = true
      syncStatus.value = '正在保存…'
      try {
        const result = await api('PUT', 'notebook', { book: book.value, revision })
        revision = result.revision
        dirty = false
        syncStatus.value = '已保存'
        return true
      } catch (e) {
        if (e.status === 401) signedOut('登录已过期，请重新登录')
        else if (e.status === 409) {
          const latest = await api('GET', 'notebook').catch(() => null)
          if (latest) { revision = latest.revision; dirty = false; await replaceBook(latest.book || starter()) }
          syncStatus.value = '笔记已在其他设备上更新，已载入最新内容'
        } else {
          syncStatus.value = e.message + '，稍后自动重试'
          timer = setTimeout(saveRemote, 5000)
        }
        return false
      } finally {
        saving = false
        if (pending) { pending = false; saveRemote() }
      }
    }
    watch(book, () => {
      if (loading || phase.value !== 'app') return
      dirty = true
      syncStatus.value = '有未保存的修改'
      clearTimeout(timer)
      timer = setTimeout(saveRemote, 600)
    }, { deep: true })
    window.addEventListener('pagehide', () => {
      if (dirty && !saving) fetch('/api/notebook', { method: 'PUT', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ book: book.value, revision }) })
    })
    async function logout() {
      if (dirty) await saveRemote()
      await api('POST', 'logout', {}).catch(() => {})
      signedOut('')
      await replaceBook(starter())
      revision = 0
    }
    api('GET', 'me').then(r => enter(r.user)).catch(e => signedOut(e.status === 401 ? '' : e.message))

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
    return { phase, user, notice, initial, enter, logout, mood, syncStatus, selected, showForm, newTask, dateLabel, weekday, tasks, journal, doneCount, progress, dates, dayName, dayNumber, addTask, removeTask, clearDay }
  },
  template: `
  <div v-if="phase === 'checking'" class="auth-page"><p class="auth-loading">正在打开笔记本…</p></div>
  <auth-screen v-else-if="phase === 'auth'" :notice="notice" @authed="enter"></auth-screen>
  <div v-else class="page">
    <header class="topbar">
      <div class="brand-lockup"><img class="ball-logo" src="./assets/five-balls-logo.png" alt="五颗不同颜色的球形角色整体标志"><div><strong>schedule</strong><small>计划 · 日记</small></div></div>
      <div class="top-right"><div class="top-note">慢慢来，也算进步。 <span>✦</span></div><div class="user-chip"><span class="avatar" aria-hidden="true">{{ initial }}</span><span class="user-name">{{ user.username }}</span><button class="logout" @click="logout">退出登录</button></div></div>
    </header>
    <main>
      <div class="sync-toolbar"><span role="status">{{ syncStatus }}</span><label>翻到这一天 <input type="date" v-model="selected" required aria-label="选择日期"></label></div>
      <section class="intro"><div class="eyebrow">每天一点点 <i></i></div><h1>今天的页角，<em>留给你。</em></h1><p>记下计划，也留住今天的心情。</p><span class="scribble">✎</span><img class="sticker sticker-sleep" src="./assets/stickers/sleep.png" alt="睡觉小贴纸"><img class="sticker sticker-heart" src="./assets/stickers/heart.png" alt="爱心对话框贴纸"><img class="sticker sticker-bird" src="./assets/stickers/bird.png" alt="蓝色小鸟贴纸"><img class="sticker sticker-dance" src="./assets/stickers/dance.png" alt="跳舞小人贴纸"><img class="sticker sticker-pink" src="./assets/stickers/pink-character.png" alt="粉色小角色贴纸"></section>
      <section class="notebook-shell">
        <aside class="book-spine" aria-label="笔记本装饰"><div class="spine-title" aria-hidden="true">✿</div><div class="spine-mark">✳</div><div class="spine-lines"></div><div class="spine-year">♡</div></aside>
        <Transition name="page-turn" mode="out-in"><div class="notebook-pages" :key="selected">
          <div class="page-column plan-page">
            <div class="page-heading"><div><span class="date-kicker">{{ weekday }} · {{ dateLabel }}</span><h2>今日计划</h2></div><button class="clear" @click="clearDay">清除</button></div>
            <div class="week-tabs"><button v-for="date in dates" :key="date" :class="{active: selected === date}" @click="selected = date"><span>{{ dayName(date) }}</span><b>{{ dayNumber(date) }}</b></button></div>
            <div class="progress-line"><span>今天完成了 {{ doneCount }} / {{ tasks.length }} 件小事</span><b>{{ progress }}%</b><i><em :style="{ width: progress + '%' }"></em></i></div>
            <div class="plans"><div v-if="!tasks.length" class="empty">这一页还很空，写下一个小目标吧。</div><article v-for="task in tasks" :key="task.id" class="plan-row" :class="{done: task.done}"><button class="check" @click="task.done = !task.done">{{ task.done ? '✓' : '' }}</button><time>{{ task.time }}</time><div><h3>{{ task.title }}</h3><p>{{ task.note }}</p></div><button class="remove" @click="removeTask(task.id)">×</button></article></div>
            <button class="add-plan" @click="showForm = !showForm">＋ 添加一个时间段</button>
            <div v-if="showForm" class="task-form"><input v-model="newTask.time" type="time"><input v-model="newTask.title" placeholder="要完成什么？" @keyup.enter="addTask"><input v-model="newTask.note" placeholder="给自己的一句提示（可选）" @keyup.enter="addTask"><button @click="addTask">写进计划</button></div>
            <div class="page-doodle">✦　✧　✦<small>今天也加油</small></div>
          </div>
          <div class="page-column diary-page">
            <div class="page-heading"><div><span class="date-kicker">写给自己 · {{ dateLabel }}</span><h2>今日札记</h2></div><span class="page-number">02</span></div>
            <div class="diary-rule"><span>亲爱的自己：</span></div><textarea v-model="journal" placeholder="今天发生了什么？\n有什么值得记住的事？\n慢慢写就好。"></textarea><div class="mood-row"><span>今天的心情</span><button v-for="m in ['☀️','🌱','🌙','☁️','✦']" :key="m" :aria-pressed="mood===m" :class="{chosen:mood===m}" @click="mood=m">{{m}}</button></div><div class="diary-sticker"><img class="fruit-sticker" src="./assets/stickers/green-character.png" alt="青苹果贴纸"><span>今天也要<br><em>好好生活</em></span></div><div class="bottom-line">写于 {{ weekday }}　♡</div>
          </div>
        </div></Transition>
      </section>
    </main>
    <footer><span>schedule · 每天一页</span><span>今天也辛苦了 <b>✿</b></span></footer>
  </div>`
}
createApp(app).mount('#app')
