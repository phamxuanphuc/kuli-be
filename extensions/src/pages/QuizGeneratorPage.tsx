import { AppLayout } from '../components/AppLayout'
import { PageSummary } from '../components/PageSummary'
import { QuestionList } from '../components/QuestionList'
import { QuizControls } from '../components/QuizControls'
import { useQuizGenerator } from '../hooks/useQuizGenerator'

export function QuizGeneratorPage() {
  const { snapshot, questions, error, isScanning, isGenerating, scanPage, generateQuestions } = useQuizGenerator()

  return (
    <AppLayout title="Quiz">
      <div className="swiss-noise flex flex-col gap-4 bg-white p-4 text-left text-black">
        <div className="border border-black bg-white p-4 text-black shadow-[6px_6px_0_#111]">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-black/45">Utility</p>
          <h1 className="mt-2 text-4xl font-black uppercase leading-[0.85] tracking-[-0.08em]">Quiz</h1>
          <p className="mt-3 max-w-[32rem] text-sm font-bold leading-6 text-black/65">
            Scan the active page, collect markdown and media, then generate a compact quiz for fast review.
          </p>
        </div>

        <QuizControls
          hasSnapshot={Boolean(snapshot)}
          error={error}
          isScanning={isScanning}
          isGenerating={isGenerating}
          onScanPage={scanPage}
          onGenerateQuestions={generateQuestions}
        />

        {snapshot ? <PageSummary snapshot={snapshot} /> : null}

        <QuestionList questions={questions} />
      </div>
    </AppLayout>
  )
}
