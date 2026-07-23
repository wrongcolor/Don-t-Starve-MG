import { useState } from 'react'
import { RoomsPanel } from './RoomsPanel'
import { TasksPanel } from './TasksPanel'
import { StaticLayoutsPanel } from './StaticLayoutsPanel'

const SUBTABS = [
  { key: 'rooms', label: 'Rooms' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'staticLayouts', label: 'Static layouts' },
] as const

type SubTabKey = (typeof SUBTABS)[number]['key']

export function WorldPanel() {
  const [subtab, setSubtab] = useState<SubTabKey>('rooms')

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 6, padding: '10px 14px 0' }}>
        {SUBTABS.map((t) => (
          <button key={t.key} onClick={() => setSubtab(t.key)} className={`nav-item ${subtab === t.key ? 'active' : ''}`}>
            {t.label}
          </button>
        ))}
      </div>
      {subtab === 'rooms' && <RoomsPanel />}
      {subtab === 'tasks' && <TasksPanel />}
      {subtab === 'staticLayouts' && <StaticLayoutsPanel />}
    </div>
  )
}
