import { useState } from 'react'
import { AppLayout } from '../components/AppLayout'
import { getKuliBeBaseUrl, setKuliBeBaseUrl } from '../lib/config'

export function SettingsPage() {
  const [value, setValue] = useState(getKuliBeBaseUrl)
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setKuliBeBaseUrl(value)
    setSaved(true)
  }

  return (
    <AppLayout title="Settings" showSettings={false}>
      <form
        className="swiss-noise flex flex-col gap-4 bg-white p-4 text-left text-black"
        onSubmit={(event) => {
          event.preventDefault()
          handleSave()
        }}
      >
        <label className="flex flex-col gap-2">
          <span className="text-[11px] font-black uppercase tracking-[0.28em] text-black/45">
            VITE_KULI_BE_BASE_URL
          </span>
          <input
            className="border-2 border-black bg-white px-3 py-2 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-[#ff3000]"
            type="url"
            placeholder="http://127.0.0.1:8000"
            value={value}
            onChange={(event) => {
              setValue(event.target.value)
              setSaved(false)
            }}
          />
        </label>

        <button
          className="border-2 border-black bg-black px-4 py-2 text-sm font-black uppercase tracking-[0.14em] text-white shadow-[4px_4px_0_#000] transition duration-150 ease-linear hover:bg-[#ff3000]"
          type="submit"
        >
          Save
        </button>

        {saved ? <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#ff3000]">Saved</p> : null}
      </form>
    </AppLayout>
  )
}
