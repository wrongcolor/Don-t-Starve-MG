import { useState } from 'react'
import JSZip from 'jszip'
import { parseModFiles, type ParsedModSummary } from '../../parsers/modReader'
import { Card, FormHeader } from '../forms/FormField'

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
    <div>
      <FormHeader icon="🔍" title="Leitura de mod pronto" />

      <div className="card panel" style={{ marginTop: 12 }}>
        <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 12 }}>
          Envie o <code>.zip</code> do mod ou os arquivos <code>.lua</code> (modinfo.lua, modmain.lua) para ver o
          que foi detectado. É apenas uma leitura de referência — nada aqui altera os itens, personagens ou
          criaturas do seu projeto atual.
        </p>

        <label className="block">
          <span className="sr-only">Selecionar arquivos do mod</span>
          <input
            type="file"
            multiple
            accept=".lua,.zip"
            onChange={(e) => handleFiles(e.target.files)}
            style={{ fontSize: 13, color: 'var(--ink-soft)' }}
            className="file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-[var(--gold)] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-[var(--wood-dark)]"
          />
        </label>

        {busy && <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 8 }}>Lendo arquivos...</p>}
        {error && <p className="field error">{error}</p>}
      </div>

      {summary && (
        <div className="space-y-6" style={{ marginTop: 12 }}>
          <p style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
            {fileCount} arquivo(s) enviado(s), {summary.filesParsed} arquivo(s) .lua analisado(s).
          </p>

          {summary.fileErrors.length > 0 && (
            <section className="card panel" style={{ borderColor: 'var(--accent-red)' }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-red)' }}>Arquivos que não puderam ser lidos</h3>
              <ul style={{ marginTop: 4, fontSize: 12, color: 'var(--accent-red)' }}>
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
              <table style={{ width: '100%', fontSize: 13 }}>
                <tbody>
                  {Object.entries(summary.meta).map(([key, value]) => (
                    <tr key={key} style={{ borderBottom: '1px solid var(--parchment-line)' }}>
                      <td style={{ padding: '4px 16px 4px 0', fontFamily: 'monospace', fontSize: 11, color: 'var(--ink-soft)' }}>{key}</td>
                      <td style={{ padding: '4px 0', color: 'var(--ink)' }}>{String(value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {summary.prefabFiles.length > 0 && (
            <Section title={`Prefabs (${summary.prefabFiles.length})`}>
              <div className="preview-tags" style={{ marginBottom: 0 }}>
                {summary.prefabFiles.map((p) => (
                  <span key={p} className="preview-tag" style={{ color: 'var(--ink)', background: '#f4ecd6', border: '1px solid var(--parchment-line)' }}>
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
                  <Card key={recipe.name} className="p-2" style={{ fontSize: 13 }}>
                    <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{recipe.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                      Ingredientes: {recipe.ingredients.map((i) => `${i.prefab} x${i.amount}`).join(', ') || '—'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                      Tech: {recipe.tech ?? '—'} · Abas: {recipe.filters.join(', ') || '—'}
                      {recipe.placer && ` · Placer: ${recipe.placer}`}
                    </div>
                  </Card>
                ))}
              </div>
            </Section>
          )}

          {summary.characters.length > 0 && (
            <Section title={`Personagens (${summary.characters.length})`}>
              <ul style={{ fontSize: 13 }}>
                {summary.characters.map((c) => (
                  <li key={c.id}>
                    <span style={{ fontFamily: 'monospace', color: 'var(--ink)' }}>{c.id}</span>{' '}
                    <span style={{ color: 'var(--ink-soft)' }}>({c.gender})</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {Object.keys(summary.names).length > 0 && (
            <Section title="Nomes (STRINGS.NAMES)">
              <table style={{ width: '100%', fontSize: 13 }}>
                <tbody>
                  {Object.entries(summary.names).map(([key, value]) => (
                    <tr key={key} style={{ borderBottom: '1px solid var(--parchment-line)' }}>
                      <td style={{ padding: '4px 16px 4px 0', fontFamily: 'monospace', fontSize: 11, color: 'var(--ink-soft)' }}>{key}</td>
                      <td style={{ padding: '4px 0', color: 'var(--ink)' }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {Object.keys(summary.tuning).length > 0 && (
            <Section title="Tuning">
              <table style={{ width: '100%', fontSize: 13 }}>
                <tbody>
                  {Object.entries(summary.tuning).map(([key, value]) => (
                    <tr key={key} style={{ borderBottom: '1px solid var(--parchment-line)' }}>
                      <td style={{ padding: '4px 16px 4px 0', fontFamily: 'monospace', fontSize: 11, color: 'var(--ink-soft)' }}>{key}</td>
                      <td style={{ padding: '4px 0', color: 'var(--ink)' }}>{String(value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {summary.filesParsed === 0 && summary.fileErrors.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Nenhum arquivo .lua encontrado no que foi enviado.</p>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card panel">
      <h3 className="section-title" style={{ fontSize: 14 }}>
        {title}
      </h3>
      {children}
    </section>
  )
}
