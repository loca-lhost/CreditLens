const maskMap = new Map<string, string>()
let maskCounter = 0

export function resetMask() {
  maskMap.clear()
  maskCounter = 0
}

export function maskName(name: string): string {
  if (!name) return 'Unknown'
  if (maskMap.has(name)) return maskMap.get(name)!
  maskCounter++
  const alias = `Customer_${String(maskCounter).padStart(3, '0')}`
  maskMap.set(name, alias)
  return alias
}
