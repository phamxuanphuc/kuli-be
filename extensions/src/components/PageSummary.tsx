import { useState } from 'react'
import type { PageSnapshot } from '../types'

type PageSummaryProps = {
  snapshot: PageSnapshot
}

export function PageSummary({ snapshot }: PageSummaryProps) {
  const [copyLabel, setCopyLabel] = useState('Copy content')

  async function copyMarkdownContent() {
    await navigator.clipboard.writeText(snapshot.markdown)
    setCopyLabel('Copied')
    window.setTimeout(() => setCopyLabel('Copy content'), 1500)
  }

  return (
    <section className="border border-black bg-white p-4 text-black shadow-[6px_6px_0_#111]" aria-label="Scanned page summary">
      <div className="mb-4 border-b border-black pb-3">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/50">Source</p>
        <h2 className="mt-1 text-xl font-black uppercase leading-none tracking-[-0.04em]">Scanned page</h2>
      </div>
      <dl className="grid gap-3">
        <SummaryItem label="Title" value={snapshot.title || 'Untitled'} />
        <SummaryItem label="URL" value={snapshot.url} />
        <SummaryItem label="Markdown" value={`${snapshot.markdown.length.toLocaleString()} characters`} />
        <SummaryItem label="Media" value={`${snapshot.media.length} items`} />
      </dl>
      <div className="mt-4 border-t border-black pt-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/45">Markdown content</p>
          <button
            className="border border-black bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-black transition hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#111] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            type="button"
            onClick={copyMarkdownContent}
            disabled={!snapshot.markdown}
          >
            {copyLabel}
          </button>
        </div>
        <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap border border-black/20 bg-black/[0.03] p-3 text-xs font-semibold leading-5 text-black">
          {snapshot.markdown || 'No markdown content returned.'}
        </pre>
      </div>
    </section>
  )
}

type SummaryItemProps = {
  label: string
  value: string
}

function SummaryItem({ label, value }: SummaryItemProps) {
  return (
    <div className="grid gap-1 border-b border-black/15 pb-2 last:border-b-0 last:pb-0">
      <dt className="text-[10px] font-black uppercase tracking-[0.18em] text-black/45">{label}</dt>
      <dd className="m-0 wrap-break-word text-sm font-bold leading-5 text-black">{value}</dd>
    </div>
  )
}
