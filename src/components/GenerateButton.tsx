import { useState } from 'react'
import { saveAs } from 'file-saver'
import { useModProjectStore } from '../store/modProjectStore'
import { buildModZip } from '../generators/zipBuilder'
import { btnPrimary } from './forms/FormField'

export function GenerateButton() {
  const project = useModProjectStore((s) => s.project)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const hasContent = project.items.length + project.characters.length + project.creatures.length > 0
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

  return (
    <div className="flex flex-col items-end gap-1">
      <button className={btnPrimary} disabled={!canGenerate || busy} onClick={handleGenerate}>
        {busy ? 'Gerando...' : 'Gerar mod (.zip)'}
      </button>
      {!canGenerate && (
        <span className="text-xs text-slate-400">
          Preencha o nome do mod e adicione pelo menos 1 item, personagem ou criatura.
        </span>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
