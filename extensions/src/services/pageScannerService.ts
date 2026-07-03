import { getKuliBeBaseUrl } from '../lib/config'
import type { PageSnapshot } from '../types'

const noReceivingEndMessage = 'Receiving end does not exist'

async function convertHtmlToMarkdown(snapshot: PageSnapshot): Promise<string> {
  const formData = new FormData()
  const filename = `${snapshot.title.trim() || 'index'}.html`.replace(/[\\/:*?"<>|]+/g, '-')
  const file = new File([snapshot.html], filename, { type: 'text/html' })

  formData.append('file', file)

  const response = await fetch(`${getKuliBeBaseUrl()}/html-file-to-markdown`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Could not convert page HTML to Markdown. Status: ${response.status}`)
  }

  return response.text()
}

async function saveScanHistory(snapshot: PageSnapshot): Promise<void> {
  const response = await fetch(`${getKuliBeBaseUrl()}/scan-history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(snapshot),
  })

  if (!response.ok) {
    throw new Error(`Could not save scan history. Status: ${response.status}`)
  }
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

  const snapshot = await requestTabScan(tab.id)
  const markdown = await convertHtmlToMarkdown(snapshot)
  const snapshotWithMarkdown = { ...snapshot, markdown }
  await saveScanHistory(snapshotWithMarkdown)

  return snapshotWithMarkdown
}
