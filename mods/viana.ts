import type { ModProject } from '../src/types/modProject'
import { createEmptyModProject } from '../src/types/modProject'

export const viana: ModProject = {
  ...createEmptyModProject(),
  meta: {
    name: 'Viana, the Sunwitch',
    description: 'A sun-touched witch who channels her spells through her Sun Codex.',
    author: 'Tester',
    version: '1.0.0',
    allClientsRequireMod: true,
    configOptions: [],
  },
  items: [
    {
      id: 'solarlantern',
      displayName: 'Solar Lantern',
      description: "A lantern that only drinks from the sun — no fuel item will ever refill it, only standing in daylight will.",
      category: 'generic',
      animation: { source: 'vanilla', build: 'lantern', idleClip: 'idle_off' },
      solarLantern: { maxFuel: 100, drainPerSecond: 0.1, rechargePerSecondInSunlight: 0.3, radius: 4 },
      recipe: {
        ingredients: [
          { prefab: 'twigs', amount: 2 },
          { prefab: 'goldnugget', amount: 2 },
          { prefab: 'nightmarefuel', amount: 1 },
        ],
        techLevel: 'MAGIC_TWO',
        filters: ['MAGIC'],
      },
    },
    {
      id: 'suncodex',
      displayName: 'Sun Codex',
      description: 'Holds up to 3 spells at once and channels whatever is bound inside — hold Alt and click to open it.',
      category: 'generic',
      animation: { source: 'vanilla', build: 'books', idleClip: 'book_light' },
      // Real custom inventory icon (AI-referenced concept art, converted via
      // scripts/png_to_ktex.py) — the in-world/in-hand look still reuses the
      // vanilla "books" build above, no Spriter animation available for that.
      hasCustomIcon: true,
      // Used to be two items — a Sun Staff (equipped, casts) linked to a
      // separate Sun Codex (container, holds pages). Merged into one
      // (docs/dst-knowledge/patterns.md#74): isHandheld (item.ts) only treats
      // category 'tool' or a set `weapon` field as equippable — a bare
      // category:'generic' item never gets the equippable/onequip wiring, so
      // a zero-damage weapon (same trick already used by testfirestaff) opts
      // it into the handheld/swap-build code path purely for the
      // equip-to-hand visual + hand slot (she never actually swings it, no
      // onattack wired). spellbook.containerItemId points at its OWN id —
      // this same item is both the caster and the container spells sit in.
      weapon: { damage: 0 },
      spellbook: { source: 'linkedContainer', containerItemId: 'suncodex' },
      // A 'custom' widget needs its own anim/ui_suncodex.zip (real UI art) —
      // reproduced in-game as a load-time crash ("Could not find an asset
      // matching anim/ui_suncodex.zip"). Reusing an existing vanilla
      // container's whole widget (skin + grid) via deepcopy avoids needing
      // any new art — same reuse mechanism already used in
      // adventurersToolkit.ts (patterns.md#20).
      // sideWidget (a backpack-style panel docked next to the inventory bar)
      // is subject to the real game's own "Integrated Backpack" option/a
      // connected controller (scripts/screens/redux/playerhud.lua's
      // OpenContainer: `elseif side and (TheInput:ControllerAttached() or
      // Profile:GetIntegratedBackpack())` merges it into the main inventory
      // bar instead of showing anything on its own) — reproduced in-game as
      // "nothing visibly opens". A centered popup (sideWidget: false, reusing
      // treasurechest's own widget — pos = Vector3(0, 200, 0), i.e. actually
      // centered) is never subject to that branch at all.
      container: {
        source: 'own',
        widget: { source: 'vanilla', reusePrefab: 'treasurechest' },
        sideWidget: false,
        acceptsTag: 'spell',
      },
      // Combines both former items' own ingredient costs — this one item now
      // does the job of both the old Sun Staff and Sun Codex.
      recipe: {
        ingredients: [
          { prefab: 'twigs', amount: 2 },
          { prefab: 'goldnugget', amount: 3 },
          { prefab: 'nightmarefuel', amount: 2 },
          { prefab: 'papyrus', amount: 2 },
        ],
        techLevel: 'MAGIC_TWO',
        filters: ['MAGIC'],
      },
    },
    {
      id: 'emberwispspell',
      displayName: 'Ember Wisp Spell',
      description: 'Bind this in the Sun Codex to summon a warm, floating ember of light where she aims.',
      category: 'generic',
      animation: { source: 'vanilla', build: 'papyrus' },
      spellDef: { label: 'Ember Wisp', summonPrefab: 'emberlight', temperatureDelta: 10, manaCost: 40, aimed: true },
      recipe: {
        ingredients: [
          { prefab: 'papyrus', amount: 1 },
          { prefab: 'torch', amount: 1 },
          { prefab: 'charcoal', amount: 5 },
        ],
        techLevel: 'MAGIC_TWO',
        filters: ['MAGIC'],
      },
    },
    {
      id: 'solsticeblessingspell',
      displayName: 'Solstice Blessing Spell',
      description: 'Bind this in the Sun Codex to mend her wounds with the sun\'s warmth.',
      category: 'generic',
      animation: { source: 'vanilla', build: 'papyrus' },
      spellDef: {
        label: 'Solstice Blessing',
        healOverTime: { totalAmount: 50, perSecond: 5 },
        sanityDelta: 30,
        temperatureDelta: 15,
        manaCost: 60,
      },
      recipe: {
        ingredients: [
          { prefab: 'papyrus', amount: 2 },
          { prefab: 'spidergland', amount: 10 },
        ],
        techLevel: 'MAGIC_TWO',
        filters: ['MAGIC'],
        characterCost: { type: 'health', amount: 20 },
      },
    },
    {
      id: 'sunfedspell',
      displayName: 'Sunfed Spell',
      description: 'Bind this in the Sun Codex to feed her on sunlight alone.',
      category: 'generic',
      animation: { source: 'vanilla', build: 'papyrus' },
      spellDef: { label: 'Sunfed', hungerDelta: 20, temperatureDelta: 5, manaCost: 50 },
      recipe: {
        ingredients: [
          { prefab: 'papyrus', amount: 1 },
          { prefab: 'seeds', amount: 10 },
          { prefab: 'petals', amount: 10 },
        ],
        techLevel: 'MAGIC_TWO',
        filters: ['MAGIC'],
      },
    },
    {
      id: 'solargatespell',
      displayName: 'Solar Gate Spell',
      description: 'Bind this in the Sun Codex to raise a rift of light where she aims — step into it later to open the map and step out anywhere already explored.',
      category: 'generic',
      animation: { source: 'vanilla', build: 'papyrus' },
      spellDef: {
        label: 'Solar Gate',
        manaCost: 90,
        summonPrefab: 'sunportal',
        aimed: true,
      },
      recipe: {
        ingredients: [
          { prefab: 'papyrus', amount: 3 },
          { prefab: 'purebrilliance', amount: 3 },
          { prefab: 'solarprism', amount: 1 },
        ],
        techLevel: 'MAGIC_TWO',
        filters: ['MAGIC'],
      },
    },
    {
      id: 'solarbeamspell',
      displayName: 'Solar Beam Spell',
      description: 'Bind this in the Sun Codex to channel a beam of sunlight in front of her, burning anything it sweeps over.',
      category: 'generic',
      animation: { source: 'vanilla', build: 'papyrus' },
      spellDef: {
        label: 'Solar Beam',
        manaCost: 50,
        temperatureDelta: 10,
        beam: { damagePerTick: 35, tickIntervalSeconds: 0.5, range: 10, durationSeconds: 3, telegraphSeconds: 0.5 },
      },
      recipe: {
        ingredients: [
          { prefab: 'papyrus', amount: 1 },
          { prefab: 'goldnugget', amount: 10 },
          { prefab: 'yellowgem', amount: 2 },
        ],
        techLevel: 'MAGIC_TWO',
        filters: ['MAGIC'],
      },
    },
    {
      id: 'refractionspell',
      displayName: 'Refraction Spell',
      description: 'Bind this in the Sun Codex to turn her and any nearby allies into shimmering mirages, immune to harm for a short while.',
      category: 'generic',
      animation: { source: 'vanilla', build: 'papyrus' },
      spellDef: {
        label: 'Refraction',
        manaCost: 40,
        refraction: { radius: 5, immuneSeconds: 10 },
      },
      recipe: {
        ingredients: [
          { prefab: 'papyrus', amount: 1 },
          { prefab: 'moonglass', amount: 5 },
          { prefab: 'mandrake', amount: 1 },
        ],
        techLevel: 'MAGIC_TWO',
        filters: ['MAGIC'],
      },
    },
    {
      id: 'solarnovaspell',
      displayName: 'Solar Nova Spell',
      description: 'Bind this in the Sun Codex to burst a flare of sunlight where she aims, burning and locking in place anything caught in the blast.',
      category: 'generic',
      animation: { source: 'vanilla', build: 'papyrus' },
      spellDef: {
        label: 'Solar Nova',
        manaCost: 70,
        temperatureDelta: 15,
        nova: { damage: 200, radius: 6, stunSeconds: 3 },
      },
      recipe: {
        ingredients: [
          { prefab: 'papyrus', amount: 2 },
          { prefab: 'gunpowder', amount: 4 },
          { prefab: 'goldnugget', amount: 5 },
        ],
        techLevel: 'MAGIC_TWO',
        filters: ['MAGIC'],
      },
    },
    {
      id: 'flashbangspell',
      displayName: 'Flashbang Spell',
      description: 'Bind this in the Sun Codex to release a blinding flash around her, stunning every creature nearby — players are unaffected.',
      category: 'generic',
      animation: { source: 'vanilla', build: 'papyrus' },
      spellDef: {
        label: 'Flashbang',
        manaCost: 20,
        temperatureDelta: 3,
        flashbang: { radius: 8, stunSeconds: 4 },
      },
      recipe: {
        ingredients: [
          { prefab: 'papyrus', amount: 1 },
          { prefab: 'nightmarefuel', amount: 3 },
          { prefab: 'slurtleslime', amount: 5 },
        ],
        techLevel: 'MAGIC_TWO',
        filters: ['MAGIC'],
      },
    },
    {
      id: 'solarcagespell',
      displayName: 'Solar Cage Spell',
      description: 'Bind this in the Sun Codex to ring an area with pillars of light where she aims, trapping any enemy caught inside until they burn out.',
      category: 'generic',
      animation: { source: 'vanilla', build: 'papyrus' },
      spellDef: {
        label: 'Solar Cage',
        manaCost: 40,
        cage: { pillarPrefab: 'lightpillar', radius: 7, pillarCount: 8, rootedSeconds: 15 },
      },
      recipe: {
        ingredients: [
          { prefab: 'papyrus', amount: 3 },
          { prefab: 'nightmarefuel', amount: 10 },
          { prefab: 'fence_item', amount: 6 },
        ],
        techLevel: 'MAGIC_TWO',
        filters: ['MAGIC'],
      },
    },
    {
      id: 'desintegrationspell',
      displayName: 'Desintegration Spell',
      description: 'Bind this in the Sun Codex to mark an area with a searing light — after a long, visible wind-up, anything still caught inside is obliterated.',
      category: 'generic',
      animation: { source: 'vanilla', build: 'papyrus' },
      spellDef: {
        label: 'Desintegration',
        manaCost: 150,
        desintegrate: { radius: 6, damage: 2000, overheatDamage: 5000, castTimeSeconds: 10 },
      },
      recipe: {
        ingredients: [
          { prefab: 'papyrus', amount: 4 },
          { prefab: 'moonrocknugget', amount: 1 },
          { prefab: 'purebrilliance', amount: 5 },
        ],
        techLevel: 'MAGIC_TWO',
        filters: ['MAGIC'],
      },
    },
    {
      id: 'solargloriesspell',
      displayName: 'Solar Glories Spell',
      description: 'Bind this in the Sun Codex to call down a blade, armor, and her chakram from the sun itself, scattered in the light around her.',
      category: 'generic',
      animation: { source: 'vanilla', build: 'papyrus' },
      spellDef: {
        label: 'Solar Glories',
        manaCost: 60,
        gearDrop: { prefabs: ['solarblade', 'solararmor', 'solarchakram'], radius: 2 },
      },
      recipe: {
        ingredients: [
          { prefab: 'papyrus', amount: 2 },
          { prefab: 'nightsword', amount: 1 },
          { prefab: 'armor_sanity', amount: 1 },
        ],
        techLevel: 'MAGIC_TWO',
        filters: ['MAGIC'],
      },
    },
    {
      id: 'lightpillarspell',
      displayName: 'Solar Pillar Spell',
      description: 'Bind this in the Sun Codex to raise a towering pillar of solar light where she aims — it stands its ground and scorches any enemy that gets close, fading on its own if it stands unchallenged for too long.',
      category: 'generic',
      animation: { source: 'vanilla', build: 'papyrus' },
      spellDef: { label: 'Solar Pillar', summonPrefab: 'solarpillar', manaCost: 80, aimed: true },
      recipe: {
        ingredients: [
          { prefab: 'papyrus', amount: 3 },
          { prefab: 'redgem', amount: 5 },
          { prefab: 'deerclops_eyeball', amount: 1 },
        ],
        techLevel: 'MAGIC_TWO',
        filters: ['MAGIC'],
      },
    },
    {
      id: 'suntotem',
      displayName: 'Sun Totem',
      description: "Carve this and it carves back: use it to call up a Sun Orb, or dismiss the one you have. It only drinks from the sun — no fuel item will ever refill it, and the Orb fades the moment it runs dry.",
      category: 'generic',
      animation: { source: 'vanilla', build: 'moonrock_idol' },
      summonTotem: { summonPrefab: 'sunorb', maxDurability: 150, drainPerSecond: 0.1, rechargePerSecondInSunlight: 0.3 },
      recipe: {
        ingredients: [
          { prefab: 'twigs', amount: 3 },
          { prefab: 'goldnugget', amount: 2 },
          { prefab: 'nightmarefuel', amount: 2 },
        ],
        techLevel: 'MAGIC_TWO',
        filters: ['MAGIC'],
      },
    },
    {
      id: 'solarprism',
      displayName: 'Solar Prism',
      description: "Set it on the ground and activate it: under open sky by day, it drinks in sunlight. Use it on the Solar Lantern or Sun Totem to top off their charge, or use it on yourself to feed your own Solar Energy.",
      category: 'generic',
      animation: { source: 'vanilla', build: 'gems', idleClip: 'yellowgem_idle' },
      solarBattery: { maxCharge: 200, chargePerSecondInSunlight: 0.5 },
      recipe: {
        ingredients: [
          { prefab: 'goldnugget', amount: 3 },
          { prefab: 'nightmarefuel', amount: 3 },
        ],
        techLevel: 'MAGIC_TWO',
        filters: ['MAGIC'],
      },
    },
    {
      id: 'solarchakram',
      displayName: 'Solar Chakram',
      description: "Throw it and it bites five times over: on every hit it seeks out the next enemy nearby and leaps to it, up to 5 in a row, before spinning back into her hand.",
      category: 'weapon',
      animation: { source: 'vanilla', build: 'boomerang' },
      weapon: {
        damage: 20,
        chainReturn: { range: 15, speed: 20, maxChainHits: 5, searchRadius: 8, projectileClip: 'spin_loop' },
      },
      recipe: {
        ingredients: [
          { prefab: 'goldnugget', amount: 2 },
          { prefab: 'nightmarefuel', amount: 3 },
        ],
        techLevel: 'MAGIC_TWO',
        filters: ['MAGIC'],
      },
    },
    {
      id: 'solarblade',
      displayName: 'Solar Blade',
      description: "A blade of solidified sunlight — cuts twice as deep into creatures of shadow. Fades back into light after a while, so make it count.",
      category: 'weapon',
      animation: { source: 'vanilla', build: 'nightmaresword' },
      weapon: { damage: 80, bonusVsTag: { tag: 'shadowcreature', multiplier: 2 } },
      // No finiteuses — this doesn't wear down from use, it just fades away
      // on its own after perishTimeDays regardless of how much it's swung.
      perishable: { perishTimeDays: 0.5 },
      recipe: {
        ingredients: [
          { prefab: 'goldnugget', amount: 3 },
          { prefab: 'nightmarefuel', amount: 3 },
        ],
        techLevel: 'MAGIC_TWO',
        filters: ['WEAPONS'],
      },
    },
    {
      id: 'solararmor',
      displayName: 'Solar Armor',
      description: 'Plate woven from solidified sunlight — blocks 90% of incoming harm. Fades back into light after a while, so make it count.',
      category: 'armor',
      animation: { source: 'vanilla', build: 'armor_marble' },
      // condition is set absurdly high on purpose — this armor isn't meant to
      // wear down from combat at all, only to fade away once perishTimeDays
      // is up. Real components.armor always needs SOME condition value (see
      // its own schema comment), so this is the "never realistically breaks
      // from hits" workaround rather than a true durability-less mode.
      armor: { condition: 99999, absorption: 0.9 },
      perishable: { perishTimeDays: 0.5 },
      recipe: {
        ingredients: [
          { prefab: 'goldnugget', amount: 3 },
          { prefab: 'nightmarefuel', amount: 3 },
        ],
        techLevel: 'MAGIC_TWO',
        filters: ['ARMOUR'],
      },
    },
    {
      id: 'solarcore',
      displayName: 'Solar Core',
      description: 'A condensed core of sunlight — eat it and it permanently widens how much Solar Energy she can hold, up to a point.',
      category: 'food',
      animation: { source: 'vanilla', build: 'gems', idleClip: 'yellowgem_idle' },
      edible: { foodType: 'GOODIES', healthValue: 0, hungerValue: 0, sanityValue: 0 },
      manaBoostOnUse: { amount: 25, cap: 200 },
      recipe: {
        ingredients: [
          { prefab: 'goldnugget', amount: 4 },
          { prefab: 'nightmarefuel', amount: 3 },
        ],
        techLevel: 'MAGIC_TWO',
        filters: ['MAGIC'],
      },
    },
  ],
  characters: [
    {
      id: 'viana',
      gender: 'FEMALE',
      title: 'the Sunwitch',
      name: 'Viana',
      description: 'She traded a life under open skies for one spent bent over spellbooks — the sun still answers when she calls.',
      quote: 'The sun lends its light. I just ask for it.',
      animation: { source: 'vanilla', build: 'wendy' },
      // Real custom bigportrait (AI-referenced concept art, converted via
      // scripts/png_to_ktex.py) — the in-world body still reuses Wendy's
      // build above, no Spriter animation available for that part. The
      // avatar (crafting menu filter icon) stays a Wendy alias — no
      // dedicated avatar art was supplied.
      hasCustomPortrait: true,
      stats: { health: 120, hunger: 150, sanity: 220 },
      mana: { max: 100, regenPerSecond: 1, label: 'Solar Energy', badgeTint: [1, 0.75, 0.15, 1] },
      startingInventory: ['suncodex'],
      speechOverrides: {},
      perks: ['can_read_books'],
      damageMultiplier: 0.75,
      sanityDayGain: 1,
      sanityNightDrainMultiplier: 2,
      pauseHungerDuringDay: true,
      hungerNightMultiplier: 2,
      wetnessSanityPenalty: 3,
      summerStatBonus: 75,
      summerWalkSpeedBonusPercent: 15,
      winterStatPenalty: 50,
      overheat: {
        triggerTemp: 65,
        damageMultiplier: 1.5,
        sanityDrainPerSecond: 5,
        igniteChance: 0.15,
        speedBonusPercent: 15,
        manaRegenBonus: 10,
        manaMaxMultiplier: 2,
        crash: { afterSeconds: 30, forceTemp: 5, statDamagePercent: 0.5 },
      },
      shadowAffinity: { damageDealtMultiplier: 1.5, damageTakenMultiplier: 1.5 },
      foodTypeAffinities: [],
    },
  ],
  creatures: [
    {
      id: 'sunorb',
      displayName: 'Sun Orb',
      description: 'A living cinder of sunlight, orbiting whoever called it up — warm, bright, and quick to defend her.',
      animation: {
        source: 'vanilla',
        build: 'flameball_fx',
        clips: { idle: 'idle_loop', walk: 'idle_loop', atk: 'idle_loop', hit: 'idle_loop', death: 'post' },
      },
      stats: { health: 150, damage: 25, attackPeriod: 2, walkSpeed: 8, attackRange: 3 },
      loot: [],
      behavior: 'neutral',
      tags: [],
      panicCauses: [],
      companion: {
        followDistance: 4,
        tasks: [],
        orbit: { radius: 3, degreesPerSecond: 45, contactDamage: { day: 25, dusk: 15, night: 10 } },
      },
      light: { radius: 10, intensity: 0.8, falloff: 0.8, colour: { r: 255, g: 140, b: 20 } },
      sanityAura: 10,
      heatAura: 40,
      invincible: true,
    },
    {
      id: 'lightpillar',
      displayName: 'Light Pillar',
      description: 'A column of solidified sunlight, rooted to the spot where it was raised — it burns anything that strays too close.',
      animation: {
        source: 'vanilla',
        build: 'flameball_fx',
        clips: { idle: 'idle_loop', walk: 'idle_loop', atk: 'idle_loop', hit: 'idle_loop', death: 'post' },
      },
      stats: { health: 200, damage: 20, attackPeriod: 1.5, walkSpeed: 0.1 },
      loot: [],
      behavior: 'neutral',
      tags: [],
      panicCauses: [],
      sentry: { radius: 6 },
      light: { radius: 8, intensity: 0.8, falloff: 0.8, colour: { r: 255, g: 220, b: 150 } },
    },
    {
      id: 'solarpillar',
      displayName: 'Solar Pillar',
      description: 'A towering column of solidified sunlight, rooted to the spot where it was raised — it scorches anything that strays too close, and fades on its own if it stands unchallenged for too long.',
      animation: {
        source: 'vanilla',
        build: 'flameball_fx',
        clips: { idle: 'idle_loop', walk: 'idle_loop', atk: 'idle_loop', hit: 'idle_loop', death: 'post' },
      },
      stats: { health: 300, damage: 35, attackPeriod: 1.5, walkSpeed: 0.1 },
      loot: [],
      behavior: 'neutral',
      tags: [],
      panicCauses: [],
      sentry: { radius: 8 },
      light: { radius: 10, intensity: 0.9, falloff: 0.8, colour: { r: 255, g: 200, b: 100 } },
      // Doesn't linger forever if nothing ever kills it.
      expireIfAliveSeconds: 120,
    },
    {
      id: 'sunportal',
      displayName: 'Solar Gate',
      description: 'A rift of light, rooted to the spot where it was raised. Right-click it to open the map and step through to anywhere already explored.',
      animation: {
        source: 'vanilla',
        bank: 'teleporter_worm',
        build: 'teleporter_worm_build',
        clips: { idle: 'idle_loop', walk: 'idle_loop', atk: 'idle_loop', hit: 'idle_loop', death: 'idle_loop' },
      },
      stats: { health: 100, damage: 0, attackPeriod: 2, walkSpeed: 0.1 },
      loot: [],
      behavior: 'passive',
      tags: [],
      panicCauses: [],
      mapPortal: true,
      invincible: true,
      // Vanishes on its own if never stepped through — see
      // SpellPortalTeleporter:Activate (creature.ts) for the "used" half.
      expireIfAliveSeconds: 10,
    },
  ],
}
