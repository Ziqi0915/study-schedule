import { useMemo, useState } from 'react'
import { t } from '../i18n'
import { STICKER_CATALOG } from '../stickerCatalog'

export default function StickerPicker({ locale, onChoose, onClose }) {
  const [category, setCategory] = useState('color')
  const categories = [
    { id: 'color', label: t(locale, 'catColor') },
    { id: 'doodle', label: t(locale, 'catDoodle') },
  ]
  const stickers = useMemo(() => STICKER_CATALOG.filter((sticker) => sticker.group === category), [category])

  return (
    <div className="sticker-picker-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="sticker-picker" role="dialog" aria-modal="true" aria-labelledby="sticker-picker-title">
        <header className="sticker-picker-heading">
          <div>
            <span className="date-kicker">{t(locale, 'pickerKicker')}</span>
            <h3 id="sticker-picker-title">{t(locale, 'pickerTitle')}</h3>
          </div>
          <button className="sticker-picker-close" type="button" aria-label={t(locale, 'pickerClose')} onClick={onClose}>×</button>
        </header>
        <div className="sticker-picker-tabs" role="tablist" aria-label={t(locale, 'pickerCats')}>
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
        <p className="sticker-picker-hint">{t(locale, 'pickerHint')}</p>
      </section>
    </div>
  )
}
