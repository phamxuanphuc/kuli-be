import { useQuery } from '@tanstack/react-query'
import { getScanHistory } from '../services/scanHistoryService'

/**
 * Loads scan history records from the backend.
 */
export function useScanHistory() {
  return useQuery({
    queryKey: ['scan-history'],
    queryFn: getScanHistory,
  })
}
