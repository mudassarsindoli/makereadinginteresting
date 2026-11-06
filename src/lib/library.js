const DB_NAME = 'yeezy-library'
const DB_VERSION = 1
const STORE_NAME = 'docs'

let dbPromise = null

function openDB() {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available'))
  }
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    let settled = false
    let request

    try {
      request = indexedDB.open(DB_NAME, DB_VERSION)
    } catch (err) {
      reject(err)
      return
    }

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
    }

    request.onsuccess = () => {
      const db = request.result
      if (settled || !dbPromise) {
        db.close()
        return
      }
      settled = true
      db.onversionchange = () => {
        db.close()
        dbPromise = null
      }
      db.onclose = () => {
        dbPromise = null
      }
      resolve(db)
    }

    request.onerror = () => {
      settled = true
      reject(request.error || new Error('Failed to open IndexedDB'))
    }

    request.onblocked = () => {
      settled = true
      reject(new Error('IndexedDB open blocked'))
    }
  }).catch((err) => {
    dbPromise = null
    throw err
  })

  return dbPromise
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true)
    tx.onerror = () => reject(tx.error || new Error('Transaction failed'))
    tx.onabort = () => reject(tx.error || new Error('Transaction aborted'))
  })
}

function req(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Request failed'))
  })
}

async function runTx(mode, work) {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, mode)
  const done = txDone(tx)
  done.catch(() => {})
  try {
    const result = await work(tx.objectStore(STORE_NAME))
    await done
    return result
  } catch (err) {
    try {
      tx.abort()
    } catch {
      /* transaction already finished */
    }
    await done.catch(() => {})
    throw err
  }
}

export async function loadCurrentDoc() {
  try {
    return await runTx('readonly', async (store) => {
      const cursor = await req(store.openCursor())
      return cursor ? cursor.value : null
    })
  } catch {
    return null
  }
}

export async function saveCurrentDoc(doc) {
  if (!doc || typeof doc !== 'object') return false
  try {
    const db = await openDB()
    const now = Date.now()
    const record = {
      ...doc,
      createdAt: doc.createdAt || now,
      updatedAt: now,
    }
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.clear()
      store.put(record)
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => resolve(false)
      tx.onabort = () => resolve(false)
    })
  } catch {
    return false
  }
}

export async function updateCurrentDoc(key, patch) {
  if (key === undefined || key === null) return null
  try {
    const db = await openDB()
    return await new Promise((resolve) => {
      let merged = null
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const getReq = store.get(key)
      getReq.onsuccess = () => {
        const existing = getReq.result
        if (!existing) return
        const changes = patch && typeof patch === 'object' ? patch : {}
        merged = {
          ...existing,
          ...changes,
          key: existing.key,
          updatedAt: Date.now(),
        }
        store.put(merged)
      }
      getReq.onerror = () => {
        merged = null
      }
      tx.oncomplete = () => resolve(merged)
      tx.onerror = () => resolve(null)
      tx.onabort = () => resolve(null)
    })
  } catch {
    return null
  }
}

export async function deleteCurrentDoc(key) {
  if (key === undefined || key === null) return false
  try {
    await runTx('readwrite', async (store) => {
      await req(store.delete(key))
    })
    return true
  } catch {
    return false
  }
}

export async function clearLibrary() {
  try {
    await runTx('readwrite', async (store) => {
      await req(store.clear())
    })
    return true
  } catch {
    return false
  }
}

export async function isLibraryAvailable() {
  try {
    await openDB()
    return true
  } catch {
    return false
  }
}

export async function requestPersistentStorage() {
  try {
    if (
      typeof navigator === 'undefined' ||
      !navigator.storage ||
      typeof navigator.storage.persist !== 'function'
    ) {
      return false
    }
    return Boolean(await navigator.storage.persist())
  } catch {
    return false
  }
}
