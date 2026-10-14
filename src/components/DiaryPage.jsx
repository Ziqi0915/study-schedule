import { useEffect, useRef, useState } from 'react'
import { t } from '../i18n'
import DiaryRuledLines from './DiaryRuledLines'
import StickerPicker from './StickerPicker'
import { STICKER_BY_ID } from '../stickerCatalog'

const moods = ['☀️', '🌱', '🌙', '☁️', '✦']
const stickerLimit = 30
const lineHeight = 32
const zwsp = '\u200b'

function makeId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function nextPosition(count) {
  const points = [
    [22, 18], [78, 20], [50, 36], [24, 52],
    [76, 56], [48, 72], [30, 88], [70, 84],
  ]
  const [x, y] = points[count % points.length]
  return { x, y }
}

function cleanText(value) {
  return String(value || '').replaceAll(zwsp, '').replace(/\r/g, '')
}

function readLines(editor) {
  const text = cleanText(editor.innerText)
  if (text === '') return ['']
  return text.split('\n')
}

function writeLines(editor, lines) {
  const safe = lines.length ? lines : ['']
  editor.innerHTML = ''
  safe.forEach((line, index) => {
    editor.appendChild(document.createTextNode(line === '' ? zwsp : line))
    if (index < safe.length - 1) editor.appendChild(document.createElement('br'))
  })
}

function getLineTextNode(editor, lineIndex) {
  let line = 0
  for (const node of editor.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (line === lineIndex) return node
    } else if (node.nodeName === 'BR') {
      line += 1
    }
  }
  return null
}

function caretRangeFromPoint(clientX, clientY) {
  if (document.caretRangeFromPoint) return document.caretRangeFromPoint(clientX, clientY)
  if (!document.caretPositionFromPoint) return null
  const position = document.caretPositionFromPoint(clientX, clientY)
  if (!position) return null
  const range = document.createRange()
  range.setStart(position.offsetNode, position.offset)
  range.collapse(true)
  return range
}

function measurePrefixWidth(editor, lineIndex, length) {
  const node = getLineTextNode(editor, lineIndex)
  if (!node) return 0
  const text = node.textContent === zwsp ? '' : (node.textContent || '')
  const range = document.createRange()
  if (length <= 0 || !text) {
    range.setStart(node, 0)
    range.setEnd(node, node.textContent === zwsp ? 0 : 0)
    const left = range.getBoundingClientRect().left
    return left || editor.getBoundingClientRect().left + 14
  }
  const end = Math.min(length, text.length)
  range.setStart(node, 0)
  range.setEnd(node, end)
  return range.getBoundingClientRect().right
}

function offsetFromClientX(editor, lineIndex, clientX) {
  const node = getLineTextNode(editor, lineIndex)
  if (!node) return 0
  if (node.textContent === zwsp) return 1
  const text = node.textContent || ''
  if (!text) return 0

  let best = 0
  let bestDistance = Infinity
  for (let index = 0; index <= text.length; index += 1) {
    const marker = measurePrefixWidth(editor, lineIndex, index)
    const distance = Math.abs(marker - clientX)
    if (distance < bestDistance) {
      bestDistance = distance
      best = index
    }
  }
  return best
}

/** Pad a line with spaces so the caret can sit at the clicked X (e.g. to the right of a sticker). */
function padLineToClientX(editor, lines, lineIndex, clientX) {
  const next = lines.slice()
  while (next.length <= lineIndex) next.push('')
  writeLines(editor, next)

  let text = next[lineIndex] || ''
  let width = measurePrefixWidth(editor, lineIndex, text.length)
  let guard = 0
  while (width < clientX - 1 && guard < 240) {
    text += ' '
    next[lineIndex] = text
    writeLines(editor, next)
    width = measurePrefixWidth(editor, lineIndex, text.length)
    guard += 1
  }
  return { lines: next, offset: text.length }
}

function placeCaretOnLine(editor, lineIndex, offset = 0) {
  const selection = window.getSelection()
  if (!selection) return
  const range = document.createRange()
  const node = getLineTextNode(editor, lineIndex)
  if (!node) {
    range.selectNodeContents(editor)
    range.collapse(false)
  } else if (node.textContent === zwsp) {
    range.setStart(node, 1)
    range.collapse(true)
  } else {
    range.setStart(node, Math.max(0, Math.min(offset, node.textContent.length)))
    range.collapse(true)
  }
  selection.removeAllRanges()
  selection.addRange(range)
}

function lineIndexFromPoint(compose, clientY) {
  const bounds = compose.getBoundingClientRect()
  const paddingTop = 14
  const y = clientY - bounds.top - paddingTop + compose.scrollTop
  return Math.max(0, Math.floor(y / lineHeight))
}

export default function DiaryPage({ locale, book, selected, dateLabel, weekday, updateBook }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [dragPreview, setDragPreview] = useState(null)
  const composeRef = useRef(null)
  const editorRef = useRef(null)
  const dragRef = useRef(null)
  const focusedRef = useRef(false)
  const journal = book.journals[selected] || ''
  const mood = book.moods?.[selected] || ''
  const stickers = book.stickers?.[selected] || []

  useEffect(() => {
    const editor = editorRef.current
    if (!editor || focusedRef.current) return
    const next = journal === '' ? [''] : journal.split('\n')
    if (readLines(editor).join('\n') !== next.join('\n')) writeLines(editor, next)
  }, [journal, selected])

  function setJournal(value) {
    updateBook((prev) => ({
      ...prev,
      journals: { ...prev.journals, [selected]: cleanText(value) },
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
          { id: makeId(), key: sticker.id, ...position, size: 22, rotation: (stickers.length % 5 - 2) * 4 },
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

  function pointerToPercent(event) {
    const board = composeRef.current
    if (!board) return { x: 50, y: 50 }
    const bounds = board.getBoundingClientRect()
    return {
      x: Math.min(92, Math.max(8, ((event.clientX - bounds.left) / bounds.width) * 100)),
      y: Math.min(92, Math.max(8, ((event.clientY - bounds.top) / bounds.height) * 100)),
    }
  }

  function moveSticker(event, sticker) {
    const drag = dragRef.current
    if (!drag || drag.id !== sticker.id || drag.pointerId !== event.pointerId) return
    drag.preview = pointerToPercent(event)
    setDragPreview({ id: sticker.id, ...drag.preview })
  }

  function finishMove(event, sticker) {
    const drag = dragRef.current
    if (!drag || drag.id !== sticker.id || drag.pointerId !== event.pointerId) return
    const finalPosition = drag.preview || pointerToPercent(event)
    updateBook((prev) => ({
      ...prev,
      stickers: {
        ...(prev.stickers || {}),
        [selected]: (prev.stickers?.[selected] || []).map((item) => item.id === sticker.id
          ? { ...item, x: finalPosition.x, y: finalPosition.y }
          : item),
      },
    }))
    dragRef.current = null
    setDragPreview(null)
  }

  function focusLineAt(event) {
    if (event.button !== 0) return
    if (event.target.closest?.('.placed-sticker')) return
    const compose = composeRef.current
    const editor = editorRef.current
    if (!compose || !editor) return

    const targetLine = lineIndexFromPoint(compose, event.clientY)
    const lines = readLines(editor)
    const nativeRange = caretRangeFromPoint(event.clientX, event.clientY)
    const nativeOnText = nativeRange
      && editor.contains(nativeRange.startContainer)
      && nativeRange.startContainer.nodeType === Node.TEXT_NODE
      && nativeRange.startContainer.textContent
      && nativeRange.startContainer.textContent !== zwsp
      && nativeRange.startContainer.textContent.trim() !== ''

    // Clicking existing non-space characters: keep browser-accurate caret.
    if (nativeOnText && targetLine < lines.length) {
      const offset = nativeRange.startOffset
      const char = nativeRange.startContainer.textContent[Math.max(0, offset - 1)]
      const nextChar = nativeRange.startContainer.textContent[offset]
      // If the hit is real text (not only trailing spaces we may want to extend past), use native.
      if ((char && char !== ' ') || (nextChar && nextChar !== ' ' && nextChar !== zwsp)) {
        event.preventDefault()
        focusedRef.current = true
        editor.focus()
        const selection = window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(nativeRange)
        return
      }
    }

    event.preventDefault()
    // Pad with spaces so clicking to the right of a sticker places the caret there.
    const padded = padLineToClientX(editor, lines, targetLine, event.clientX)
    focusedRef.current = true
    editor.focus()
    placeCaretOnLine(editor, targetLine, padded.offset)
    setJournal(padded.lines.join('\n'))
  }

  const renderedStickers = stickers.map((sticker) => {
    const preview = dragPreview?.id === sticker.id ? dragPreview : null
    return preview ? { ...sticker, x: preview.x, y: preview.y } : sticker
  })

  return (
    <div className="page-column diary-page">
      <div className="page-heading">
        <div>
          <span className="date-kicker">{t(locale, 'diaryKicker', dateLabel)}</span>
          <h2>{t(locale, 'diaryTitle')}</h2>
        </div>
        <span className="page-number">02</span>
      </div>

      <div className="sticker-section-heading">
        <span>{t(locale, 'stickersToday')} <small>{stickers.length}/{stickerLimit}</small></span>
        <button type="button" className="add-sticker" onClick={() => setPickerOpen(true)} disabled={stickers.length >= stickerLimit}>
          {t(locale, 'pickSticker')}
        </button>
      </div>

      <div
        className="diary-compose"
        ref={composeRef}
        aria-label={t(locale, 'paperLabel')}
        onMouseDown={focusLineAt}
      >
        <DiaryRuledLines
          composeRef={composeRef}
          watchKey={`${selected}|${journal.length}|${stickers.map((s) => `${s.id}:${s.x}:${s.y}:${s.size}`).join(',')}|${dragPreview ? `${dragPreview.id}:${dragPreview.x}:${dragPreview.y}` : ''}`}
        />
        <div
          ref={editorRef}
          className="diary-editor"
          contentEditable
          role="textbox"
          aria-multiline="true"
          aria-label={t(locale, 'diaryLabel')}
          spellCheck
          onFocus={() => { focusedRef.current = true }}
          onBlur={() => { focusedRef.current = false }}
          onInput={(event) => setJournal(event.currentTarget.innerText)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
            event.preventDefault()
            const editor = editorRef.current
            if (!editor) return
            const selection = window.getSelection()
            if (!selection || !selection.rangeCount) return

            // Find current line, split, insert empty line after.
            const lines = readLines(editor)
            let line = 0
            let offsetInLine = 0
            const anchor = selection.getRangeAt(0).startContainer
            const anchorOffset = selection.getRangeAt(0).startOffset
            if (anchor.nodeType === Node.TEXT_NODE && editor.contains(anchor)) {
              for (const node of editor.childNodes) {
                if (node === anchor) {
                  offsetInLine = anchor.textContent === zwsp ? 0 : anchorOffset
                  break
                }
                if (node.nodeName === 'BR') line += 1
              }
            } else {
              line = Math.max(0, lines.length - 1)
              offsetInLine = (lines[line] || '').length
            }

            const current = lines[line] || ''
            const before = current.slice(0, offsetInLine)
            const after = current.slice(offsetInLine)
            const next = [...lines.slice(0, line), before, after, ...lines.slice(line + 1)]
            writeLines(editor, next)
            placeCaretOnLine(editor, line + 1)
            setJournal(next.join('\n'))
          }}
        />
        <div className="diary-sticker-layer">
          {renderedStickers.map((sticker) => {
            const image = STICKER_BY_ID[sticker.key]
            if (!image) return null
            return (
              <div
                key={sticker.id}
                className="placed-sticker"
                style={{
                  left: `${sticker.x}%`,
                  top: `${sticker.y}%`,
                  width: `${sticker.size}%`,
                  transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg)`,
                }}
                title={t(locale, 'dragHint', image.title)}
              >
                <img
                  src={image.src}
                  alt={image.title}
                  draggable="false"
                  onPointerDown={(event) => {
                    if (event.button !== 0) return
                    event.preventDefault()
                    event.stopPropagation()
                    event.currentTarget.setPointerCapture(event.pointerId)
                    dragRef.current = {
                      id: sticker.id,
                      pointerId: event.pointerId,
                      preview: null,
                    }
                  }}
                  onPointerMove={(event) => moveSticker(event, sticker)}
                  onPointerUp={(event) => finishMove(event, sticker)}
                  onPointerCancel={(event) => finishMove(event, sticker)}
                />
                <button
                  type="button"
                  className="placed-sticker-remove"
                  aria-label={t(locale, 'removeSticker', image.title)}
                  title={t(locale, 'removeStickerTitle')}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => removeSticker(sticker.id)}
                >×</button>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mood-row">
        <span>{t(locale, 'moodToday')}</span>
        {moods.map((m) => (
          <button
            type="button"
            key={m}
            aria-label={t(locale, 'pickMood', m)}
            aria-pressed={mood === m}
            className={mood === m ? 'chosen' : undefined}
            onClick={() => setMood(m)}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="bottom-line">{t(locale, 'writtenOn', weekday)}</div>
      {pickerOpen && <StickerPicker locale={locale} onChoose={chooseSticker} onClose={() => setPickerOpen(false)} />}
    </div>
  )
}
