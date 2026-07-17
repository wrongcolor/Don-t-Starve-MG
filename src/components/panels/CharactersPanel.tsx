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
      title="Personagens"
      addLabel="Novo personagem"
      emptyMessage="Nenhum personagem adicionado ainda."
      emptyHint="O acampamento está sem sobreviventes — crie o primeiro."
      tip="Personagens herdam a fala do Wilson por padrão — ajuste falas específicas depois de gerar o mod."
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
