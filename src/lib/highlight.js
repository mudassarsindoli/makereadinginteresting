export function makeHighlightId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function normalizeHighlights(highlights) {
  if (!Array.isArray(highlights)) return []
  const normalized = []
  for (const highlight of highlights) {
    if (!highlight || typeof highlight !== 'object') continue
    const { id, blockIndex, start, end } = highlight
    if (typeof id !== 'string' || !id) continue
    if (!Number.isInteger(blockIndex)) continue
    if (!Number.isInteger(start) || !Number.isInteger(end)) continue
    if (start < 0 || end <= start) continue
    normalized.push({ id, blockIndex, start, end })
  }
  normalized.sort(
    (a, b) => a.blockIndex - b.blockIndex || a.start - b.start || a.end - b.end,
  )
  return normalized
}

export function mergeRanges(ranges) {
  if (!Array.isArray(ranges)) return []
  const valid = []
  for (const range of ranges) {
    if (!range || typeof range !== 'object') continue
    const { start, end } = range
    if (!Number.isInteger(start) || !Number.isInteger(end)) continue
    if (start < 0 || end <= start) continue
    valid.push({ start, end })
  }
  valid.sort((a, b) => a.start - b.start || a.end - b.end)
  const merged = []
  for (const range of valid) {
    const last = merged[merged.length - 1]
    if (last && range.start <= last.end) {
      if (range.end > last.end) last.end = range.end
    } else {
      merged.push({ start: range.start, end: range.end })
    }
  }
  return merged
}

export function rangesForBlock(highlights, blockIndex) {
  if (!Number.isInteger(blockIndex)) return []
  return normalizeHighlights(highlights).filter((h) => h.blockIndex === blockIndex)
}

export function pieceSegments(piece, highlights) {
  const text = piece && typeof piece.text === 'string' ? piece.text : ''
  const base = piece && Number.isInteger(piece.start) ? piece.start : 0
  const limit =
    piece && Number.isInteger(piece.end) ? piece.end : base + text.length
  const blockIndex = piece ? piece.blockIndex : undefined

  const overlapping = normalizeHighlights(highlights).filter(
    (h) => h.blockIndex === blockIndex && h.start < limit && h.end > base,
  )

  const plain = () => [
    {
      text,
      start: 0,
      end: text.length,
      highlighted: false,
      rangeId: null,
    },
  ]

  if (!overlapping.length) return plain()

  const clipped = []
  for (const highlight of overlapping) {
    const start = Math.max(0, Math.min(text.length, highlight.start - base))
    const end = Math.max(0, Math.min(text.length, highlight.end - base))
    if (end <= start) continue
    clipped.push({ start, end, rangeId: highlight.id })
  }

  if (!clipped.length) return plain()

  clipped.sort((a, b) => a.start - b.start || a.end - b.end)

  const merged = []
  for (const range of clipped) {
    const last = merged[merged.length - 1]
    if (last && range.start < last.end) {
      if (range.end > last.end) last.end = range.end
    } else {
      merged.push({ ...range })
    }
  }

  const segments = []
  let cursor = 0
  for (const range of merged) {
    if (range.start > cursor) {
      segments.push({
        text: text.slice(cursor, range.start),
        start: cursor,
        end: range.start,
        highlighted: false,
        rangeId: null,
      })
    }
    segments.push({
      text: text.slice(range.start, range.end),
      start: range.start,
      end: range.end,
      highlighted: true,
      rangeId: range.rangeId,
    })
    cursor = range.end
  }

  if (cursor < text.length) {
    segments.push({
      text: text.slice(cursor),
      start: cursor,
      end: text.length,
      highlighted: false,
      rangeId: null,
    })
  }

  return segments.length ? segments : plain()
}

export function highlightAtPoint(highlights, blockIndex, offset) {
  if (!Number.isInteger(blockIndex) || !Number.isInteger(offset)) return null
  const normalized = normalizeHighlights(highlights)
  for (const highlight of normalized) {
    if (
      highlight.blockIndex === blockIndex &&
      offset >= highlight.start &&
      offset < highlight.end
    ) {
      return highlight
    }
  }
  return null
}

export function rangeIntersectsHighlights(highlights, blockIndex, start, end) {
  if (
    !Number.isInteger(blockIndex) ||
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    end <= start
  ) {
    return []
  }
  const ids = []
  for (const highlight of normalizeHighlights(highlights)) {
    if (highlight.blockIndex !== blockIndex) continue
    if (highlight.start < end && highlight.end > start) ids.push(highlight.id)
  }
  return ids
}

export function selectionToRanges(rootEl) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return []
  if (!rootEl || typeof rootEl.nodeType !== 'number') return []
  if (typeof window.getSelection !== 'function') return []

  const selection = window.getSelection()
  if (!selection || !selection.rangeCount || selection.isCollapsed) return []

  const range = selection.getRangeAt(0)
  const showText = (window.NodeFilter && window.NodeFilter.SHOW_TEXT) || 4

  let walker
  try {
    walker = document.createTreeWalker(rootEl, showText, null)
  } catch {
    return []
  }

  const slices = []
  let node = walker.nextNode()
  while (node) {
    if (node.nodeValue) {
      let intersects = false
      try {
        intersects = range.intersectsNode(node)
      } catch {
        intersects = false
      }
      if (intersects) {
        const length = node.nodeValue.length
        let sliceStart = 0
        let sliceEnd = length
        if (node === range.startContainer) {
          sliceStart = Math.max(0, Math.min(length, range.startOffset))
        }
        if (node === range.endContainer) {
          sliceEnd = Math.max(0, Math.min(length, range.endOffset))
        }
        if (sliceEnd > sliceStart) {
          const located = locateNode(node, rootEl)
          if (located) {
            const localStart =
              textOffsetWithin(node, located.sourceEl) + sliceStart
            const sourceStart = located.sourceStart + localStart
            slices.push({
              blockIndex: located.blockIndex,
              start: sourceStart,
              end: sourceStart + (sliceEnd - sliceStart),
              text: node.nodeValue.slice(sliceStart, sliceEnd),
            })
          }
        }
      }
    }
    node = walker.nextNode()
  }

  return groupSlices(slices)
}

function locateNode(node, rootEl) {
  let element = node.parentElement
  let blockIndex = null
  let sourceStart = null
  let sourceEl = null
  while (element) {
    const dataset = element.dataset
    if (dataset) {
      if (
        blockIndex === null &&
        dataset.blockIndex !== undefined &&
        dataset.blockIndex !== ''
      ) {
        const value = Number(dataset.blockIndex)
        if (Number.isInteger(value)) blockIndex = value
      }
      if (
        sourceStart === null &&
        dataset.sourceStart !== undefined &&
        dataset.sourceStart !== ''
      ) {
        const value = Number(dataset.sourceStart)
        if (Number.isFinite(value)) {
          sourceStart = value
          sourceEl = element
        }
      }
    }
    if (element === rootEl) break
    element = element.parentElement
  }
  if (blockIndex === null || sourceStart === null || !sourceEl) return null
  return { blockIndex, sourceStart, sourceEl }
}

function textOffsetWithin(node, ancestorEl) {
  let total = 0
  const showText = (window.NodeFilter && window.NodeFilter.SHOW_TEXT) || 4
  try {
    const walker = document.createTreeWalker(ancestorEl, showText, null)
    let current = walker.nextNode()
    while (current) {
      if (current === node) return total
      total += current.nodeValue ? current.nodeValue.length : 0
      current = walker.nextNode()
    }
  } catch {
    return total
  }
  return total
}

function groupSlices(slices) {
  const groups = new Map()
  for (const slice of slices) {
    const group = groups.get(slice.blockIndex)
    if (group) group.push(slice)
    else groups.set(slice.blockIndex, [slice])
  }

  const result = []
  for (const [blockIndex, group] of groups) {
    group.sort((a, b) => a.start - b.start || a.end - b.end)
    const merged = []
    for (const slice of group) {
      const last = merged[merged.length - 1]
      if (last && slice.start <= last.end) {
        if (slice.end > last.end) {
          const overlap = last.end - slice.start
          last.text += overlap > 0 ? slice.text.slice(overlap) : slice.text
          last.end = slice.end
        }
      } else {
        merged.push({ start: slice.start, end: slice.end, text: slice.text })
      }
    }
    for (const range of merged) {
      if (range.end > range.start) {
        result.push({
          blockIndex,
          start: range.start,
          end: range.end,
          text: range.text,
        })
      }
    }
  }

  result.sort((a, b) => a.blockIndex - b.blockIndex || a.start - b.start)
  return result
}

export function googleSearchUrl(text) {
  const query = typeof text === 'string' ? text.trim().slice(0, 500) : ''
  if (!query) return 'https://www.google.com/search'
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
}
