import { useState } from 'react'
import { AppLayout } from '../components/AppLayout'
import { useScanHistory } from '../hooks/useScanHistory'
import type { ScanHistoryItem } from '../types'

export function HistoryPage() {
  const { data: history = [], error, isLoading } = useScanHistory()
  const [selectedHistory, setSelectedHistory] = useState<ScanHistoryItem>()
  const activeHistory = selectedHistory ?? history[0]

  return (
    <AppLayout title="History">
      <div className="swiss-noise flex flex-col gap-4 bg-white p-4 text-left text-black">
        <div className="border border-black bg-white p-4 text-black shadow-[6px_6px_0_#111]">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-black/45">Library</p>
          <h1 className="mt-2 text-4xl font-black uppercase leading-[0.85] tracking-[-0.08em]">History</h1>
          <p className="mt-3 max-w-[32rem] text-sm font-bold leading-6 text-black/65">
            View scanned pages, inspect markdown content, and copy it when needed.
          </p>
        </div>

        {isLoading ? <StatusMessage message="Loading history..." /> : null}
        {error ? <StatusMessage message={error instanceof Error ? error.message : 'Could not load history.'} tone="error" /> : null}
        {!isLoading && !error && history.length === 0 ? <StatusMessage message="No scan history yet." /> : null}

        {history.length > 0 ? (
          <section className="grid gap-4" aria-label="Scan history">
            <div className="border border-black bg-white p-4 shadow-[6px_6px_0_#111]">
              <div className="mb-3 border-b border-black pb-3">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/50">Saved scans</p>
                <h2 className="mt-1 text-xl font-black uppercase leading-none tracking-[-0.04em]">History list</h2>
              </div>
              <div className="grid max-h-72 gap-2 overflow-auto pr-1">
                {history.map((item) => (
                  <HistoryListItem
                    item={item}
                    isActive={activeHistory?.id === item.id}
                    key={item.id}
                    onSelect={() => setSelectedHistory(item)}
                  />
                ))}
              </div>
            </div>

            {activeHistory ? <HistoryDetail item={activeHistory} /> : null}
          </section>
        ) : null}
      </div>
    </AppLayout>
  )
}

type StatusMessageProps = {
  message: string
  tone?: 'default' | 'error'
}

function StatusMessage({ message, tone = 'default' }: StatusMessageProps) {
  const className =
    tone === 'error'
      ? 'border border-red-600 bg-red-50 p-3 text-sm font-bold text-red-700 shadow-[6px_6px_0_#111]'
      : 'border border-black bg-white p-3 text-sm font-bold text-black shadow-[6px_6px_0_#111]'

  return <p className={className}>{message}</p>
}

type HistoryListItemProps = {
  item: ScanHistoryItem
  isActive: boolean
  onSelect: () => void
}

function HistoryListItem({ item, isActive, onSelect }: HistoryListItemProps) {
  return (
    <button
      className={`border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#111] ${
        isActive ? 'border-black bg-[#ff3000] text-black' : 'border-black/20 bg-white text-black'
      }`}
      type="button"
      onClick={onSelect}
    >
      <span className="block truncate text-sm font-black uppercase tracking-[-0.02em]">{item.title || 'Untitled page'}</span>
      <span className="mt-1 block truncate text-[11px] font-bold text-black/60">{item.url}</span>
      <span className="mt-2 block text-[10px] font-black uppercase tracking-[0.16em] text-black/45">
        {formatDate(item.created_at)}
      </span>
    </button>
  )
}

type HistoryDetailProps = {
  item: ScanHistoryItem
}

function HistoryDetail({ item }: HistoryDetailProps) {
  const [copyLabel, setCopyLabel] = useState('Copy content')

  async function copyContent() {
    await navigator.clipboard.writeText(item.markdown)
    setCopyLabel('Copied')
    window.setTimeout(() => setCopyLabel('Copy content'), 1500)
  }

  return (
    <article className="border border-black bg-white p-4 text-black shadow-[6px_6px_0_#111]" aria-label="Scan history detail">
      <div className="mb-4 border-b border-black pb-3">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-black/50">Detail</p>
        <h2 className="mt-1 text-xl font-black uppercase leading-none tracking-[-0.04em]">{item.title || 'Untitled page'}</h2>
      </div>

      <dl className="grid gap-3">
        <DetailItem label="URL" value={item.url} />
        <DetailItem label="Markdown" value={`${item.markdown.length.toLocaleString()} characters`} />
        <DetailItem label="Media" value={`${item.media.length} items`} />
        <DetailItem label="Scanned at" value={formatDate(item.created_at)} />
      </dl>

      <div className="mt-4 border-t border-black pt-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/45">Markdown content</p>
          <button
            className="border border-black bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-black transition hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#111] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            type="button"
            onClick={copyContent}
            disabled={!item.markdown}
          >
            {copyLabel}
          </button>
        </div>
        <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap border border-black/20 bg-black/[0.03] p-3 text-xs font-semibold leading-5 text-black">
          {item.markdown || 'No markdown content returned.'}
        </pre>
      </div>
    </article>
  )
}

type DetailItemProps = {
  label: string
  value: string
}

function DetailItem({ label, value }: DetailItemProps) {
  return (
    <div className="grid gap-1 border-b border-black/15 pb-2 last:border-b-0 last:pb-0">
      <dt className="text-[10px] font-black uppercase tracking-[0.18em] text-black/45">{label}</dt>
      <dd className="m-0 wrap-break-word text-sm font-bold leading-5 text-black">{value}</dd>
    </div>
  )
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}
