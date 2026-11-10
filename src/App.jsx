import { useCallback, useEffect, useState } from 'react'
import UploadScreen from './components/UploadScreen.jsx'
import Reader from './components/Reader.jsx'
import { extractPdf } from './lib/extractPdf.js'
import { cleanupText } from './lib/cleanup.js'
import { environmentStyle } from './lib/environments.js'
import { docKey, loadPrefs, savePrefs, mostRecentPosition } from './lib/storage.js'
import { loadCurrentDoc, saveCurrentDoc, updateCurrentDoc } from './lib/library.js'

export default function App() {
  const [prefs, setPrefs] = useState(loadPrefs)
  const [doc, setDoc] = useState(null)
  const [status, setStatus] = useState('checking') // checking | idle | loading | ready | error
  const [progress, setProgress] = useState({ done: 0, total: 0, stage: '' })
  const [error, setError] = useState('')
  const [lastRead, setLastRead] = useState(() => mostRecentPosition())

  useEffect(() => {
    savePrefs(prefs)
    const style = environmentStyle(prefs.environment)
    for (const [key, value] of Object.entries(style)) {
      if (key === 'color-scheme') document.documentElement.style.colorScheme = value
      else document.documentElement.style.setProperty(key, value)
    }
  }, [prefs])

  useEffect(() => {
    let active = true
    loadCurrentDoc().then((stored) => {
      if (!active) return
      if (stored && Array.isArray(stored.blocks) && stored.blocks.length) {
        setDoc(stored)
        setStatus('ready')
      } else {
        setStatus('idle')
      }
    })
    return () => {
      active = false
    }
  }, [])

  async function handleFile(file) {
    if (!file) return
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
    if (!isPdf) {
      setError('That does not look like a PDF. Please choose a .pdf file.')
      setStatus('error')
      return
    }
    setStatus('loading')
    setError('')
    setProgress({ done: 0, total: 0, stage: 'Opening file' })
    try {
      const { pages, numPages } = await extractPdf(file, (done, total) =>
        setProgress({ done, total, stage: 'Reading pages' }),
      )
      setProgress({ done: numPages, total: numPages, stage: 'Cleaning up text' })
      await new Promise((r) => setTimeout(r, 16))
      const { blocks, stats } = cleanupText(pages)
      if (!blocks.length) {
        throw new Error(
          'No selectable text found in this PDF. Scanned or image-only PDFs need OCR, which is not supported yet.',
        )
      }
      const newDoc = {
        key: docKey(file),
        name: file.name.replace(/\.pdf$/i, ''),
        blocks,
        numPages,
        stats,
        highlights: [],
      }
      await saveCurrentDoc(newDoc)
      setDoc(newDoc)
      setStatus('ready')
    } catch (e) {
      const msg =
        e?.name === 'InvalidPDFException'
          ? 'This file could not be opened as a PDF. It may be corrupted or password-protected.'
          : e?.message || 'Something went wrong while reading this PDF.'
      setError(msg)
      setStatus('error')
    }
  }

  const persistDoc = useCallback(
    (patch) => {
      setDoc((d) => (d ? { ...d, ...patch } : d))
      if (doc?.key !== undefined) updateCurrentDoc(doc.key, patch)
    },
    [doc?.key],
  )

  function backToUpload() {
    setStatus('idle')
    setError('')
    setLastRead(mostRecentPosition())
  }

  function resumeReading() {
    if (doc) setStatus('ready')
  }

  if (status === 'checking') {
    return <div className="min-h-dvh bg-surface" />
  }

  if (status === 'ready' && doc) {
    return (
      <Reader
        doc={doc}
        prefs={prefs}
        setPrefs={setPrefs}
        onBack={backToUpload}
        onPersist={persistDoc}
      />
    )
  }

  return (
    <UploadScreen
      onFile={handleFile}
      status={status === 'loading' ? 'loading' : 'idle'}
      progress={progress}
      error={status === 'error' ? error : ''}
      lastRead={lastRead}
      canResume={Boolean(doc)}
      onResume={resumeReading}
      prefs={prefs}
    />
  )
}
