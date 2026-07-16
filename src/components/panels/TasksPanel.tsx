import { useModProjectStore } from '../../store/modProjectStore'
import { TaskForm } from '../forms/TaskForm'
import { EntityListPanel } from './EntityListPanel'

export function TasksPanel() {
  const tasks = useModProjectStore((s) => s.project.tasks)
  const upsertTask = useModProjectStore((s) => s.upsertTask)
  const removeTask = useModProjectStore((s) => s.removeTask)

  return (
    <EntityListPanel
      title="Tasks (áreas do mapa)"
      addLabel="+ Nova task"
      emptyMessage="Nenhuma task adicionada ainda."
      items={tasks}
      getLabel={(task) => task.id}
      getMeta={(task) => (task.regionId ? `ilha: ${task.regionId}` : '')}
      onUpsert={upsertTask}
      onRemove={removeTask}
      renderForm={({ initial, onSave, onCancel }) => (
        <TaskForm initialTask={initial} onSave={onSave} onCancel={onCancel} />
      )}
    />
  )
}
