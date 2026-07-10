import { useState } from 'react'
import { ModMetaForm } from './components/forms/ModMetaForm'
import { ItemsPanel } from './components/panels/ItemsPanel'
import { CharactersPanel } from './components/panels/CharactersPanel'
import { CreaturesPanel } from './components/panels/CreaturesPanel'
import { ReaderPanel } from './components/panels/ReaderPanel'
import { GenerateButton } from './components/GenerateButton'

const TABS = [
  { key: 'meta', label: 'Metadados' },
  { key: 'items', label: 'Itens' },
  { key: 'characters', label: 'Personagens' },
  { key: 'creatures', label: 'Criaturas' },
  { key: 'reader', label: 'Leitura' },
] as const

type TabKey = (typeof TABS)[number]['key']

function App() {
  const [tab, setTab] = useState<TabKey>('meta')

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">DST Mod Creator</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Gera os arquivos Lua de um mod de Don't Starve Together — 100% no navegador.
            </p>
          </div>
          <GenerateButton />
        </div>
      </header>

      <nav className="mx-auto max-w-5xl px-4 pt-4">
        <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
                tab === t.key
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {tab === 'meta' && <ModMetaForm />}
        {tab === 'items' && <ItemsPanel />}
        {tab === 'characters' && <CharactersPanel />}
        {tab === 'creatures' && <CreaturesPanel />}
        {tab === 'reader' && <ReaderPanel />}
      </main>
    </div>
  )
}

export default App
