import { getKuliBeBaseUrl } from '../lib/config'
import type { ScanHistoryItem } from '../types'

export async function getScanHistory(): Promise<ScanHistoryItem[]> {
  const response = await fetch(`${getKuliBeBaseUrl()}/scan-history`)

  if (!response.ok) {
    throw new Error(`Could not load scan history. Status: ${response.status}`)
  }

  return response.json()
}
