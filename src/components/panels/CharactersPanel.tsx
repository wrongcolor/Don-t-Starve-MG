import { useModProjectStore } from '../../store/modProjectStore'
import { CharacterForm } from '../forms/CharacterForm'
import { EntityListPanel } from './EntityListPanel'

export function CharactersPanel() {
  const characters = useModProjectStore((s) => s.project.characters)
  const upsertCharacter = useModProjectStore((s) => s.upsertCharacter)
  const removeCharacter = useModProjectStore((s) => s.removeCharacter)

  return (
    <EntityListPanel
      title="Personagens jogáveis"
      addLabel="+ Novo personagem"
      emptyMessage="Nenhum personagem adicionado ainda."
      items={characters}
      getLabel={(character) => character.name}
      onUpsert={upsertCharacter}
      onRemove={removeCharacter}
      renderForm={({ initial, onSave, onCancel }) => (
        <CharacterForm initialCharacter={initial} onSave={onSave} onCancel={onCancel} />
      )}
    />
  )
}
