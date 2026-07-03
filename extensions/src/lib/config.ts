const STORAGE_KEY = 'VITE_KULI_BE_BASE_URL'
const FALLBACK = import.meta.env.VITE_KULI_BE_BASE_URL ?? 'http://127.0.0.1:8000'

export function getKuliBeBaseUrl(): string {
  const stored = localStorage.getItem(STORAGE_KEY)?.trim()
  return (stored || FALLBACK).replace(/\/$/, '')
}

export function setKuliBeBaseUrl(value: string): void {
  localStorage.setItem(STORAGE_KEY, value.trim())
}
