import { create } from 'zustand'
import type { PageSnapshot, QuizQuestion } from '../types'

type QuizGeneratorState = {
  questionCount: number
  snapshot?: PageSnapshot
  questions: QuizQuestion[]
  error?: string
}

type QuizGeneratorActions = {
  setQuestionCount: (questionCount: number) => void
  setSnapshot: (snapshot: PageSnapshot) => void
  setQuestions: (questions: QuizQuestion[]) => void
  setError: (error?: string) => void
  updateSnapshotMedia: (media: PageSnapshot['media']) => void
}

export const useQuizGeneratorStore = create<QuizGeneratorState & QuizGeneratorActions>((set) => ({
  questionCount: 5,
  questions: [],
  setQuestionCount: (questionCount) => set({ questionCount }),
  setSnapshot: (snapshot) => set({ snapshot }),
  setQuestions: (questions) => set({ questions }),
  setError: (error) => set({ error }),
  updateSnapshotMedia: (media) =>
    set((state) => ({
      snapshot: state.snapshot ? { ...state.snapshot, media } : state.snapshot,
    })),
}))
