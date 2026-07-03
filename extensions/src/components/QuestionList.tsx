import type { QuizQuestion } from '../types'

type QuestionListProps = {
  questions: QuizQuestion[]
}

export function QuestionList({ questions }: QuestionListProps) {
  return (
    <section className="border border-black bg-white p-4 text-black shadow-[6px_6px_0_#111]" aria-label="Generated questions">
      <div className="mb-4 flex items-end justify-between border-b border-black pb-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/50">Output</p>
          <h2 className="mt-1 text-xl font-black uppercase leading-none tracking-[-0.04em]">Questions</h2>
        </div>
        <span className="text-[11px] font-black uppercase tracking-[0.18em] text-black/45">{questions.length} item</span>
      </div>
      {questions.length === 0 ? (
        <p className="border border-dashed border-black/35 p-4 text-sm font-bold leading-6 text-black/60">
          No questions yet. Scan a page, then create a quiz.
        </p>
      ) : (
        <ol className="grid list-none gap-4 p-0">
          {questions.map((question, index) => (
            <QuestionCard index={index} question={question} key={`${question.question}-${index}`} />
          ))}
        </ol>
      )}
    </section>
  )
}

type QuestionCardProps = {
  index: number
  question: QuizQuestion
}

function QuestionCard({ index, question }: QuestionCardProps) {
  return (
    <li className="border border-black bg-white p-3">
      <div className="mb-3 flex items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center border border-black bg-white text-xs font-black text-black">{index + 1}</span>
        <h3 className="m-0 text-sm font-black leading-6 tracking-[-0.02em] text-black">{question.question}</h3>
      </div>
      {question.imageUrl ? <img className="my-3 block max-w-full border border-black" src={question.imageUrl} alt="Question attachment" /> : null}
      {question.transcript ? <p className="my-3 border border-black bg-white p-3 text-sm font-bold text-black">Transcript: {question.transcript}</p> : null}
      <ul className="grid list-none gap-2 p-0">
        {question.choices.map((choice) => {
          const isAnswer = choice.id === question.answerId
          return (
            <li className={isAnswer ? 'border border-green-700 bg-green-50 p-2 text-sm font-black text-green-800' : 'border border-black/20 p-2 text-sm font-bold text-black'} key={choice.id}>
              <strong>{choice.id}.</strong> {choice.text}
            </li>
          )
        })}
      </ul>
      {question.explanation ? <p className="mb-0 mt-3 border-l-4 border-black bg-white p-3 text-sm font-bold leading-6 text-black">{question.explanation}</p> : null}
    </li>
  )
}
