import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import SettingsPanel from './SettingsPanel.jsx'
import EnvironmentArt from './EnvironmentArt.jsx'
import ImageLightbox from './ImageLightbox.jsx'
import { loadPosition, savePosition } from '../lib/storage.js'
import { buildCards } from '../lib/cards.js'
import {
  normalizeHighlights,
  pieceSegments,
  selectionToRanges,
  googleSearchUrl,
  makeHighlightId,
} from '../lib/highlight.js'

const FONT_PX = { small: 16, medium: 18, large: 21 }
const LINE_HEIGHT = { small: 1.5, medium: 1.7, large: 1.95 }
const NAV_LOCK_MS = 420

export default function Reader({ doc, prefs, setPrefs, onBack, onPersist }) {
  const cards = useMemo(() => buildCards(doc.blocks), [doc.blocks])

  const totalCards = cards.length

  const [currentIndex, setCurrentIndex] = useState(() => {
    const saved = loadPosition(doc.key)
    if (!saved) return 0
    return Math.max(0, Math.min(totalCards - 1, saved.cardIndex || 0))
  })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [highlights, setHighlights] = useState(() => normalizeHighlights(doc.highlights))
  const [selection, setSelection] = useState(null)
  const [lightboxSrc, setLightboxSrc] = useState(null)
  const [pageInput, setPageInput] = useState('1')

  const navLockRef = useRef(false)
  const cardRef = useRef(null)
  const saveTimerRef = useRef(null)
  const highlightsInitRef = useRef(true)
  const imageUrlsRef = useRef(new Map())

  const imageUrl = useCallback((block) => {
    if (!block.blob) return ''
    let url = imageUrlsRef.current.get(block.blob)
    if (!url) {
      url = URL.createObjectURL(block.blob)
      imageUrlsRef.current.set(block.blob, url)
    }
    return url
  }, [])

  useEffect(() => {
    const urls = imageUrlsRef.current
    return () => {
      for (const url of urls.values()) URL.revokeObjectURL(url)
      urls.clear()
    }
  }, [doc.key])

  const triggerNav = useCallback(
    (dir) => {
      if (navLockRef.current) return
      setCurrentIndex((i) => {
        const next = Math.max(0, Math.min(totalCards - 1, i + dir))
        if (next !== i) {
          navLockRef.current = true
          setTimeout(() => {
            navLockRef.current = false
          }, NAV_LOCK_MS)
        }
        return next
      })
      setSelection(null)
    },
    [totalCards],
  )

  useEffect(() => {
    setPageInput(String(currentIndex + 1))
  }, [currentIndex])

  function commitPageInput() {
    const n = parseInt(pageInput, 10)
    if (Number.isFinite(n)) {
      setCurrentIndex(Math.max(0, Math.min(totalCards - 1, n - 1)))
    } else {
      setPageInput(String(currentIndex + 1))
    }
  }

  // Persist card position (debounced).
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      savePosition(doc.key, { name: doc.name, cardIndex: currentIndex, totalCards })
    }, 300)
    return () => clearTimeout(saveTimerRef.current)
  }, [currentIndex, doc.key, doc.name, totalCards])

  // Persist highlights whenever they change (skip the initial mount).
  useEffect(() => {
    if (highlightsInitRef.current) {
      highlightsInitRef.current = false
      return
    }
    onPersist({ highlights })
  }, [highlights, onPersist])

  useEffect(() => {
    function onKey(e) {
      if (settingsOpen) return
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault()
        triggerNav(1)
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault()
        triggerNav(-1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [triggerNav, settingsOpen])

  function onSelectionEnd() {
    const root = cardRef.current
    if (!root) return
    const ranges = selectionToRanges(root)
    if (!ranges.length) {
      setSelection(null)
      return
    }
    let rect = null
    try {
      const sel = window.getSelection()
      rect = sel.getRangeAt(0).getBoundingClientRect()
    } catch {
      rect = null
    }
    const text = ranges.map((r) => r.text).join(' ')
    setSelection({ ranges, rect, text })
  }

  function highlightSelection() {
    if (!selection) return
    setHighlights((hs) => [
      ...hs,
      ...selection.ranges.map((r) => ({
        id: makeHighlightId(),
        blockIndex: r.blockIndex,
        start: r.start,
        end: r.end,
      })),
    ])
    window.getSelection()?.removeAllRanges()
    setSelection(null)
  }

  function searchSelection() {
    if (!selection) return
    window.open(googleSearchUrl(selection.text), '_blank', 'noopener,noreferrer')
    window.getSelection()?.removeAllRanges()
    setSelection(null)
  }

  function removeHighlight(e, id) {
    e.stopPropagation()
    setHighlights((hs) => hs.filter((h) => h.id !== id))
  }

  const percent = totalCards > 1 ? Math.round((currentIndex / (totalCards - 1)) * 100) : 100
  const fontSize = FONT_PX[prefs.fontSize] || FONT_PX.medium
  const lineHeight = LINE_HEIGHT[prefs.spacing] || LINE_HEIGHT.medium

  const visibleCards = []
  for (let r = -1; r <= 2; r++) {
    const idx = currentIndex + r
    if (idx < 0 || idx >= totalCards) continue
    visibleCards.push({ idx, r, blocks: cards[idx] })
  }

  return (
    <div className="fixed inset-0 overflow-hidden text-ink">
      <EnvironmentArt envId={prefs.environment} customImage={prefs.customImage} />

      <header className="acrylic fixed inset-x-0 top-0 z-30 border-b border-line">
        <div
          className="h-0.5 w-full bg-line"
          role="progressbar"
          aria-label="Reading progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div
            className="h-full bg-accent transition-[width] duration-200"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex w-full items-center gap-3 px-4 py-2.5 sm:px-6">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to file picker"
            className="shrink-0 rounded-full p-2 text-muted hover:text-ink hover:bg-line/60 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight" title={doc.name}>
              {doc.name}
            </p>
            <p className="text-xs text-muted leading-tight">
              {percent}% read · card {currentIndex + 1}/{totalCards}
            </p>
          </div>
        </div>
      </header>

      <button
        type="button"
        onClick={() => setSettingsOpen(true)}
        aria-label="Reading settings"
        className="acrylic fixed right-4 top-3 z-40 rounded-full border border-line p-2.5 text-muted shadow-sm hover:text-ink hover:bg-line/60 transition-colors sm:right-6"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5h10M16.5 7.5H21M3 16.5h3.5M10 16.5h11" />
          <circle cx="14.75" cy="7.5" r="1.75" />
          <circle cx="8.25" cy="16.5" r="1.75" />
        </svg>
      </button>

      <div className="absolute inset-0 flex items-center justify-center px-4 pt-16 pb-24 sm:px-8 sm:pb-28">
        <div className="relative h-full w-full max-w-3xl">
          {visibleCards.map(({ idx, r, blocks }) => (
            <div
              key={idx}
              ref={r === 0 ? cardRef : null}
              onMouseUp={r === 0 ? onSelectionEnd : undefined}
              aria-hidden={r !== 0}
              className="card-surface absolute inset-0 rounded-2xl border border-line p-6 shadow-xl transition-all duration-[380ms] ease-out sm:p-10 overflow-auto max-h-[76vh]"
              style={{
                transform: cardTransform(r),
                opacity: r === -1 ? 0 : r === 2 ? 0.65 : 1,
                zIndex: 40 - r * 10,
                pointerEvents: r === 0 ? 'auto' : 'none',
                fontSize: `${fontSize}px`,
                lineHeight,
              }}
            >
              {blocks.map((block) =>
                block.type === 'image' ? (
                  <div key={block.blockIndex} className="my-4 flex justify-center">
                    <img
                      src={imageUrl(block)}
                      alt=""
                      loading="lazy"
                      onClick={() => setLightboxSrc(imageUrl(block))}
                      className="max-h-72 w-auto cursor-zoom-in rounded-lg border border-line object-contain shadow-sm transition-transform hover:scale-[1.01]"
                    />
                  </div>
                ) : block.type === 'heading' ? (
                  block.level === 2 ? (
                    <h2
                      key={block.blockIndex}
                      data-block-index={block.blockIndex}
                      data-source-start="0"
                      className="mb-4 mt-2 font-semibold tracking-tight first:mt-0"
                      style={{ fontSize: '1.4em', lineHeight: 1.25 }}
                    >
                      {renderBlockText(block, highlights, removeHighlight)}
                    </h2>
                  ) : (
                    <h3
                      key={block.blockIndex}
                      data-block-index={block.blockIndex}
                      data-source-start="0"
                      className="mb-3 mt-2 font-semibold tracking-tight first:mt-0"
                      style={{ fontSize: '1.15em', lineHeight: 1.3 }}
                    >
                      {renderBlockText(block, highlights, removeHighlight)}
                    </h3>
                  )
                ) : (
                  <p
                    key={block.blockIndex}
                    data-block-index={block.blockIndex}
                    data-source-start="0"
                    className="mb-[0.9em] hyphens-auto text-pretty"
                    lang="en"
                  >
                    {renderBlockText(block, highlights, removeHighlight)}
                  </p>
                ),
              )}
              {idx === totalCards - 1 && (
                <p className="mt-10 text-center text-sm text-muted">
                  End — {doc.stats.words.toLocaleString()} words from {doc.stats.pagesRead} pages
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-5 sm:pb-6">
        <div className="acrylic pointer-events-auto flex items-center gap-1 rounded-full border border-line p-1.5 shadow-lg sm:gap-1.5 sm:p-2">
          <button
            type="button"
            onClick={() => triggerNav(-1)}
            disabled={currentIndex === 0}
            aria-label="Previous card"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:text-ink hover:bg-line/60 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75 12 8.25l7.5 7.5" />
            </svg>
          </button>

          <div className="flex shrink-0 items-center gap-1.5 px-1.5">
            <input
              type="text"
              inputMode="numeric"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value.replace(/[^0-9]/g, ''))}
              onBlur={commitPageInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
              }}
              aria-label="Jump to card"
              className="w-10 rounded-md border border-line bg-transparent py-1 text-center text-xs font-medium text-ink"
            />
            <span className="text-xs leading-tight text-muted">/ {totalCards}</span>
          </div>

          <button
            type="button"
            onClick={() => triggerNav(1)}
            disabled={currentIndex === totalCards - 1}
            aria-label="Next card"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:text-ink hover:bg-line/60 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 8.25 12 15.75l7.5-7.5" />
            </svg>
          </button>
        </div>
      </div>

      {selection && (
        <div
          className="acrylic fixed z-50 flex gap-1 rounded-xl border border-line p-1 shadow-xl"
          style={selectionToolbarStyle(selection.rect)}
        >
          <button
            type="button"
            onClick={highlightSelection}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-ink hover:bg-line/60"
          >
            Highlight
          </button>
          <button
            type="button"
            onClick={searchSelection}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-ink hover:bg-line/60"
          >
            Search Google
          </button>
        </div>
      )}

      <SettingsPanel
        open={settingsOpen}
        prefs={prefs}
        setPrefs={setPrefs}
        onClose={() => setSettingsOpen(false)}
      />

      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
    </div>
  )
}

function cardTransform(r) {
  if (r === -1) return 'translateY(-32px) scale(1)'
  if (r === 0) return 'translateY(0) scale(1)'
  if (r === 1) return 'translateY(22px) scale(0.955)'
  return 'translateY(40px) scale(0.91)'
}

function selectionToolbarStyle(rect) {
  if (!rect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  const top = Math.max(8, rect.top - 46)
  const left = Math.min(window.innerWidth - 160, Math.max(8, rect.left + rect.width / 2 - 80))
  return { top: `${top}px`, left: `${left}px` }
}

function renderBlockText(block, highlights, removeHighlight) {
  const segments = pieceSegments(
    { text: block.text, start: 0, end: block.text.length, blockIndex: block.blockIndex },
    highlights,
  )
  return segments.map((seg, i) =>
    seg.highlighted ? (
      <mark
        key={i}
        onClick={(e) => removeHighlight(e, seg.rangeId)}
        className="cursor-pointer rounded-[2px] bg-accent/30 px-0.5 text-inherit"
        title="Tap to remove highlight"
      >
        {seg.text}
      </mark>
    ) : (
      <span key={i}>{seg.text}</span>
    ),
  )
}
