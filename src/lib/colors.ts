import type { ProductType } from '@/types'

interface PaletteEntry {
  color: string
  bg: string
}

export const TYPE_PALETTES: Record<ProductType, PaletteEntry[]> = {
  trading:  [{ color: '#0473EA', bg: 'rgba(4,115,234,0.12)' },  { color: '#3399f5', bg: 'rgba(51,153,245,0.12)' },  { color: '#66b3ff', bg: 'rgba(102,179,255,0.12)' }],
  agric:    [{ color: '#e67e22', bg: 'rgba(230,126,34,0.12)' }, { color: '#f39c12', bg: 'rgba(243,156,18,0.12)' },  { color: '#d4880a', bg: 'rgba(212,136,10,0.12)' }],
  salary:   [{ color: '#00b894', bg: 'rgba(0,184,148,0.12)' },  { color: '#00cec9', bg: 'rgba(0,206,201,0.12)' },  { color: '#55efc4', bg: 'rgba(85,239,196,0.12)' }],
  property: [{ color: '#6c5ce7', bg: 'rgba(108,92,231,0.12)' }, { color: '#a29bfe', bg: 'rgba(162,155,254,0.12)' }, { color: '#8e7ff5', bg: 'rgba(142,127,245,0.12)' }],
  vehicle:  [{ color: '#0984e3', bg: 'rgba(9,132,227,0.12)' },  { color: '#74b9ff', bg: 'rgba(116,185,255,0.12)' }, { color: '#4ea8de', bg: 'rgba(78,168,222,0.12)' }],
  sme:      [{ color: '#e17055', bg: 'rgba(225,112,85,0.12)' }, { color: '#d35400', bg: 'rgba(211,84,0,0.12)' },   { color: '#f0856e', bg: 'rgba(240,133,110,0.12)' }],
  personal: [{ color: '#e84393', bg: 'rgba(232,67,147,0.12)' }, { color: '#fd79a8', bg: 'rgba(253,121,168,0.12)' }, { color: '#d63685', bg: 'rgba(214,54,133,0.12)' }],
  std:      [{ color: '#636e72', bg: 'rgba(99,110,114,0.12)' }, { color: '#b2bec3', bg: 'rgba(178,190,195,0.12)' }, { color: '#808e91', bg: 'rgba(128,142,145,0.12)' }],
}

const _typeProductIndex: Record<string, Record<string, number>> = {}

export function getProductColor(productName: string, type: ProductType): PaletteEntry {
  const safeType: ProductType = TYPE_PALETTES[type] ? type : 'std'
  if (!_typeProductIndex[safeType]) _typeProductIndex[safeType] = {}
  if (_typeProductIndex[safeType][productName] === undefined) {
    _typeProductIndex[safeType][productName] = Object.keys(_typeProductIndex[safeType]).length
  }
  const idx = _typeProductIndex[safeType][productName]
  const palette = TYPE_PALETTES[safeType]
  return palette[idx % palette.length]
}

export function resetProductColors() {
  Object.keys(_typeProductIndex).forEach(k => delete _typeProductIndex[k])
}

export const TYPE_LABELS: Record<ProductType, string> = {
  trading: 'Trading', agric: 'Agric', salary: 'Salary / Staff',
  property: 'Property', vehicle: 'Vehicle', sme: 'SME / Business',
  personal: 'Personal', std: 'Standard'
}
