import DiaryPage from './DiaryPage'
import PlanPage from './PlanPage'

export default function SchedulePage({ user, book, selected, setSelected, syncStatus, logout, updateBook }) {
  const selectedDate = new Date(`${selected}T12:00:00`)
  const dateLabel = selectedDate.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
  const weekday = selectedDate.toLocaleDateString('zh-CN', { weekday: 'long' })
  const initial = user?.username?.slice(0, 1) || ''

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand-lockup">
          <img
            className="ball-logo"
            src="./assets/five-balls-logo.png"
            alt="五颗不同颜色的球形角色整体标志"
          />
          <div>
            <strong>schedule</strong>
            <small>计划 · 日记</small>
          </div>
        </div>
        <div className="top-right">
          <div className="top-note">
            慢慢来，也算进步。 <span>✦</span>
          </div>
          <div className="user-chip">
            <span className="avatar" aria-hidden="true">
              {initial}
            </span>
            <span className="user-name">{user.username}</span>
            <button className="logout" onClick={logout}>
              退出登录
            </button>
          </div>
        </div>
      </header>
      <main>
        <div className="sync-toolbar">
          <span role="status">{syncStatus}</span>
          <label>
            翻到这一天{' '}
            <input
              type="date"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              required
              aria-label="选择日期"
            />
          </label>
        </div>
        <section className="intro">
          {/* <div className="eyebrow">
            每天一点点 <i />
          </div>
          <h1>
            今天的页角，<em>留给你。</em>
          </h1>
          <p>记下计划，也留住今天的心情。</p> */}
          <span className="scribble">✎</span>
          <img className="sticker sticker-sleep" src="./assets/stickers/sleep.png" alt="睡觉小贴纸" />
          <img className="sticker sticker-heart" src="./assets/stickers/heart.png" alt="爱心对话框贴纸" />
          <img className="sticker sticker-bird" src="./assets/stickers/bird.png" alt="蓝色小鸟贴纸" />
          <img className="sticker sticker-dance" src="./assets/stickers/dance.png" alt="跳舞小人贴纸" />
          <img
            className="sticker sticker-pink"
            src="./assets/stickers/pink-character.png"
            alt="粉色小角色贴纸"
          />
        </section>
        <section className="notebook-shell">
          <aside className="book-spine" aria-label="笔记本装饰">
            <div className="spine-title" aria-hidden="true">
              ✿
            </div>
            <div className="spine-mark">✳</div>
            <div className="spine-lines" />
            <div className="spine-year">♡</div>
          </aside>
          <div className="notebook-pages page-turn-enter-active" key={selected}>
            <PlanPage
              book={book}
              selected={selected}
              setSelected={setSelected}
              dateLabel={dateLabel}
              weekday={weekday}
              updateBook={updateBook}
            />
            <DiaryPage
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
        <span>schedule · 每天一页</span>
        {/* <span>
          今天也辛苦了 <b>✿</b>
        </span> */}
      </footer>
    </div>
  )
}
