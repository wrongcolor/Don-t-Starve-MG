import { useModProjectStore } from '../../store/modProjectStore'
import { TaskForm } from '../forms/TaskForm'
import { EntityListPanel } from './EntityListPanel'
import { taskVisual } from './entityVisuals'

export function TasksPanel() {
  const tasks = useModProjectStore((s) => s.project.tasks)
  const upsertTask = useModProjectStore((s) => s.upsertTask)
  const removeTask = useModProjectStore((s) => s.removeTask)

  return (
    <EntityListPanel
      headerIcon="📍"
      title="Tasks"
      addLabel="Nova task"
      emptyMessage="Nenhuma task adicionada ainda."
      emptyHint="Nenhuma área foi explorada ainda — marque a primeira no mapa."
      tip="Tasks agrupam Rooms numa área navegável, com progressão por trava (lock) e chave (key)."
      items={tasks}
      getLabel={(task) => task.id}
      getIcon={(task) => taskVisual(!!task.regionId)}
      onUpsert={upsertTask}
      onRemove={removeTask}
      renderForm={({ initial, onSave, onCancel }) => (
        <TaskForm initialTask={initial} onSave={onSave} onCancel={onCancel} />
      )}
    />
  )
}
