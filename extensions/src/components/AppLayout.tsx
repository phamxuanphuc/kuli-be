import type { ReactNode } from 'react'
import { MdArrowBack, MdHome, MdSettings } from 'react-icons/md'
import { Link, useNavigate } from 'react-router-dom'

type AppLayoutProps = {
  title: string
  children: ReactNode
  subtitle?: string
  showBack?: boolean
  showHome?: boolean
  showSettings?: boolean
  onSettingsClick?: () => void
}

export function AppLayout({
  title,
  children,
  subtitle,
  showBack = true,
  showHome = true,
  showSettings = true,
  onSettingsClick,
}: AppLayoutProps) {
  return (
    <main className="flex min-h-[560px] w-[420px] flex-col bg-white text-black swiss-noise">
      <AppChromeHeader
        title={title}
        showBack={showBack}
        showHome={showHome}
        showSettings={showSettings}
        onSettingsClick={onSettingsClick}
      />
      {subtitle ? (
        <section className="border-b-4 border-black bg-[#f2f2f2] px-5 py-4 swiss-dots">
          <p className="max-w-[34ch] text-xs font-bold uppercase leading-5 tracking-[0.08em]">{subtitle}</p>
        </section>
      ) : null}
      <div className="flex-1">{children}</div>
    </main>
  )
}

type AppChromeHeaderProps = {
  title: string
  showBack: boolean
  showHome: boolean
  showSettings: boolean
  onSettingsClick?: () => void
}

function AppChromeHeader({ title, showBack, showHome, showSettings, onSettingsClick }: AppChromeHeaderProps) {
  const navigate = useNavigate()

  return (
    <header className="grid grid-cols-[44px_44px_1fr_44px] items-center border-b-4 border-black bg-white">
      {showBack ? (
        <button
          aria-label="Back"
          className="grid size-11 place-items-center border-r-4 border-black transition duration-150 ease-linear hover:bg-[#ff3000]"
          type="button"
          onClick={() => navigate(-1)}
        >
          <MdArrowBack aria-hidden="true" size={24} />
        </button>
      ) : null}

      {showHome ? (
        <Link
          aria-label="Home"
          className="grid size-11 place-items-center border-r-4 border-black transition duration-150 ease-linear hover:bg-[#ff3000]"
          to="/"
        >
          <MdHome aria-hidden="true" size={24} />
        </Link>
      ) : null}

      <h1 className="truncate px-4 text-sm font-black uppercase tracking-[0.14em]">{title}</h1>

      {showSettings ? (
        <button
          aria-label="Settings"
          className="grid size-11 place-items-center border-l-4 border-black transition duration-150 ease-linear hover:bg-[#ff3000]"
          type="button"
          onClick={onSettingsClick ?? (() => navigate('/settings'))}
        >
          <MdSettings aria-hidden="true" size={24} />
        </button>
      ) : null}
    </header>
  )
}
