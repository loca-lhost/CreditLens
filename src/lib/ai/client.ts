import type { AIProvider } from '@/types'

const AI_PROVIDER_KEY = 'creditlens_ai_provider'

interface AICallOptions {
  temperature?: number
  maxTokens?: number
}

interface AIProviderDef {
  label: string
  keyStore: string
  placeholder: string
  hint: string
  model: string
  call: (key: string, prompt: string, opts: AICallOptions) => Promise<string>
}

export const AI_PROVIDERS: Record<AIProvider, AIProviderDef> = {
  gemini: {
    label: 'Google Gemini',
    keyStore: 'creditlens_gemini_key',
    placeholder: 'AIzaSy...',
    hint: 'Get a free key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Google AI Studio</a>',
    model: 'gemini-2.5-flash-lite',
    async call(key, prompt, opts) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`
      const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: opts.temperature ?? 0.4, maxOutputTokens: opts.maxTokens ?? 512 },
      }
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }, body: JSON.stringify(body) })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `Gemini error ${res.status}`)
      }
      const data = await res.json()
      return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    },
  },
  groq: {
    label: 'Groq (Llama 3)',
    keyStore: 'creditlens_groq_key',
    placeholder: 'gsk_...',
    hint: 'Get a free key at <a href="https://console.groq.com/keys" target="_blank" rel="noopener">Groq Console</a>',
    model: 'llama-3.3-70b-versatile',
    async call(key, prompt, opts) {
      const url = 'https://api.groq.com/openai/v1/chat/completions'
      const body = {
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: opts.temperature ?? 0.4,
        max_tokens: opts.maxTokens ?? 512,
      }
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `Groq error ${res.status}`)
      }
      const data = await res.json()
      return data.choices?.[0]?.message?.content || ''
    },
  },
  openrouter: {
    label: 'OpenRouter',
    keyStore: 'creditlens_openrouter_key',
    placeholder: 'sk-or-...',
    hint: 'Get a free key at <a href="https://openrouter.ai/keys" target="_blank" rel="noopener">OpenRouter</a>. Multiple free models available.',
    model: 'meta-llama/llama-3.3-70b-instruct',
    async call(key, prompt, opts) {
      const url = 'https://openrouter.ai/api/v1/chat/completions'
      const body = {
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: opts.temperature ?? 0.4,
        max_tokens: opts.maxTokens ?? 512,
      }
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'CreditLens',
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `OpenRouter error ${res.status}`)
      }
      const data = await res.json()
      return data.choices?.[0]?.message?.content || ''
    },
  },
}

const AI_THROTTLE_MS = 5000
let _lastAICall = 0

export function getAIProvider(): AIProvider {
  const stored = localStorage.getItem(AI_PROVIDER_KEY)
  if (stored === 'gemini' || stored === 'groq' || stored === 'openrouter') return stored
  return 'gemini'
}

export function setAIProvider(p: AIProvider) {
  localStorage.setItem(AI_PROVIDER_KEY, p)
}

export function getAIProviderDef(): AIProviderDef {
  return AI_PROVIDERS[getAIProvider()]
}

export function getAIKey(): string {
  return localStorage.getItem(getAIProviderDef().keyStore) || ''
}

export function setAIKey(k: string) {
  localStorage.setItem(getAIProviderDef().keyStore, k)
}

export function clearAIKey() {
  localStorage.removeItem(getAIProviderDef().keyStore)
}

export function hasAIKey(): boolean {
  return !!getAIKey()
}

export async function aiCall(prompt: string, opts: AICallOptions = {}): Promise<string> {
  const key = getAIKey()
  if (!key) throw new Error('No API key configured')
  const now = Date.now()
  const wait = AI_THROTTLE_MS - (now - _lastAICall)
  if (wait > 0) await new Promise(r => setTimeout(r, wait))
  _lastAICall = Date.now()
  return getAIProviderDef().call(key, prompt, opts)
}
