import { useMutation } from '@tanstack/react-query'
import { enrichMediaWithTranscripts, requestQuiz } from '../services/openAiQuizService'
import { getActiveTabSnapshot } from '../services/pageScannerService'
import { useQuizGeneratorStore } from '../stores/quizGeneratorStore'

/**
 * Owns popup actions and delegates state to Zustand plus async work to React Query mutations.
 */
export function useQuizGenerator() {
  const questionCount = useQuizGeneratorStore((state) => state.questionCount)
  const snapshot = useQuizGeneratorStore((state) => state.snapshot)
  const questions = useQuizGeneratorStore((state) => state.questions)
  const error = useQuizGeneratorStore((state) => state.error)
  const setSnapshot = useQuizGeneratorStore((state) => state.setSnapshot)
  const setQuestions = useQuizGeneratorStore((state) => state.setQuestions)
  const setError = useQuizGeneratorStore((state) => state.setError)
  const updateSnapshotMedia = useQuizGeneratorStore((state) => state.updateSnapshotMedia)

  const scanPageMutation = useMutation({
    mutationFn: getActiveTabSnapshot,
    onMutate: () => setError(undefined),
    onSuccess: (nextSnapshot) => setSnapshot(nextSnapshot),
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : 'Could not scan page.')
    },
  })

  const generateQuestionsMutation = useMutation({
    mutationFn: async () => {
      if (!snapshot) throw new Error('Scan a page before generating questions.')

      const media = await enrichMediaWithTranscripts(snapshot.media)
      const nextQuestions = await requestQuiz(snapshot, media, questionCount)

      return { media, questions: nextQuestions }
    },
    onMutate: () => setError(undefined),
    onSuccess: ({ media, questions: nextQuestions }) => {
      updateSnapshotMedia(media)
      setQuestions(nextQuestions)
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : 'Could not generate questions.')
    },
  })

  return {
    snapshot,
    questions,
    error,
    isScanning: scanPageMutation.isPending,
    isGenerating: generateQuestionsMutation.isPending,
    scanPage: scanPageMutation.mutate,
    generateQuestions: generateQuestionsMutation.mutate,
  }
}
