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
      addLabel="New task"
      emptyMessage="No tasks added yet."
      emptyHint="No area has been explored yet — mark the first one on the map."
      tip="Tasks group Rooms into a navigable area, with progression via locks and keys."
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
