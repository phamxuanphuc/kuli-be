export type PageMediaKind = 'image' | 'video' | 'audio'

export type PageMedia = {
  kind: PageMediaKind
  src: string
  alt?: string
  title?: string
  transcript?: string
}

export type PageSnapshot = {
  title: string
  url: string
  html: string
  markdown: string
  media: PageMedia[]
}

export type QuizChoice = {
  id: string
  text: string
}

export type QuizQuestion = {
  question: string
  choices: QuizChoice[]
  answerId: string
  explanation?: string
  imageUrl?: string
  transcript?: string
}

export type OpenAiQuizResponse = {
  questions: QuizQuestion[]
}
