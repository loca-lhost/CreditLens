import { useState, useEffect, useCallback } from 'react'
import { useSettings } from '@/context/SettingsContext'
import Button from '@/components/shared/Button'
import styles from './VaultGate.module.css'

export default function VaultGate() {
  const {
    vaultStatus, vaultError,
    initiateVaultSetup, initiateVaultUnlock, initiateVaultReset,
  } = useSettings()

  const [pass1, setPass1] = useState('')
  const [pass2, setPass2] = useState('')
  const [unlockPass, setUnlockPass] = useState('')
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    setLocalError('')
  }, [vaultStatus])

  useEffect(() => {
    if (vaultError) setLocalError(vaultError)
  }, [vaultError])

  const handleSetup = useCallback(async () => {
    setLocalError('')
    if (!pass1 || pass1.length < 8) { setLocalError('Passphrase must be at least 8 characters.'); return }
    if (pass1 !== pass2) { setLocalError('Passphrases do not match.'); return }
    setLocalError('Setting up encryption…')
    await initiateVaultSetup(pass1)
  }, [pass1, pass2, initiateVaultSetup])

  const handleUnlock = useCallback(async () => {
    setLocalError('')
    if (!unlockPass) { setLocalError('Please enter your passphrase.'); return }
    setLocalError('Checking…')
    await initiateVaultUnlock(unlockPass)
  }, [unlockPass, initiateVaultUnlock])

  const handleReset = useCallback(async () => {
    if (!confirm('This will permanently delete all encrypted snapshots and officer data. You will need to re-upload your portfolio file. Continue?')) return
    await initiateVaultReset()
  }, [initiateVaultReset])

  if (vaultStatus === 'loading' || vaultStatus === 'unlocked') return null

  return (
    <div className={styles.gate}>
      <div className={styles.card}>
        <div className={styles.lockIcon}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
        </div>

        {vaultStatus === 'setup' ? (
          <>
            <h2 className={styles.title}>Secure Your Portfolio Data</h2>
            <p className={styles.sub}>Create a passphrase to encrypt all loan data stored on this device. You will need this every time you open the app.</p>
            <input className={styles.input} type="password" placeholder="Create passphrase (min. 8 characters)" value={pass1} onChange={e => setPass1(e.target.value)} autoComplete="new-password" autoFocus />
            <input className={styles.input} type="password" placeholder="Confirm passphrase" value={pass2} onChange={e => setPass2(e.target.value)} autoComplete="new-password"
              onKeyDown={e => e.key === 'Enter' && handleSetup()} />
            <div className={styles.error}>{localError}</div>
            <div className={styles.actions}>
              <Button variant="primary" onClick={handleSetup} large style={{ flex: 1 }}>Set Passphrase &amp; Continue</Button>
            </div>
            <p className={styles.hint}>&#128274; Data is encrypted with AES-256-GCM. Your passphrase never leaves this device. If forgotten, all stored data will need to be cleared.</p>
          </>
        ) : (
          <>
            <h2 className={styles.title}>Enter Your Passphrase</h2>
            <p className={styles.sub}>Enter your passphrase to decrypt and access stored loan data.</p>
            <input className={styles.input} type="password" placeholder="Passphrase" value={unlockPass} onChange={e => setUnlockPass(e.target.value)} autoComplete="current-password" autoFocus
              onKeyDown={e => e.key === 'Enter' && handleUnlock()} />
            <div className={styles.error}>{localError}</div>
            <div className={styles.actions}>
              <Button variant="primary" onClick={handleUnlock} large style={{ flex: 1 }}>Unlock</Button>
            </div>
            <Button variant="outline" style={{ width: '100%', marginTop: 10, padding: 11, fontSize: 12 }} onClick={handleReset}>
              Forgot passphrase — clear all data &amp; start fresh
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
