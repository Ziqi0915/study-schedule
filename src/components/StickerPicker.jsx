import { useMemo, useState } from 'react'
import { STICKER_CATALOG } from '../stickerCatalog'

const categories = [
  { id: 'color', label: '彩色贴纸' },
  { id: 'doodle', label: '手绘涂鸦' },
]

export default function StickerPicker({ onChoose, onClose }) {
  const [category, setCategory] = useState('color')
  const stickers = useMemo(() => STICKER_CATALOG.filter((sticker) => sticker.group === category), [category])

  return (
    <div className="sticker-picker-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="sticker-picker" role="dialog" aria-modal="true" aria-labelledby="sticker-picker-title">
        <header className="sticker-picker-heading">
          <div>
            <span className="date-kicker">装点今天这一页</span>
            <h3 id="sticker-picker-title">选一张贴纸</h3>
          </div>
          <button className="sticker-picker-close" type="button" aria-label="关闭贴纸选择" onClick={onClose}>×</button>
        </header>
        <div className="sticker-picker-tabs" role="tablist" aria-label="贴纸分类">
          {categories.map((item) => (
            <button
              type="button"
              role="tab"
              aria-selected={category === item.id}
              className={category === item.id ? 'active' : ''}
              key={item.id}
              onClick={() => setCategory(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="sticker-picker-grid">
          {stickers.map((sticker) => (
            <button type="button" className="sticker-option" key={sticker.id} onClick={() => onChoose(sticker)}>
              <span className="sticker-option-image"><img src={sticker.src} alt="" loading="lazy" /></span>
              <span>{sticker.title}</span>
            </button>
          ))}
        </div>
        <p className="sticker-picker-hint">选中后会贴到日记页；按住贴纸可以移动。</p>
      </section>
    </div>
  )
}
