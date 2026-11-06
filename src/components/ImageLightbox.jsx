import { useEffect, useRef, useState } from 'react'

const MIN_SCALE = 1
const MAX_SCALE = 6

export default function ImageLightbox({ src, onClose }) {
  const [scale, setScale] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const lastRef = useRef({ x: 0, y: 0 })
  const pinchRef = useRef(null)
  const rootRef = useRef(null)

  useEffect(() => {
    setScale(1)
    setPos({ x: 0, y: 0 })
  }, [src])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Non-passive native listener — React's synthetic wheel handler is
  // passive and can't preventDefault the page scroll.
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    function onWheel(e) {
      e.preventDefault()
      const delta = -e.deltaY * 0.0015
      setScale((s) => clamp(s + delta, MIN_SCALE, MAX_SCALE))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  function onMouseDown(e) {
    e.preventDefault()
    setDragging(true)
    lastRef.current = { x: e.clientX, y: e.clientY }
  }

  function onMouseMove(e) {
    if (!dragging) return
    const dx = e.clientX - lastRef.current.x
    const dy = e.clientY - lastRef.current.y
    lastRef.current = { x: e.clientX, y: e.clientY }
    setPos((p) => ({ x: p.x + dx, y: p.y + dy }))
  }

  function stopDrag() {
    setDragging(false)
  }

  function onDoubleClick() {
    if (scale > 1) {
      setScale(1)
      setPos({ x: 0, y: 0 })
    } else {
      setScale(2.5)
    }
  }

  function onTouchStart(e) {
    if (e.touches.length === 2) {
      pinchRef.current = { dist: touchDist(e.touches), scale }
    } else if (e.touches.length === 1) {
      setDragging(true)
      lastRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
  }

  function onTouchMove(e) {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault()
      const d = touchDist(e.touches)
      const next = clamp(pinchRef.current.scale * (d / pinchRef.current.dist), MIN_SCALE, MAX_SCALE)
      setScale(next)
    } else if (e.touches.length === 1 && dragging) {
      const t = e.touches[0]
      const dx = t.clientX - lastRef.current.x
      const dy = t.clientY - lastRef.current.y
      lastRef.current = { x: t.clientX, y: t.clientY }
      setPos((p) => ({ x: p.x + dx, y: p.y + dy }))
    }
  }

  function onTouchEnd(e) {
    if (e.touches.length < 2) pinchRef.current = null
    if (e.touches.length === 0) setDragging(false)
  }

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-black/92 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      onMouseMove={onMouseMove}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close image preview"
        className="fixed right-4 top-4 z-10 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20 transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
      <img
        src={src}
        alt=""
        draggable={false}
        onMouseDown={onMouseDown}
        onDoubleClick={onDoubleClick}
        className="max-h-[92vh] max-w-[92vw] select-none object-contain"
        style={{
          transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
          cursor: scale > 1 ? (dragging ? 'grabbing' : 'grab') : 'zoom-in',
          transition: dragging ? 'none' : 'transform 0.12s ease-out',
        }}
      />
    </div>
  )
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}

function touchDist(touches) {
  return Math.hypot(
    touches[0].clientX - touches[1].clientX,
    touches[0].clientY - touches[1].clientY,
  )
}
