import { useState } from 'react'
import { ModMetaForm } from './components/forms/ModMetaForm'
import { ItemsPanel } from './components/panels/ItemsPanel'
import { CharactersPanel } from './components/panels/CharactersPanel'
import { CreaturesPanel } from './components/panels/CreaturesPanel'
import { WorldPanel } from './components/panels/WorldPanel'
import { ReaderPanel } from './components/panels/ReaderPanel'
import { GenerateButton } from './components/GenerateButton'

const TABS = [
  { key: 'meta', label: 'Metadata', icon: '📋' },
  { key: 'items', label: 'Items', icon: '⚔️' },
  { key: 'characters', label: 'Characters', icon: '🧑' },
  { key: 'creatures', label: 'Creatures', icon: '👹' },
  { key: 'world', label: 'World', icon: '🌍' },
  { key: 'reader', label: 'Reader', icon: '🔍' },
] as const

type TabKey = (typeof TABS)[number]['key']

function App() {
  const [tab, setTab] = useState<TabKey>('meta')

  return (
    <div className="app">
      <div className="topnav">
        <div className="logo">
          Don't Starve Mod
          <small>Creator</small>
        </div>
        {TABS.map((t) => (
          <button key={t.key} className={`nav-item ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.icon} {t.label}
          </button>
        ))}
        <div className="nav-spacer">
          <GenerateButton />
        </div>
      </div>

      {tab === 'meta' && (
        <div className="layout-single animate-fade-in-up">
          <ModMetaForm />
        </div>
      )}
      {tab === 'items' && <ItemsPanel />}
      {tab === 'characters' && <CharactersPanel />}
      {tab === 'creatures' && <CreaturesPanel />}
      {tab === 'world' && <WorldPanel />}
      {tab === 'reader' && (
        <div className="layout-single animate-fade-in-up">
          <ReaderPanel />
        </div>
      )}
    </div>
  )
}

export default App
