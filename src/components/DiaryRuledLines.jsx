import { useLayoutEffect, useState } from 'react'

const lineGap = 32
const pad = 10
const pagePad = 14

function mergeIntervals(intervals) {
  if (!intervals.length) return []
  const sorted = intervals.slice().sort((a, b) => a[0] - b[0])
  const merged = [sorted[0].slice()]
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1]
    const next = sorted[i]
    if (next[0] <= last[1]) last[1] = Math.max(last[1], next[1])
    else merged.push(next.slice())
  }
  return merged
}

function segmentsForRow(width, holes) {
  const cuts = mergeIntervals(holes.map((hole) => [
    Math.max(0, hole.left - pad),
    Math.min(width, hole.right + pad),
  ]))
  const segments = []
  let cursor = 0
  for (const [left, right] of cuts) {
    if (left > cursor + 1) segments.push([cursor, left])
    cursor = Math.max(cursor, right)
  }
  if (width > cursor + 1) segments.push([cursor, width])
  return segments
}

export default function DiaryRuledLines({ composeRef, watchKey }) {
  const [drawing, setDrawing] = useState({ width: 0, height: 0, segments: [] })

  useLayoutEffect(() => {
    const compose = composeRef.current
    if (!compose) return

    function measure() {
      const width = compose.clientWidth
      const height = Math.max(compose.scrollHeight, compose.clientHeight)
      const composeBox = compose.getBoundingClientRect()
      const holes = [...compose.querySelectorAll('.placed-sticker')].map((node) => {
        const box = node.getBoundingClientRect()
        return {
          left: box.left - composeBox.left + compose.scrollLeft,
          right: box.right - composeBox.left + compose.scrollLeft,
          top: box.top - composeBox.top + compose.scrollTop,
          bottom: box.bottom - composeBox.top + compose.scrollTop,
        }
      })

      const segments = []
      for (let y = pagePad + lineGap - 0.5; y < height - 4; y += lineGap) {
        const rowHoles = holes.filter((hole) => y >= hole.top && y <= hole.bottom)
        for (const [x1, x2] of segmentsForRow(width, rowHoles)) {
          const left = Math.max(x1, pagePad)
          const right = Math.min(x2, width - pagePad)
          if (right - left > 2) segments.push({ y, x1: left, x2: right })
        }
      }
      setDrawing({ width, height, segments })
    }

    measure()
    const frame = requestAnimationFrame(measure)
    const observer = new ResizeObserver(() => measure())
    observer.observe(compose)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [composeRef, watchKey])

  if (!drawing.width || !drawing.height) return null

  return (
    <svg
      className="diary-ruled-lines"
      width={drawing.width}
      height={drawing.height}
      viewBox={`0 0 ${drawing.width} ${drawing.height}`}
      aria-hidden="true"
    >
      {drawing.segments.map((segment, index) => (
        <line
          key={`${segment.y}-${segment.x1}-${segment.x2}-${index}`}
          x1={segment.x1}
          x2={segment.x2}
          y1={segment.y}
          y2={segment.y}
          stroke="#a89d8266"
          strokeWidth="1"
        />
      ))}
    </svg>
  )
}
