import type { PageMedia, PageSnapshot } from './types'

type ScanPageMessage = {
  type: 'KULI_SCAN_PAGE'
}

function absoluteUrl(value: string | null): string | undefined {
  if (!value) return undefined

  try {
    return new URL(value, window.location.href).href
  } catch {
    return undefined
  }
}

function collectMedia(): PageMedia[] {
  const images = Array.from(document.images).reduce<PageMedia[]>((items, image) => {
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

  const videoAudio = Array.from(document.querySelectorAll('video,audio')).reduce<PageMedia[]>(
    (items, element) => {
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
    },
    [],
  )

  return [...images, ...videoAudio]
}

function scanPage(): PageSnapshot {
  const html = document.documentElement.outerHTML

  return {
    title: document.title,
    url: window.location.href,
    html,
    markdown: '',
    media: collectMedia(),
  }
}

function isScanPageMessage(message: unknown): message is ScanPageMessage {
  return typeof message === 'object' && message !== null && 'type' in message && message.type === 'KULI_SCAN_PAGE'
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isScanPageMessage(message)) return false

  sendResponse(scanPage())
  return true
})
