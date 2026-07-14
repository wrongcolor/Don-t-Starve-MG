import { useState } from 'react'
import { useModProjectStore } from '../../store/modProjectStore'
import { TaskForm } from '../forms/TaskForm'
import { btnPrimary, btnSecondary, btnDanger } from '../forms/FormField'
import type { TaskDef } from '../../types/worldContent'

export function TasksPanel() {
  const tasks = useModProjectStore((s) => s.project.tasks)
  const upsertTask = useModProjectStore((s) => s.upsertTask)
  const removeTask = useModProjectStore((s) => s.removeTask)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const editingTask = editingId ? tasks.find((t) => t.id === editingId) : undefined

  const handleSave = (task: TaskDef) => {
    upsertTask(task)
    setEditingId(null)
    setAdding(false)
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Tasks (áreas do mapa)</h2>
        {!adding && !editingId && (
          <button className={btnPrimary} onClick={() => setAdding(true)}>
            + Nova task
          </button>
        )}
      </div>

      {tasks.length === 0 && !adding && (
        <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma task adicionada ainda.</p>
      )}

      {!adding && !editingId && (
        <ul className="space-y-1">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center justify-between rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2"
            >
              <div>
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{task.id}</span>
                {task.regionId && <span className="ml-2 text-xs text-slate-400">ilha: {task.regionId}</span>}
              </div>
              <div className="flex gap-2">
                <button className={btnSecondary} onClick={() => setEditingId(task.id)}>
                  Editar
                </button>
                <button className={btnDanger} onClick={() => removeTask(task.id)}>
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(adding || editingTask) && (
        <TaskForm
          key={editingId ?? 'new'}
          initialTask={editingTask}
          onSave={handleSave}
          onCancel={() => {
            setAdding(false)
            setEditingId(null)
          }}
        />
      )}
    </div>
  )
}
