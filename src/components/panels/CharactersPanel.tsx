import { useModProjectStore } from '../../store/modProjectStore'
import { CharacterForm } from '../forms/CharacterForm'
import { EntityListPanel } from './EntityListPanel'
import { characterVisual } from './entityVisuals'

export function CharactersPanel() {
  const characters = useModProjectStore((s) => s.project.characters)
  const upsertCharacter = useModProjectStore((s) => s.upsertCharacter)
  const removeCharacter = useModProjectStore((s) => s.removeCharacter)

  return (
    <EntityListPanel
      headerIcon="🧑"
      title="Characters"
      addLabel="New character"
      emptyMessage="No characters added yet."
      emptyHint="The camp has no survivors — create the first one."
      tip="Characters inherit Wilson's speech by default — adjust specific lines after generating the mod."
      items={characters}
      getLabel={(character) => character.name}
      getIcon={characterVisual}
      onUpsert={upsertCharacter}
      onRemove={removeCharacter}
      renderForm={({ initial, onSave, onCancel }) => (
        <CharacterForm initialCharacter={initial} onSave={onSave} onCancel={onCancel} />
      )}
    />
  )
}
