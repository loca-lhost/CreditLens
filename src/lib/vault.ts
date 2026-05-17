import { idbSet, idbGet, idbDel } from './idb'

const VAULT_SALT_KEY = 'v_salt'
const VAULT_CHECK_KEY = 'v_check'
const SNAP_INDEX_KEY = 'snap_index'
const CHECK_PLAINTEXT = 'PEPEASE_CREDITLENS_VAULT_V1'
const RETENTION_DAYS = 90

let _vaultKey: CryptoKey | null = null

export function getVaultKey(): CryptoKey | null {
  return _vaultKey
}

export function setVaultKey(key: CryptoKey | null) {
  _vaultKey = key
}

export function isVaultUnlocked(): boolean {
  return _vaultKey !== null
}

async function deriveKey(passphrase: string, saltArr: number[]): Promise<CryptoKey> {
  const salt = new Uint8Array(saltArr)
  const enc = new TextEncoder()
  const raw = await crypto.subtle.importKey(
    'raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' },
    raw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

interface EncryptedBlob {
  iv: number[]
  ct: number[]
}

async function encryptBlob(key: CryptoKey, data: unknown): Promise<EncryptedBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(JSON.stringify(data))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  return { iv: Array.from(iv), ct: Array.from(new Uint8Array(ct)) }
}

async function decryptBlob<T = unknown>(key: CryptoKey, blob: EncryptedBlob): Promise<T> {
  const iv = new Uint8Array(blob.iv)
  const ct = new Uint8Array(blob.ct)
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return JSON.parse(new TextDecoder().decode(plain))
}

export async function secureSet(key: string, val: unknown): Promise<void> {
  if (!_vaultKey) throw new Error('Vault locked')
  return idbSet(key, await encryptBlob(_vaultKey, val))
}

export async function secureGet<T = unknown>(key: string): Promise<T | null> {
  if (!_vaultKey) throw new Error('Vault locked')
  const blob = await idbGet<EncryptedBlob>(key)
  if (!blob?.iv) return null
  return decryptBlob<T>(_vaultKey, blob)
}

export async function secureDel(key: string): Promise<void> {
  return idbDel(key)
}

export async function setupVault(
  passphrase: string
): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  await idbSet(VAULT_SALT_KEY, Array.from(salt))
  _vaultKey = await deriveKey(passphrase, Array.from(salt))
  await idbSet(VAULT_CHECK_KEY, await encryptBlob(_vaultKey, CHECK_PLAINTEXT))
  await secureSet(SNAP_INDEX_KEY, [])
}

export async function unlockVault(passphrase: string): Promise<void> {
  const saltArr = await idbGet<number[]>(VAULT_SALT_KEY)
  if (!saltArr) throw new Error('Vault not initialized')
  const key = await deriveKey(passphrase, saltArr)
  const checkBlob = await idbGet<EncryptedBlob>(VAULT_CHECK_KEY)
  if (!checkBlob) throw new Error('Vault check missing')
  const checkVal = await decryptBlob<string>(key, checkBlob)
  if (checkVal !== CHECK_PLAINTEXT) throw new Error('Incorrect passphrase')
  _vaultKey = key
}

export async function isVaultInitialized(): Promise<boolean> {
  try {
    const salt = await idbGet(VAULT_SALT_KEY)
    return !!salt
  } catch { return false }
}

export async function clearVault(): Promise<void> {
  await idbDel(VAULT_SALT_KEY)
  await idbDel(VAULT_CHECK_KEY)
  _vaultKey = null
}

export { RETENTION_DAYS, SNAP_INDEX_KEY }
