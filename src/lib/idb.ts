const IDB_NAME = 'CreditLensDB'
const IDB_VER = 1
const IDB_STORE = 'portfolio'

export function idbOpen(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(IDB_NAME, IDB_VER)
    req.onupgradeneeded = (e) => {
      (e.target as IDBOpenDBRequest).result.createObjectStore(IDB_STORE)
    }
    req.onsuccess = (e) => res((e.target as IDBOpenDBRequest).result)
    req.onerror = (e) => rej((e.target as IDBOpenDBRequest).error)
  })
}

export function idbSet(key: string, val: unknown): Promise<void> {
  return idbOpen().then(db =>
    new Promise<void>((res, rej) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).put(val, key)
      tx.oncomplete = () => { db.close(); res() }
      tx.onerror = (e) => rej((e.target as IDBTransaction).error)
    })
  )
}

export function idbGet<T = unknown>(key: string): Promise<T | undefined> {
  return idbOpen().then(db =>
    new Promise<T | undefined>((res, rej) => {
      const tx = db.transaction(IDB_STORE, 'readonly')
      const req = tx.objectStore(IDB_STORE).get(key)
      req.onsuccess = (e) => { db.close(); res((e.target as IDBRequest).result) }
      req.onerror = (e) => rej((e.target as IDBRequest).error)
    })
  )
}

export function idbDel(key: string): Promise<void> {
  return idbOpen().then(db =>
    new Promise<void>((res, rej) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).delete(key)
      tx.oncomplete = () => { db.close(); res() }
      tx.onerror = (e) => rej((e.target as IDBTransaction).error)
    })
  )
}

export function idbClear(): Promise<void> {
  return idbOpen().then(db =>
    new Promise<void>((res, rej) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).clear()
      tx.oncomplete = () => { db.close(); res() }
      tx.onerror = (e) => rej((e.target as IDBTransaction).error)
    })
  )
}
