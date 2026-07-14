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
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
        Geração de mundo é uma categoria avançada de mod. Rooms definem o conteúdo real (terreno +
        prefabs); Tasks agrupam Rooms numa área navegável, com progressão por trava/chave. O ponto
        exato de registro desses arquivos a partir do <code>modmain.lua</code> ainda não foi
        confirmado — veja o README gerado.
      </p>
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {SUBTABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSubtab(t.key)}
            className={`px-3 py-1.5 text-sm font-medium border-b-2 -mb-px ${
              subtab === t.key
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
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
