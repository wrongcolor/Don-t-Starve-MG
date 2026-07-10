import { useState } from 'react'
import JSZip from 'jszip'
import { parseModFiles, type ParsedModSummary } from '../../parsers/modReader'

async function collectLuaFiles(fileList: FileList): Promise<Record<string, string>> {
  const files: Record<string, string> = {}

  for (const file of Array.from(fileList)) {
    if (file.name.toLowerCase().endsWith('.zip')) {
      const zip = await JSZip.loadAsync(file)
      for (const [path, entry] of Object.entries(zip.files)) {
        if (entry.dir || !path.toLowerCase().endsWith('.lua')) continue
        files[path] = await entry.async('string')
      }
    } else if (file.name.toLowerCase().endsWith('.lua')) {
      files[file.name] = await file.text()
    }
  }

  return files
}

export function ReaderPanel() {
  const [summary, setSummary] = useState<ParsedModSummary | null>(null)
  const [fileCount, setFileCount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    setBusy(true)
    setError(null)
    try {
      const files = await collectLuaFiles(fileList)
      setFileCount(Object.keys(files).length)
      setSummary(parseModFiles(files))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Leitura de mod pronto</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Envie o <code>.zip</code> do mod ou os arquivos <code>.lua</code> (modinfo.lua, modmain.lua) para ver o
          que foi detectado. É apenas uma leitura de referência — nada aqui altera os itens, personagens ou
          criaturas do seu projeto atual.
        </p>
      </div>

      <label className="block">
        <span className="sr-only">Selecionar arquivos do mod</span>
        <input
          type="file"
          multiple
          accept=".lua,.zip"
          onChange={(e) => handleFiles(e.target.files)}
          className="block w-full text-sm text-slate-600 dark:text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-indigo-500"
        />
      </label>

      {busy && <p className="text-sm text-slate-500">Lendo arquivos...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {summary && (
        <div className="space-y-6">
          <p className="text-xs text-slate-400">
            {fileCount} arquivo(s) enviado(s), {summary.filesParsed} arquivo(s) .lua analisado(s).
          </p>

          {summary.fileErrors.length > 0 && (
            <section className="rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950 p-3">
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Arquivos que não puderam ser lidos
              </h3>
              <ul className="mt-1 space-y-1 text-xs text-amber-700 dark:text-amber-400">
                {summary.fileErrors.map((err) => (
                  <li key={err.path}>
                    <code>{err.path}</code>: {err.message}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {Object.keys(summary.meta).length > 0 && (
            <Section title="Metadados (modinfo.lua)">
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(summary.meta).map(([key, value]) => (
                    <tr key={key} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-1 pr-4 font-mono text-xs text-slate-500">{key}</td>
                      <td className="py-1 text-slate-800 dark:text-slate-200">{String(value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {summary.prefabFiles.length > 0 && (
            <Section title={`Prefabs (${summary.prefabFiles.length})`}>
              <div className="flex flex-wrap gap-1.5">
                {summary.prefabFiles.map((p) => (
                  <span
                    key={p}
                    className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-mono text-slate-700 dark:text-slate-300"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {summary.recipes.length > 0 && (
            <Section title={`Receitas (${summary.recipes.length})`}>
              <div className="space-y-2">
                {summary.recipes.map((recipe) => (
                  <div key={recipe.name} className="rounded-md border border-slate-200 dark:border-slate-700 p-2 text-sm">
                    <div className="font-medium text-slate-900 dark:text-slate-100">{recipe.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Ingredientes:{' '}
                      {recipe.ingredients.map((i) => `${i.prefab} x${i.amount}`).join(', ') || '—'}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Tech: {recipe.tech ?? '—'} · Abas: {recipe.filters.join(', ') || '—'}
                      {recipe.placer && ` · Placer: ${recipe.placer}`}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {summary.characters.length > 0 && (
            <Section title={`Personagens (${summary.characters.length})`}>
              <ul className="space-y-1 text-sm">
                {summary.characters.map((c) => (
                  <li key={c.id}>
                    <span className="font-mono">{c.id}</span>{' '}
                    <span className="text-slate-500 dark:text-slate-400">({c.gender})</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {Object.keys(summary.names).length > 0 && (
            <Section title="Nomes (STRINGS.NAMES)">
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(summary.names).map(([key, value]) => (
                    <tr key={key} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-1 pr-4 font-mono text-xs text-slate-500">{key}</td>
                      <td className="py-1 text-slate-800 dark:text-slate-200">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {Object.keys(summary.tuning).length > 0 && (
            <Section title="Tuning">
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(summary.tuning).map(([key, value]) => (
                    <tr key={key} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-1 pr-4 font-mono text-xs text-slate-500">{key}</td>
                      <td className="py-1 text-slate-800 dark:text-slate-200">{String(value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {summary.filesParsed === 0 && summary.fileErrors.length === 0 && (
            <p className="text-sm text-slate-500">Nenhum arquivo .lua encontrado no que foi enviado.</p>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
      {children}
    </section>
  )
}
