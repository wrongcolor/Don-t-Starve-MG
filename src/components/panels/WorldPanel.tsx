import { useState } from 'react'
import { RoomsPanel } from './RoomsPanel'
import { TasksPanel } from './TasksPanel'

const SUBTABS = [
  { key: 'rooms', label: 'Rooms' },
  { key: 'tasks', label: 'Tasks' },
] as const

type SubTabKey = (typeof SUBTABS)[number]['key']

export function WorldPanel() {
  const [subtab, setSubtab] = useState<SubTabKey>('rooms')

  return (
    <div className="space-y-4">
      <p className="text-xs text-parchment-400 max-w-2xl">
        Geração de mundo é uma categoria avançada de mod. Rooms definem o conteúdo real (terreno +
        prefabs); Tasks agrupam Rooms numa área navegável, com progressão por trava/chave. O ponto
        exato de registro desses arquivos a partir do <code>modmain.lua</code> ainda não foi
        confirmado — veja o README gerado.
      </p>
      <div className="flex gap-1 border-b border-ink-700">
        {SUBTABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSubtab(t.key)}
            className={`px-3 py-1.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              subtab === t.key
                ? 'border-ember-400 text-ember-300'
                : 'border-transparent text-parchment-400 hover:text-parchment-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {subtab === 'rooms' && <RoomsPanel />}
      {subtab === 'tasks' && <TasksPanel />}
    </div>
  )
}
