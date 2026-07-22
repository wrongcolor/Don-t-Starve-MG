// Curated list of well-known vanilla prefab ids, for the "choose a prefab" picker
// (PrefabPickerButton) — NOT exhaustive (the game ships ~1500 prefabs; this covers
// the ones most commonly referenced as a recipe ingredient or creature loot drop).
// Every id here is confirmed against real usage in published Workshop mods (see
// docs/dst-knowledge/README.md for that source) or already trusted elsewhere in
// this codebase via RESERVED_PREFAB_IDS (src/types/modProject.ts).
export interface CommonPrefab {
  id: string
  label: string
  icon: string
}

export interface CommonPrefabCategory {
  name: string
  items: CommonPrefab[]
}

export const COMMON_PREFAB_CATEGORIES: CommonPrefabCategory[] = [
  {
    name: 'Basic resources',
    items: [
      { id: 'twigs', label: 'Twigs', icon: '🌿' },
      { id: 'flint', label: 'Flint', icon: '🔺' },
      { id: 'rocks', label: 'Rocks', icon: '🪨' },
      { id: 'log', label: 'Log', icon: '🪵' },
      { id: 'boards', label: 'Boards', icon: '🪵' },
      { id: 'cutgrass', label: 'Cut Grass', icon: '🌾' },
      { id: 'grass', label: 'Grass', icon: '🍃' },
      { id: 'rope', label: 'Rope', icon: '🪢' },
      { id: 'silk', label: 'Silk', icon: '🕸️' },
      { id: 'papyrus', label: 'Papyrus', icon: '📜' },
      { id: 'transistor', label: 'Transistor', icon: '⚙️' },
      { id: 'cutstone', label: 'Cut Stone', icon: '🧱' },
      { id: 'pinecone', label: 'Pinecone', icon: '🌰' },
      { id: 'ash', label: 'Ash', icon: '🩶' },
    ],
  },
  {
    name: 'Food',
    items: [
      { id: 'monstermeat', label: 'Monster Meat', icon: '🍖' },
      { id: 'smallmeat', label: 'Morsel', icon: '🍗' },
      { id: 'honey', label: 'Honey', icon: '🍯' },
      { id: 'berries', label: 'Berries', icon: '🍓' },
      { id: 'carrot', label: 'Carrot', icon: '🥕' },
      { id: 'seeds', label: 'Seeds', icon: '🌱' },
      { id: 'pumpkin', label: 'Pumpkin', icon: '🎃' },
      { id: 'watermelon', label: 'Watermelon', icon: '🍉' },
    ],
  },
  {
    name: 'Monster drops',
    items: [
      { id: 'spidergland', label: 'Spider Gland', icon: '🕷️' },
      { id: 'boneshard', label: 'Bone Shard', icon: '🦴' },
      { id: 'poop', label: 'Manure', icon: '💩' },
      { id: 'guano', label: 'Guano', icon: '💩' },
      { id: 'gears', label: 'Gears', icon: '⚙️' },
      { id: 'houndstooth', label: "Hound's Tooth", icon: '🦷' },
      { id: 'batwing', label: 'Bat Wing', icon: '🦇' },
      { id: 'tentaclespots', label: 'Tentacle Spots', icon: '🐙' },
    ],
  },
  {
    name: 'Gems and magic',
    items: [
      { id: 'goldnugget', label: 'Gold Nugget', icon: '🪙' },
      { id: 'nightmarefuel', label: 'Nightmare Fuel', icon: '👻' },
      { id: 'redgem', label: 'Red Gem', icon: '🔴' },
      { id: 'bluegem', label: 'Blue Gem', icon: '🔵' },
      { id: 'purplegem', label: 'Purple Gem', icon: '🟣' },
      { id: 'thulecite', label: 'Thulecite', icon: '🗿' },
      { id: 'moonrocknugget', label: 'Moon Rock Nugget', icon: '🌙' },
    ],
  },
  {
    name: 'Structures and containers',
    items: [
      { id: 'prestihatitator', label: 'Prestihatitator', icon: '🎩' },
      { id: 'treasurechest', label: 'Chest', icon: '📦' },
      { id: 'icebox', label: 'Icebox', icon: '🧊' },
      { id: 'krampus_sack', label: 'Krampus Sack', icon: '🎒' },
    ],
  },
]
