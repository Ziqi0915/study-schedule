import { useRef, useState } from 'react'
import StickerPicker from './StickerPicker'
import { STICKER_BY_ID } from '../stickerCatalog'

const moods = ['☀️', '🌱', '🌙', '☁️', '✦']
const stickerLimit = 30

function makeId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function nextPosition(count) {
  const points = [
    [18, 22], [42, 22], [66, 22], [84, 22],
    [18, 53], [42, 53], [66, 53], [84, 53],
    [18, 82], [42, 82], [66, 82], [84, 82],
  ]
  const [x, y] = points[count % points.length]
  const cycle = Math.floor(count / points.length)
  return { x: Math.min(88, Math.max(12, x + (cycle % 3) * 2)), y: Math.min(88, Math.max(12, y - (cycle % 2) * 3)) }
}

export default function DiaryPage({ book, selected, dateLabel, weekday, updateBook }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [dragPreview, setDragPreview] = useState(null)
  const boardRef = useRef(null)
  const dragRef = useRef(null)
  const journal = book.journals[selected] || ''
  const mood = book.moods?.[selected] || ''
  const stickers = book.stickers?.[selected] || []

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

  function chooseSticker(sticker) {
    if (stickers.length >= stickerLimit) return
    const position = nextPosition(stickers.length)
    updateBook((prev) => ({
      ...prev,
      stickers: {
        ...(prev.stickers || {}),
        [selected]: [
          ...(prev.stickers?.[selected] || []),
          { id: makeId(), key: sticker.id, ...position, size: 18, rotation: (stickers.length % 5 - 2) * 3 },
        ],
      },
    }))
    setPickerOpen(false)
  }

  function removeSticker(id) {
    updateBook((prev) => ({
      ...prev,
      stickers: {
        ...(prev.stickers || {}),
        [selected]: (prev.stickers?.[selected] || []).filter((sticker) => sticker.id !== id),
      },
    }))
  }

  function moveSticker(event, sticker) {
    const drag = dragRef.current
    const board = boardRef.current
    if (!drag || drag.id !== sticker.id || drag.pointerId !== event.pointerId || !board) return
    const bounds = board.getBoundingClientRect()
    const x = drag.x + ((event.clientX - drag.pointerX) / bounds.width) * 100
    const y = drag.y + ((event.clientY - drag.pointerY) / bounds.height) * 100
    drag.preview = { x: Math.min(92, Math.max(8, x)), y: Math.min(92, Math.max(8, y)) }
    setDragPreview({ id: sticker.id, ...drag.preview })
  }

  function finishMove(event, sticker) {
    const drag = dragRef.current
    if (!drag || drag.id !== sticker.id || drag.pointerId !== event.pointerId) return
    const finalPosition = drag.preview
    if (finalPosition) {
      updateBook((prev) => ({
        ...prev,
        stickers: {
          ...(prev.stickers || {}),
          [selected]: (prev.stickers?.[selected] || []).map((item) => item.id === sticker.id
            ? { ...item, x: finalPosition.x, y: finalPosition.y }
            : item),
        },
      }))
    }
    dragRef.current = null
    setDragPreview(null)
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

      <div className="sticker-section-heading">
        <span>今日贴纸 <small>{stickers.length}/{stickerLimit}</small></span>
        <button type="button" className="add-sticker" onClick={() => setPickerOpen(true)} disabled={stickers.length >= stickerLimit}>
          ＋ 选贴纸
        </button>
      </div>
      <div className="sticker-board" ref={boardRef} aria-label="日记贴纸区域">
        {stickers.length === 0 && (
          <div className="sticker-board-empty">
            <span>✿</span>
            <p>挑几张喜欢的贴纸，留住今天</p>
          </div>
        )}
        {stickers.map((sticker) => {
          const image = STICKER_BY_ID[sticker.key]
          if (!image) return null
          const position = dragPreview?.id === sticker.id ? dragPreview : sticker
          return (
            <div
              key={sticker.id}
              className="placed-sticker"
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                width: `${sticker.size}%`,
                transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg)`,
              }}
              onPointerDown={(event) => {
                if (event.button !== 0) return
                event.preventDefault()
                event.currentTarget.setPointerCapture(event.pointerId)
                dragRef.current = {
                  id: sticker.id,
                  pointerId: event.pointerId,
                  x: sticker.x,
                  y: sticker.y,
                  pointerX: event.clientX,
                  pointerY: event.clientY,
                  preview: null,
                }
              }}
              onPointerMove={(event) => moveSticker(event, sticker)}
              onPointerUp={(event) => finishMove(event, sticker)}
              onPointerCancel={(event) => finishMove(event, sticker)}
              title={`${image.title}，按住拖动`}
            >
              <img src={image.src} alt={image.title} draggable="false" />
              <button
                type="button"
                className="placed-sticker-remove"
                aria-label={`移除${image.title}贴纸`}
                title="移除贴纸"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => removeSticker(sticker.id)}
              >×</button>
            </div>
          )
        })}
      </div>

      <label className="journal-label" htmlFor="daily-journal">今天想记下什么？</label>
      <textarea
        id="daily-journal"
        value={journal}
        onChange={(e) => setJournal(e.target.value)}
        placeholder={'写下今天的小事、心情，或者想留给自己的话。'}
      />
      <div className="mood-row">
        <span>今天的心情</span>
        {moods.map((m) => (
          <button
            type="button"
            key={m}
            aria-label={`选择心情 ${m}`}
            aria-pressed={mood === m}
            className={mood === m ? 'chosen' : undefined}
            onClick={() => setMood(m)}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="bottom-line">写于 {weekday}　♡</div>
      {pickerOpen && <StickerPicker onChoose={chooseSticker} onClose={() => setPickerOpen(false)} />}
    </div>
  )
}
