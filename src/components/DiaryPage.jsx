const moods = ['☀️', '🌱', '🌙', '☁️', '✦']

export default function DiaryPage({ book, selected, dateLabel, weekday, updateBook }) {
  const journal = book.journals[selected] || ''
  const mood = book.moods?.[selected] || ''

  function setJournal(value) {
    updateBook((prev) => ({
      ...prev,
      journals: { ...prev.journals, [selected]: value },
    }))
  }

  function setMood(value) {
    updateBook((prev) => ({
      ...prev,
      moods: { ...(prev.moods || {}), [selected]: value },
    }))
  }

  return (
    <div className="page-column diary-page">
      <div className="page-heading">
        <div>
          <span className="date-kicker">写给自己 · {dateLabel}</span>
          <h2>今日札记</h2>
        </div>
        <span className="page-number">02</span>
      </div>
      {/* <div className="diary-rule">
        <span>亲爱的自己：</span>
      </div> */}
      <textarea
        value={journal}
        onChange={(e) => setJournal(e.target.value)}
        placeholder={'今天发生了什么？\n有什么值得记住的事？\n慢慢写就好。'}
      />
      <div className="mood-row">
        <span>今天的心情</span>
        {moods.map((m) => (
          <button
            key={m}
            aria-pressed={mood === m}
            className={mood === m ? 'chosen' : undefined}
            onClick={() => setMood(m)}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="diary-sticker">
        <img className="fruit-sticker" src="./assets/stickers/green-character.png" alt="青苹果贴纸" />
        {/* <span>
          今天也要
          <br />
          <em>好好生活</em>
        </span> */}
      </div>
      <div className="bottom-line">
        写于 {weekday}　♡
      </div>
    </div>
  )
}
