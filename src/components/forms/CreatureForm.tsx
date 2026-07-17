import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  creatureDefSchema,
  CREATURE_BEHAVIORS,
  VANILLA_CREATURE_BUILDS,
  type CreatureDef,
} from '../../types/modProject'
import { FormField, Fieldset, FormHeader, FormFooter, inputClass, btnDanger } from './FormField'
import { CreaturePreview } from './CreaturePreview'

interface CreatureFormProps {
  initialCreature?: CreatureDef
  onSave: (creature: CreatureDef) => void
  onCancel?: () => void
}

const DEFAULT_CLIPS = { idle: 'idle', walk: 'walk', atk: 'atk', hit: 'hit', death: 'death' }

const emptyCreature: CreatureDef = {
  id: '',
  displayName: '',
  description: '',
  animation: { source: 'custom' },
  stats: { health: 100, damage: 20, attackPeriod: 2, walkSpeed: 4 },
  loot: [{ prefab: 'monstermeat', chance: 1 }],
  behavior: 'neutral',
  tags: [],
}

export function CreatureForm({ initialCreature, onSave, onCancel }: CreatureFormProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreatureDef>({
    resolver: zodResolver(creatureDefSchema),
    defaultValues: initialCreature ?? emptyCreature,
  })

  const loot = useFieldArray({ control, name: 'loot' })
  const tags = useFieldArray({ control, name: 'tags' as never })

  const [animationSource, setAnimationSource] = useState<'custom' | 'vanilla'>(
    (initialCreature ?? emptyCreature).animation?.source ?? 'custom',
  )
  const watched = watch()
  const enableAttackRange = watched.stats?.attackRange !== undefined
  const enableSanityAura = watched.sanityAura !== undefined
  const enableCookable = watched.cookable !== undefined

  const onSubmit = (data: CreatureDef) => onSave(data)

  return (
    <>
      <form className="main" onSubmit={handleSubmit(onSubmit)}>
        <FormHeader icon="👹" title={initialCreature ? initialCreature.displayName : 'Nova Criatura'} />

        <div className="main-scroll">
          <div className="grid-2">
            <Fieldset legend="Identidade" step={1}>
              <div className="row-2">
                <FormField label="Id (identificador interno)" error={errors.id?.message}>
                  <input className={inputClass} {...register('id')} disabled={!!initialCreature} placeholder="minha_criatura" />
                </FormField>
                <FormField label="Comportamento">
                  <select className={inputClass} {...register('behavior')}>
                    {CREATURE_BEHAVIORS.map((b) => (
                      <option key={b} value={b}>
                        {b === 'passive' ? 'Passiva (foge/vagueia)' : b === 'neutral' ? 'Neutra (revida se atacada)' : 'Hostil (ataca por conta própria)'}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <FormField label="Nome exibido" error={errors.displayName?.message}>
                <input className={inputClass} {...register('displayName')} />
              </FormField>

              <FormField label="Descrição (inspect)" error={errors.description?.message}>
                <textarea className={inputClass} rows={2} {...register('description')} />
              </FormField>
            </Fieldset>

            <Fieldset legend="Animação" step={2}>
              <div className="checks">
                <label>
                  <input
                    type="radio"
                    name="creature-animation-source"
                    checked={animationSource === 'custom'}
                    onChange={() => {
                      setAnimationSource('custom')
                      setValue('animation', { source: 'custom' })
                    }}
                  />
                  Vou criar minha própria animação (build próprio, anim/&lt;id&gt;.zip)
                </label>
                <label>
                  <input
                    type="radio"
                    name="creature-animation-source"
                    checked={animationSource === 'vanilla'}
                    onChange={() => {
                      setAnimationSource('vanilla')
                      setValue('animation', {
                        source: 'vanilla',
                        build: VANILLA_CREATURE_BUILDS[0].build,
                        clips: DEFAULT_CLIPS,
                      })
                    }}
                  />
                  Usar uma animação já existente no jogo
                </label>
              </div>

              {animationSource === 'vanilla' && (
                <>
                  <FormField label="Build">
                    <select className={inputClass} {...register('animation.build' as const)}>
                      {VANILLA_CREATURE_BUILDS.map((b) => (
                        <option key={b.build} value={b.build}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <p className="field hint">Nomes das animações usadas nesse build (ajuste se necessário — não confirmado contra os arquivos do jogo):</p>
                  <div className="row-2">
                    <FormField label="Idle">
                      <input className={inputClass} {...register('animation.clips.idle' as const)} />
                    </FormField>
                    <FormField label="Andar">
                      <input className={inputClass} {...register('animation.clips.walk' as const)} />
                    </FormField>
                    <FormField label="Ataque">
                      <input className={inputClass} {...register('animation.clips.atk' as const)} />
                    </FormField>
                    <FormField label="Acertado">
                      <input className={inputClass} {...register('animation.clips.hit' as const)} />
                    </FormField>
                    <FormField label="Morte">
                      <input className={inputClass} {...register('animation.clips.death' as const)} />
                    </FormField>
                  </div>
                </>
              )}
            </Fieldset>
          </div>

          <div className="grid-3">
            <Fieldset legend="Atributos de combate" step={3}>
              <div className="row-2">
                <FormField label="Vida">
                  <input type="number" className={inputClass} {...register('stats.health', { valueAsNumber: true })} />
                </FormField>
                <FormField label="Dano">
                  <input type="number" className={inputClass} {...register('stats.damage', { valueAsNumber: true })} />
                </FormField>
              </div>
              <div className="row-2">
                <FormField label="Período de ataque (s)">
                  <input type="number" step="0.1" className={inputClass} {...register('stats.attackPeriod', { valueAsNumber: true })} />
                </FormField>
                <FormField label="Velocidade">
                  <input type="number" step="0.1" className={inputClass} {...register('stats.walkSpeed', { valueAsNumber: true })} />
                </FormField>
              </div>

              <div className="checks">
                <label>
                  <input
                    type="checkbox"
                    checked={enableAttackRange}
                    onChange={(e) => setValue('stats.attackRange', e.target.checked ? 3 : undefined)}
                  />
                  Alcance de ataque customizado (padrão: 2)
                </label>
              </div>
              {enableAttackRange && (
                <FormField label="Alcance">
                  <input type="number" step="0.1" className={inputClass} {...register('stats.attackRange', { valueAsNumber: true })} />
                </FormField>
              )}
            </Fieldset>

            <Fieldset legend="Características" step={4}>
              <div className="checks">
                <label>
                  <input
                    type="checkbox"
                    checked={enableSanityAura}
                    onChange={(e) => setValue('sanityAura', e.target.checked ? -10 : undefined)}
                  />
                  Afeta a sanidade de quem está por perto
                </label>
              </div>
              {enableSanityAura && (
                <FormField label="Aura de sanidade (negativo = assusta)">
                  <input type="number" className={inputClass} {...register('sanityAura', { valueAsNumber: true })} />
                </FormField>
              )}

              <div className="checks">
                <label>
                  <input type="checkbox" {...register('flammable')} />
                  Pode pegar fogo
                </label>
                <label>
                  <input type="checkbox" {...register('freezable')} />
                  Pode congelar
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={enableCookable}
                    onChange={(e) => setValue('cookable', e.target.checked ? { product: 'cookedsmallmeat' } : undefined)}
                  />
                  Pode ser cozida numa fogueira
                </label>
              </div>
              {enableCookable && (
                <FormField label="Vira este prefab ao cozinhar (ex: cookedsmallmeat)">
                  <input className={inputClass} {...register('cookable.product')} />
                </FormField>
              )}
            </Fieldset>

            <Fieldset legend="Loot e tags" step={5}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', display: 'block', marginBottom: 8 }}>Loot</span>
              {loot.fields.map((field, index) => (
                <div key={field.id} className="ingredient-row">
                  <input className={inputClass} placeholder="id do prefab (ex: monstermeat)" {...register(`loot.${index}.prefab` as const)} />
                  <input type="number" step="0.01" min="0.01" max="1" className="qty-input" {...register(`loot.${index}.chance` as const, { valueAsNumber: true })} />
                  <button type="button" className={btnDanger} onClick={() => loot.remove(index)}>
                    Remover
                  </button>
                </div>
              ))}
              <button type="button" className="add-ingredient" onClick={() => loot.append({ prefab: '', chance: 1 })}>
                + Adicionar loot
              </button>

              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', display: 'block', margin: '12px 0 8px' }}>Tags extras</span>
              {tags.fields.map((field, index) => (
                <div key={field.id} className="ingredient-row">
                  <input className={inputClass} placeholder="ex: prey, largecreature" {...register(`tags.${index}` as const)} />
                  <button type="button" className={btnDanger} onClick={() => tags.remove(index)}>
                    Remover
                  </button>
                </div>
              ))}
              <button type="button" className="add-ingredient" onClick={() => tags.append('')}>
                + Adicionar tag
              </button>
            </Fieldset>
          </div>
        </div>

        <FormFooter itemName={watched.displayName || 'Nova criatura'} saveLabel={initialCreature ? 'Salvar alterações' : 'Adicionar criatura'} onCancel={onCancel} />
      </form>

      <CreaturePreview creature={watched} />
    </>
  )
}
