import * as pdfjsLib from 'pdfjs-dist'
import { OPS, ImageKind } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

const MAX_IMAGE_DIM = 1600
const MIN_PLACED_SIZE = 28 // pt — skip tiny decorative marks/bullets

export async function extractPdf(file, onProgress) {
  const buffer = await file.arrayBuffer()
  const task = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    isEvalSupported: false,
    disableFontFace: true,
  })
  const pdf = await task.promise
  const pages = []
  try {
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n)
      const viewport = page.getViewport({ scale: 1 })
      const content = await page.getTextContent()
      const images = await extractPageImages(page, viewport.width, viewport.height)
      const built = buildPage(n, content.items, viewport.width, viewport.height)
      built.images = images
      pages.push(built)
      page.cleanup()
      onProgress?.(n, pdf.numPages)
      // Yield to the UI so the loading indicator stays responsive.
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  } finally {
    try {
      await pdf.destroy()
    } catch {
      /* ignore */
    }
  }
  return { pages, numPages: pdf.numPages }
}

/* ---------- images ---------- */

async function extractPageImages(page, pageWidth, pageHeight) {
  let opList
  try {
    opList = await page.getOperatorList()
  } catch {
    return []
  }

  const { fnArray, argsArray } = opList
  let ctm = [1, 0, 0, 1, 0, 0]
  const stack = []
  const pending = []

  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i]
    if (fn === OPS.save) {
      stack.push(ctm)
    } else if (fn === OPS.restore) {
      ctm = stack.pop() || ctm
    } else if (fn === OPS.transform) {
      ctm = multiplyMatrix(ctm, argsArray[i])
    } else if (fn === OPS.paintImageXObject) {
      const ctmAtCall = ctm
      pending.push(
        resolveImage(page, argsArray[i][0]).then((imgData) => ({ imgData, ctm: ctmAtCall })),
      )
    } else if (fn === OPS.paintInlineImageXObject) {
      const imgData = argsArray[i][0]
      if (imgData) pending.push(Promise.resolve({ imgData, ctm }))
    }
  }

  if (!pending.length) return []
  const resolved = await Promise.all(pending)
  const images = []
  for (const { imgData, ctm: m } of resolved) {
    if (!imgData || !imgData.width || !imgData.height) continue
    const corners = [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ].map(([x, y]) => applyMatrix(m, x, y))
    const xs = corners.map((c) => c[0])
    const ys = corners.map((c) => c[1])
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const widthPt = maxX - minX
    const heightPt = maxY - minY
    if (widthPt < MIN_PLACED_SIZE || heightPt < MIN_PLACED_SIZE) continue
    let blob = null
    try {
      blob = await imageDataToBlob(imgData)
    } catch {
      blob = null
    }
    if (!blob) continue
    images.push({
      blob,
      width: imgData.width,
      height: imgData.height,
      yTop: pageHeight - maxY,
      xStart: minX,
    })
  }
  return images
}

function resolveImage(page, objId) {
  return new Promise((resolve) => {
    try {
      page.objs.get(objId, resolve)
    } catch {
      resolve(null)
    }
  })
}

function multiplyMatrix(outer, inner) {
  return [
    outer[0] * inner[0] + outer[2] * inner[1],
    outer[1] * inner[0] + outer[3] * inner[1],
    outer[0] * inner[2] + outer[2] * inner[3],
    outer[1] * inner[2] + outer[3] * inner[3],
    outer[0] * inner[4] + outer[2] * inner[5] + outer[4],
    outer[1] * inner[4] + outer[3] * inner[5] + outer[5],
  ]
}

function applyMatrix(m, x, y) {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]
}

async function imageDataToBlob(imgData) {
  const srcWidth = imgData.width
  const srcHeight = imgData.height

  const srcCanvas = document.createElement('canvas')
  srcCanvas.width = srcWidth
  srcCanvas.height = srcHeight
  const srcCtx = srcCanvas.getContext('2d')
  if (!srcCtx) return null

  if (imgData.bitmap) {
    srcCtx.drawImage(imgData.bitmap, 0, 0)
  } else if (typeof ImageData !== 'undefined' && imgData instanceof ImageData) {
    srcCtx.putImageData(imgData, 0, 0)
  } else if (imgData.data && imgData.kind != null) {
    putBinaryImageData(srcCtx, imgData)
  } else {
    return null
  }

  const scale = Math.min(1, MAX_IMAGE_DIM / Math.max(srcWidth, srcHeight))
  let finalCanvas = srcCanvas
  if (scale < 1) {
    const outWidth = Math.max(1, Math.round(srcWidth * scale))
    const outHeight = Math.max(1, Math.round(srcHeight * scale))
    finalCanvas = document.createElement('canvas')
    finalCanvas.width = outWidth
    finalCanvas.height = outHeight
    finalCanvas.getContext('2d').drawImage(srcCanvas, 0, 0, outWidth, outHeight)
  }

  return new Promise((resolve) => {
    finalCanvas.toBlob((blob) => resolve(blob), 'image/png')
  })
}

function putBinaryImageData(ctx, imgData) {
  const { width, height, data, kind } = imgData
  const out = ctx.createImageData(width, height)
  const dest = out.data
  if (kind === ImageKind.RGBA_32BPP) {
    dest.set(data.subarray(0, dest.length))
  } else if (kind === ImageKind.RGB_24BPP) {
    let s = 0
    for (let d = 0; d < dest.length; d += 4) {
      dest[d] = data[s++]
      dest[d + 1] = data[s++]
      dest[d + 2] = data[s++]
      dest[d + 3] = 255
    }
  } else if (kind === ImageKind.GRAYSCALE_1BPP) {
    const rowBytes = (width + 7) >> 3
    let destPos = 0
    for (let y = 0; y < height; y++) {
      let srcPos = y * rowBytes
      let mask = 0
      let byte = 0
      for (let x = 0; x < width; x++) {
        if (mask === 0) {
          byte = data[srcPos++]
          mask = 128
        }
        const value = byte & mask ? 255 : 0
        dest[destPos++] = value
        dest[destPos++] = value
        dest[destPos++] = value
        dest[destPos++] = 255
        mask >>= 1
      }
    }
  } else {
    throw new Error(`Unsupported image kind: ${kind}`)
  }
  ctx.putImageData(out, 0, 0)
}

function buildPage(num, items, width, height) {
  const raw = []
  for (const it of items) {
    if (!it.str || !it.str.trim()) continue
    const tr = it.transform || [1, 0, 0, 1, 0, 0]
    const size = Math.abs(tr[3]) || Math.abs(it.height) || 10
    const x = tr[4]
    const yBaseline = tr[5]
    const w = it.width || 0
    raw.push({ str: it.str, x, yBaseline, yTop: height - yBaseline, size, xEnd: x + w })
  }
  // PDF y grows upward; reading order needs top of page first.
  raw.sort((a, b) => b.yBaseline - a.yBaseline || a.x - b.x)

  const clusters = []
  for (const r of raw) {
    const last = clusters[clusters.length - 1]
    const tol = last ? Math.max(2.5, last.size * 0.4) : 0
    if (last && Math.abs(r.yBaseline - last.yBaseline) <= tol) {
      last.items.push(r)
    } else {
      clusters.push({ yBaseline: r.yBaseline, size: r.size, items: [r] })
    }
  }

  const lines = []
  for (const c of clusters) {
    const items = c.items.sort((a, b) => a.x - b.x)
    const line = joinItems(items, height)
    if (line) lines.push(line)
  }

  const medianSize = weightedMedianSize(lines, width)
  return { num, width, height, lines, medianSize }
}

function joinItems(items, pageHeight) {
  // Split a visual row into segments when there is a large horizontal gap
  // (two-column layouts put both columns on the same baseline).
  const groups = []
  let cur = [items[0]]
  for (let i = 1; i < items.length; i++) {
    const it = items[i]
    const prev = items[i - 1]
    const gap = it.x - prev.xEnd
    if (gap > Math.max(10, prev.size * 1.2)) {
      groups.push(cur)
      cur = [it]
    } else {
      cur.push(it)
    }
  }
  groups.push(cur)

  const segments = groups.map((g) => makeSegment(g, pageHeight)).filter(Boolean)
  if (!segments.length) return null
  const text = segments.map((s) => s.text).join(' ')
  const size =
    weightedMedian(
      segments.map((s) => s.size),
      segments.map((s) => Math.max(1, s.text.length)),
    ) || 10
  return {
    text,
    yTop: pageHeight - items[0].yBaseline,
    size,
    xStart: Math.min(...segments.map((s) => s.xStart)),
    xEnd: Math.max(...segments.map((s) => s.xEnd)),
    segments,
  }
}

function makeSegment(items, pageHeight) {
  let text = ''
  let prev = null
  let xStart = Infinity
  let xEnd = -Infinity
  const sizes = []
  const weights = []
  for (const it of items) {
    if (prev) {
      const gap = it.x - prev.xEnd
      const hasSpace = /\s$/.test(text) || /^\s/.test(it.str)
      if (!hasSpace && gap > prev.size * 0.1) text += ' '
    }
    text += it.str
    xStart = Math.min(xStart, it.x)
    xEnd = Math.max(xEnd, it.xEnd)
    sizes.push(it.size)
    weights.push(Math.max(1, it.str.length))
    prev = it
  }
  text = text.replace(/\u00ad/g, '').replace(/[ \t]+/g, ' ').trim()
  if (!text) return null
  const size = weightedMedian(sizes, weights) || items[0].size || 10
  return { text, yTop: pageHeight - items[0].yBaseline, size, xStart, xEnd }
}

function weightedMedianSize(lines, pageWidth) {
  const values = []
  const weights = []
  for (const l of lines) {
    values.push(l.size)
    weights.push(
      Math.max(1, l.text.length) * (l.xEnd - l.xStart > pageWidth * 0.25 ? 1 : 0.2),
    )
  }
  return weightedMedian(values, weights) || 11
}

function weightedMedian(values, weights) {
  if (!values.length) return 0
  const pairs = values
    .map((value, i) => ({ value, weight: weights ? weights[i] : 1 }))
    .sort((a, b) => a.value - b.value)
  const total = pairs.reduce((sum, p) => sum + p.weight, 0)
  let acc = 0
  for (const p of pairs) {
    acc += p.weight
    if (acc >= total / 2) return p.value
  }
  return pairs[pairs.length - 1].value
}
