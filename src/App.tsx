import { useState, type ReactNode } from 'react'
import { ModMetaForm } from './components/forms/ModMetaForm'
import { ItemsPanel } from './components/panels/ItemsPanel'
import { CharactersPanel } from './components/panels/CharactersPanel'
import { CreaturesPanel } from './components/panels/CreaturesPanel'
import { WorldPanel } from './components/panels/WorldPanel'
import { ReaderPanel } from './components/panels/ReaderPanel'
import { GenerateButton } from './components/GenerateButton'

function IconScroll() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <path d="M6 4h11a2 2 0 0 1 2 2v13a1 1 0 0 1-1.5.866L15 18.5l-2.5 1.5-2.5-1.5-2.5 1.5V6a2 2 0 0 0-2-2Z" />
      <path d="M6 4a2 2 0 0 0-2 2v1h2" />
      <path d="M9 9h6M9 12.5h6" />
    </svg>
  )
}
function IconSword() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <path d="m14.5 3.5 6 6-2 2-6-6z" />
      <path d="M12.5 5.5 4 14v3h3l8.5-8.5" />
      <path d="M4 17l3 3" />
      <path d="m17 6-1.5 1.5" />
    </svg>
  )
}
function IconMask() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <path d="M4 9c0-3 3.5-5 8-5s8 2 8 5-2 8-8 8-8-5-8-8Z" />
      <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
      <path d="M9.5 14c1 1 4 1 5 0" />
    </svg>
  )
}
function IconPaw() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <ellipse cx="12" cy="16" rx="5" ry="4" />
      <circle cx="6" cy="9" r="1.6" />
      <circle cx="10.5" cy="6.5" r="1.6" />
      <circle cx="15.5" cy="6.5" r="1.6" />
      <circle cx="19" cy="9.5" r="1.6" />
    </svg>
  )
}
function IconMap() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <path d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2Z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  )
}
function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m20 20-4.3-4.3" />
    </svg>
  )
}
function IconFlame() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 text-ember-400 animate-flicker" fill="currentColor" stroke="none">
      <path d="M12 2c1.5 3 .5 5-1 7s-2.5 4.5-.5 7c-1-2.5.5-4 1.5-5 .3 2 1.3 3 2.5 3.5 2.5 1 4.5-1 4.5-4 0-2.5-2-4.5-3.5-6.5.5 2-.5 3.5-2 4C14 6 13 4 12 2Z" />
    </svg>
  )
}

const TABS = [
  { key: 'meta', label: 'Metadados', icon: IconScroll },
  { key: 'items', label: 'Itens', icon: IconSword },
  { key: 'characters', label: 'Personagens', icon: IconMask },
  { key: 'creatures', label: 'Criaturas', icon: IconPaw },
  { key: 'world', label: 'Mundo', icon: IconMap },
  { key: 'reader', label: 'Leitura', icon: IconSearch },
] as const

type TabKey = (typeof TABS)[number]['key']

const PANELS: Record<TabKey, ReactNode> = {
  meta: <ModMetaForm />,
  items: <ItemsPanel />,
  characters: <CharactersPanel />,
  creatures: <CreaturesPanel />,
  world: <WorldPanel />,
  reader: <ReaderPanel />,
}

// Simple silhouette skyline pinned to the bottom of the sidebar — decorative,
// low-opacity, doesn't compete with the nav for attention.
function TreelineDecoration() {
  return (
    <svg viewBox="0 0 220 60" preserveAspectRatio="none" className="pointer-events-none h-14 w-full text-ink-700/70" fill="currentColor">
      <path d="M0 60V38l14-16 6 8 10-22 12 26 8-10 10 18 14-30 12 24 16-14 8 16 20-20 10 14 18-10 12 12 14-8 16 16 10-6v24Z" />
    </svg>
  )
}

function App() {
  const [tab, setTab] = useState<TabKey>('meta')
  const activeTab = TABS.find((t) => t.key === tab)!

  return (
    <div className="flex min-h-screen">
      <aside className="relative flex w-56 shrink-0 flex-col overflow-hidden border-r border-ink-700 bg-ink-900/70">
        <div className="border-b border-ink-700 px-4 py-5">
          <h1 className="flex items-center gap-1.5 font-display text-lg leading-tight text-ember-400">
            <IconFlame />
            Don't Starve
          </h1>
          <p className="font-display text-xs leading-tight text-parchment-300">Mod Creator</p>
        </div>

        <nav className="flex-1 space-y-1 p-2">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`group flex w-full items-center gap-2.5 rounded px-3 py-2 text-left text-sm transition-all duration-200 ${
                  active
                    ? 'translate-x-0.5 border-l-2 border-ember-400 bg-ember-500/10 text-ember-300'
                    : 'border-l-2 border-transparent text-parchment-300 hover:translate-x-0.5 hover:bg-ink-800 hover:text-parchment-100'
                }`}
              >
                <span
                  className={`flex size-7 items-center justify-center rounded transition-transform duration-200 group-hover:scale-110 ${
                    active ? 'animate-ember-pulse bg-ember-500/20' : ''
                  }`}
                >
                  <Icon />
                </span>
                {t.label}
              </button>
            )
          })}
        </nav>

        <TreelineDecoration />

        <p className="border-t border-ink-700 bg-ink-900 px-4 py-3 text-[11px] text-parchment-400">
          100% no navegador — nada é enviado a um servidor.
        </p>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="relative flex items-center justify-between border-b border-ink-700 bg-ink-900/40 px-6 py-4">
          <h2 className="font-display text-base text-parchment-100">{activeTab.label}</h2>
          <GenerateButton />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-ember-500/50 to-transparent" />
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-6">
          <div key={tab} className="animate-fade-in-up">
            {PANELS[tab]}
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
