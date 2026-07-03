import axios from 'axios'
import type { OpenAiQuizResponse, PageMedia, PageSnapshot, QuizQuestion } from '../types'

const openAiClient = axios.create({
  baseURL: 'https://api.openai.com/v1',
})

const openAiApiKey = import.meta.env.VITE_OPENAI_API_KEY?.trim() ?? ''

function getOpenAiApiKey(): string {
  if (!openAiApiKey) {
    throw new Error('Missing VITE_OPENAI_API_KEY.')
  }

  return openAiApiKey
}

function extractJsonObject(value: string): string {
  const firstBrace = value.indexOf('{')
  const lastBrace = value.lastIndexOf('}')

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('OpenAI response did not contain JSON.')
  }

  return value.slice(firstBrace, lastBrace + 1)
}

function buildPrompt(snapshot: PageSnapshot, media: PageMedia[], questionCount: number): string {
  const compactMarkdown = snapshot.markdown.slice(0, 45000)
  const compactHtml = snapshot.html.slice(0, 15000)
  const mediaContext = media
    .map(
      (item, index) =>
        `${index + 1}. ${item.kind}: ${item.src}${item.alt ? ` | alt: ${item.alt}` : ''}${item.transcript ? ` | transcript: ${item.transcript}` : ''}`,
    )
    .join('\n')

  return `Create ${questionCount} multiple-choice questions from this web page.
Return only valid JSON matching this TypeScript type:
{
  "questions": [
    {
      "question": "string",
      "choices": [{ "id": "A", "text": "string" }, { "id": "B", "text": "string" }, { "id": "C", "text": "string" }, { "id": "D", "text": "string" }],
      "answerId": "A|B|C|D",
      "explanation": "string",
      "imageUrl": "optional image url if the question needs an image",
      "transcript": "optional transcript if the question uses video or audio"
    }
  ]
}

Page title: ${snapshot.title}
Page URL: ${snapshot.url}

Markdown content:
${compactMarkdown}

Relevant HTML fallback:
${compactHtml}

Media:
${mediaContext || 'No media found.'}`
}

async function transcribeMedia(media: PageMedia): Promise<PageMedia> {
  if (media.kind === 'image') return media

  try {
    const mediaResponse = await axios.get<Blob>(media.src, { responseType: 'blob' })
    const formData = new FormData()
    formData.append('model', 'gpt-4o-mini-transcribe')
    formData.append('file', mediaResponse.data, media.src.split('/').pop() || 'media.webm')

    const response = await openAiClient.post<{ text?: string }>('/audio/transcriptions', formData, {
      headers: {
        Authorization: `Bearer ${getOpenAiApiKey()}`,
      },
    })

    return { ...media, transcript: response.data.text }
  } catch {
    return media
  }
}

export async function enrichMediaWithTranscripts(media: PageMedia[]): Promise<PageMedia[]> {
  const limitedMedia = media.slice(0, 12)
  return Promise.all(limitedMedia.map((item) => transcribeMedia(item)))
}

export async function requestQuiz(
  snapshot: PageSnapshot,
  media: PageMedia[],
  questionCount: number,
): Promise<QuizQuestion[]> {
  const response = await openAiClient.post<{ choices?: Array<{ message?: { content?: string } }> }>(
    '/chat/completions',
    {
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'You convert page content into accurate multiple-choice questions. Use attached image URLs and transcripts when relevant.',
        },
        {
          role: 'user',
          content: buildPrompt(snapshot, media, questionCount),
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${getOpenAiApiKey()}`,
        'Content-Type': 'application/json',
      },
    },
  )

  const content = response.data.choices?.[0]?.message?.content

  if (!content) throw new Error('OpenAI response was empty.')

  const parsed = JSON.parse(extractJsonObject(content)) as OpenAiQuizResponse
  return parsed.questions ?? []
}
