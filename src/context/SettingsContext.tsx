import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { AIProvider } from '@/types'
import { AI_PROVIDERS, getAIProvider, setAIProvider, getAIKey, setAIKey, clearAIKey, hasAIKey } from '@/lib/ai/client'
import { isVaultInitialized, setupVault, unlockVault, isVaultUnlocked, clearVault } from '@/lib/vault'

type VaultStatus = 'loading' | 'locked' | 'unlocked' | 'setup'

interface SettingsContextValue {
  provider: AIProvider
  setProvider: (p: AIProvider) => void
  key: string
  hasKey: boolean
  saveKey: (k: string) => void
  clearKey: () => void
  providerLabel: string
  providerPlaceholder: string
  providerHint: string
  vaultStatus: VaultStatus
  vaultError: string
  initiateVaultSetup: (passphrase: string) => Promise<void>
  initiateVaultUnlock: (passphrase: string) => Promise<void>
  initiateVaultReset: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [provider, setProviderState] = useState<AIProvider>(getAIProvider)
  const [apiKey, setApiKey] = useState(getAIKey)
  const [vaultStatus, setVaultStatus] = useState<VaultStatus>('loading')
  const [vaultError, setVaultError] = useState('')

  useEffect(() => {
    isVaultInitialized().then(initialized => {
      if (initialized) setVaultStatus(isVaultUnlocked() ? 'unlocked' : 'locked')
      else setVaultStatus('setup')
    }).catch(() => setVaultStatus('setup'))
  }, [])

  const setProvider = useCallback((p: AIProvider) => {
    setAIProvider(p)
    setProviderState(p)
    setApiKey(getAIKey())
  }, [])

  const saveKey = useCallback((k: string) => {
    setAIKey(k)
    setApiKey(k)
  }, [])

  const clearKey = useCallback(() => {
    clearAIKey()
    setApiKey('')
  }, [])

  const initVaultSetup = useCallback(async (passphrase: string) => {
    setVaultError('')
    try {
      await setupVault(passphrase)
      setVaultStatus('unlocked')
    } catch (e) {
      setVaultError('Setup failed. Please try again.')
    }
  }, [])

  const initVaultUnlock = useCallback(async (passphrase: string) => {
    setVaultError('')
    try {
      await unlockVault(passphrase)
      setVaultStatus('unlocked')
    } catch (e) {
      setVaultError((e as Error).message || 'Incorrect passphrase.')
    }
  }, [])

  const initVaultReset = useCallback(async () => {
    try {
      await clearVault()
      setVaultStatus('setup')
      setVaultError('')
    } catch (e) {
      setVaultError('Reset failed.')
    }
  }, [])

  const pDef = AI_PROVIDERS[provider]

  return (
    <SettingsContext.Provider value={{
      provider,
      setProvider,
      key: apiKey,
      hasKey: !!apiKey,
      saveKey,
      clearKey,
      providerLabel: pDef.label,
      providerPlaceholder: pDef.placeholder,
      providerHint: pDef.hint,
      vaultStatus,
      vaultError,
      initiateVaultSetup: initVaultSetup,
      initiateVaultUnlock: initVaultUnlock,
      initiateVaultReset: initVaultReset,
    }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
