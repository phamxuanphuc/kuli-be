import { getKuliBeBaseUrl } from '../lib/config'
import { createScanHistory } from './scanHistoryService'
import type { PageSnapshot, ScanHistoryItem } from '../types'

const noReceivingEndMessage = 'Receiving end does not exist'

async function waitForTranscribeComplete(historyId: number): Promise<ScanHistoryItem> {
  return new Promise((resolve, reject) => {
    const events = new EventSource(`${getKuliBeBaseUrl()}/scan-history/${historyId}/events`)

    events.addEventListener('transcribe_complete', (event) => {
      events.close()
      resolve(JSON.parse(event.data) as ScanHistoryItem)
    })

    events.onerror = () => {
      events.close()
      reject(new Error('Could not receive transcribe completion event.'))
    }
  })
}

async function convertHtmlToMarkdown(snapshot: PageSnapshot, historyId: number): Promise<string> {
  const formData = new FormData()
  const filename = `${snapshot.title.trim() || 'index'}.html`.replace(/[\\/:*?"<>|]+/g, '-')
  const file = new File([snapshot.html], filename, { type: 'text/html' })

  formData.append('file', file)
  formData.append('history_id', String(historyId))
  formData.append('url', snapshot.url)
  formData.append('media_json', JSON.stringify(snapshot.media))

  const response = await fetch(`${getKuliBeBaseUrl()}/html-file-to-markdown`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Could not convert page HTML to Markdown. Status: ${response.status}`)
  }

  return response.text()
}

function scanPageInTab(): PageSnapshot {
  function absoluteUrl(value: string | null): string | undefined {
    if (!value) return undefined

    try {
      return new URL(value, window.location.href).href
    } catch {
      return undefined
    }
  }

  const images = Array.from(document.images).reduce<PageSnapshot['media']>((items, image) => {
    const src = absoluteUrl(image.currentSrc || image.src)
    if (!src) return items

    items.push({
      kind: 'image',
      src,
      alt: image.alt || undefined,
      title: image.title || undefined,
    })

    return items
  }, [])

  const videoAudio = Array.from(document.querySelectorAll('video,audio')).reduce<PageSnapshot['media']>((items, element) => {
    const mediaElement = element as HTMLMediaElement
    const sourceElement = mediaElement.querySelector('source')
    const src = absoluteUrl(mediaElement.currentSrc || mediaElement.src || sourceElement?.getAttribute('src') || null)
    if (!src) return items

    items.push({
      kind: element.tagName.toLowerCase() === 'video' ? 'video' : 'audio',
      src,
      title: mediaElement.title || undefined,
    })

    return items
  }, [])

  return {
    title: document.title,
    url: window.location.href,
    html: document.documentElement.outerHTML,
    markdown: '',
    media: [...images, ...videoAudio],
  }
}

async function executeTabScan(tabId: number): Promise<PageSnapshot> {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: scanPageInTab,
  })

  if (!result?.result) throw new Error('Could not scan page.')

  return result.result
}

async function requestTabScan(tabId: number): Promise<PageSnapshot> {
  try {
    return await chrome.tabs.sendMessage<PageSnapshot>(tabId, { type: 'KULI_SCAN_PAGE' })
  } catch (error) {
    if (error instanceof Error && error.message.includes(noReceivingEndMessage)) {
      return executeTabScan(tabId)
    }

    throw error
  }
}

export async function getActiveTabSnapshot(): Promise<PageSnapshot> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

  if (!tab?.id) throw new Error('No active tab found.')

  const pendingHistory = await createScanHistory({
    title: tab.title || 'Scanning page',
    url: tab.url || 'about:blank',
    html: '',
    markdown: '',
    media: [],
  })
  const snapshot = await requestTabScan(tab.id)
  const fastMarkdown = await convertHtmlToMarkdown(snapshot, pendingHistory.id)
  const completedHistory = await waitForTranscribeComplete(pendingHistory.id)

  return { ...snapshot, markdown: completedHistory.markdown || fastMarkdown }
}
