import { useState } from 'react'
import { saveAs } from 'file-saver'
import { useModProjectStore } from '../store/modProjectStore'
import { buildModZip } from '../generators/zipBuilder'

export function GenerateButton() {
  const project = useModProjectStore((s) => s.project)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const hasContent =
    project.items.length +
      project.characters.length +
      project.creatures.length +
      project.rooms.length +
      project.tasks.length >
    0
  const canGenerate = project.meta.name.trim().length > 0 && hasContent

  const handleGenerate = async () => {
    setError(null)
    setBusy(true)
    try {
      const blob = await buildModZip(project)
      const folderName = project.meta.name.replace(/[^a-zA-Z0-9_-]/g, '') || 'DSTMod'
      saveAs(blob, `${folderName}.zip`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const title = !canGenerate
    ? 'Fill in the mod name and add at least 1 item, character, creature, room, or task.'
    : (error ?? undefined)

  return (
    <button className="nav-item" style={{ opacity: !canGenerate || busy ? 0.5 : 1 }} disabled={!canGenerate || busy} onClick={handleGenerate} title={title}>
      {busy ? '⏳ Generating...' : '📤 Generate mod (.zip)'}
    </button>
  )
}
