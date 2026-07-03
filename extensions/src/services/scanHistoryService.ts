import { getKuliBeBaseUrl } from '../lib/config'
import type { ScanHistoryItem } from '../types'

export async function getScanHistory(): Promise<ScanHistoryItem[]> {
  const response = await fetch(`${getKuliBeBaseUrl()}/scan-history`)

  if (!response.ok) {
    throw new Error(`Could not load scan history. Status: ${response.status}`)
  }

  return response.json()
}

export async function createScanHistory(snapshot: Pick<ScanHistoryItem, 'title' | 'url' | 'html' | 'markdown' | 'media'>) {
  const response = await fetch(`${getKuliBeBaseUrl()}/scan-history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(snapshot),
  })

  if (!response.ok) {
    throw new Error(`Could not create scan history. Status: ${response.status}`)
  }

  return response.json() as Promise<ScanHistoryItem>
}

