import { Link } from 'react-router-dom'
import { MdSettings } from 'react-icons/md'

type UtilityItem = {
  id: string
  name: string
  href: string
  logo: string
  status: 'Ready' | 'Soon'
}

const utilities: UtilityItem[] = [
  {
    id: '01',
    name: 'Page Quiz',
    href: '/quiz',
    logo: 'QZ',
    status: 'Ready',
  },
  {
    id: '02',
    name: 'Summary',
    href: '#',
    logo: 'SM',
    status: 'Soon',
  },
  {
    id: '03',
    name: 'Media',
    href: '#',
    logo: 'MX',
    status: 'Soon',
  },
  {
    id: '04',
    name: 'Prompt Lab',
    href: '#',
    logo: 'PL',
    status: 'Soon',
  },
  {
    id: '05',
    name: 'Cleaner',
    href: '#',
    logo: 'CL',
    status: 'Soon',
  },
  {
    id: '06',
    name: 'Export',
    href: '#',
    logo: 'EX',
    status: 'Soon',
  },
  {
    id: '07',
    name: 'Reader',
    href: '#',
    logo: 'RD',
    status: 'Soon',
  },
  {
    id: '08',
    name: 'Translate',
    href: '#',
    logo: 'TR',
    status: 'Soon',
  },
  {
    id: '09',
    name: 'Capture',
    href: '#',
    logo: 'CP',
    status: 'Soon',
  },
]

export function HomePage() {
  return (
    <main className="min-h-[560px] w-[420px] bg-white px-5 py-5 text-black swiss-noise">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-[13px] font-black uppercase tracking-[0.18em]">Utilities</h1>
        <Link
          aria-label="Settings"
          className="grid size-9 place-items-center border-2 border-black transition duration-150 ease-linear hover:bg-[#ff3000]"
          to="/settings"
        >
          <MdSettings aria-hidden="true" size={20} />
        </Link>
      </header>

      <section className="grid grid-cols-3 gap-x-7 gap-y-7" aria-label="Utility apps">
        {utilities.map((utility) => (
          <UtilityCard utility={utility} key={utility.id} />
        ))}
      </section>
    </main>
  )
}

type UtilityCardProps = {
  utility: UtilityItem
}

function UtilityCard({ utility }: UtilityCardProps) {
  const isReady = utility.status === 'Ready'
  const content = (
    <article className="group grid justify-items-center gap-2 text-center">
      <span className="relative grid size-[74px] place-items-center overflow-hidden rounded-[18px] border-2 border-black bg-white text-[22px] font-black uppercase leading-none tracking-[-0.08em] shadow-[4px_4px_0_#000] transition duration-150 ease-linear group-hover:-translate-y-0.5 group-hover:bg-[#ff3000] group-focus-visible:bg-[#ff3000]">
        <span className="absolute inset-0 swiss-grid-pattern opacity-70" />
        <span className="relative z-10">{utility.logo}</span>
      </span>
      <span className="max-w-[86px] text-[13px] font-semibold leading-[1.15] tracking-[-0.01em] text-black">{utility.name}</span>
    </article>
  )

  if (!isReady) {
    return (
      <div aria-disabled="true" className="cursor-not-allowed opacity-80">
        {content}
      </div>
    )
  }

  return (
    <Link className="block rounded-[18px] outline-none focus-visible:ring-2 focus-visible:ring-[#ff3000] focus-visible:ring-offset-4" to={utility.href}>
      {content}
    </Link>
  )
}
