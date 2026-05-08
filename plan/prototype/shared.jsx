// shared.jsx — types, sample data, type-icon glyphs, wiki-link chip.
// Reused by all three direction artboards. Components attached to window.

const TYPES = {
  Character: { glyph: '◐', folder: 'Characters' },
  Species:   { glyph: '✦', folder: 'Species' },
  Location:  { glyph: '◇', folder: 'Locations' },
  Event:     { glyph: '⚡', folder: 'Events' },
  Faction:   { glyph: '⌘', folder: 'Factions' },
  Lore:      { glyph: '❡', folder: 'Lore' },
  Timeline:  { glyph: '◷', folder: 'Timeline' },
};

// Reverse lookup by folder name (used in wiki-link parsing).
const FOLDER_TO_TYPE = Object.fromEntries(
  Object.entries(TYPES).map(([k, v]) => [v.folder, k])
);

// Sample sidebar counts (the test project: Burden of the Guardian).
const SIDEBAR_TYPES = [
  { name: 'Characters', count: 47, key: 'Character' },
  { name: 'Species',    count: 6,  key: 'Species' },
  { name: 'Locations',  count: 23, key: 'Location' },
  { name: 'Events',     count: 31, key: 'Event' },
  { name: 'Factions',   count: 9,  key: 'Faction' },
  { name: 'Lore',       count: 14, key: 'Lore' },
  { name: 'Timeline',   count: 4,  key: 'Timeline' },
];

const SIDEBAR_DOCS = [
  { name: 'Arion',     type: 'Character', current: false },
  { name: 'Leandros',  type: 'Character' },
  { name: 'Lyssa',     type: 'Character', status: 'deceased' },
  { name: 'Melina',    type: 'Character' },
  { name: 'Mira',      type: 'Character' },
  { name: 'Telamonas', type: 'Character', status: 'deceased' },
  { name: 'Thalirin',  type: 'Character', status: 'deceased', current: true },
  { name: 'Ylverian',  type: 'Character' },
];

// The reference document for the read-mode artboards.
const THALIRIN = {
  name: 'Thalirin',
  type: 'Character',
  status: 'Deceased',
  tags: ['protagonist', 'warrior', 'mortal'],
  basic: [
    ['Sex', 'Male'],
    ['Date of Birth', '1502 BCE'],
    ['Date of Death', '1449 BCE'],
    ['Species', { link: 'Species/Human' }],
    ['Place of Origin', { link: 'Locations/Kea' }],
    ['Place of Residence', { link: 'Locations/Crete' }],
    ['Place of Death', { link: 'Locations/Crete' }],
  ],
  relationships: [
    ['Parents', [{ link: 'Characters/Lyssa', status: 'deceased' },
                 { link: 'Characters/Telamonas', status: 'deceased' }]],
    ['Siblings', [{ link: 'Characters/Mira' }]],
    ['Extended Family', [{ link: 'Characters/Leandros' }, { link: 'Characters/Arion' }]],
    ['Friends/Allies', [{ link: 'Characters/Melina' }]],
    ['Complicated', [{ link: 'Characters/Ylverian' }]],
  ],
  history: `Born on the island of Kea, Thalirin was displaced as a child when Mycenaean forces invaded and killed his father. He grew up as a refugee in a Minoan coastal city on Crete, trained in combat by his uncle Arion. After uncovering a Mycenaean plot to destabilize the city, he led its defense and rose to a position of leadership alongside Melina, whom he later married.

In 1453 BCE, the ancient being Ylverian merged with him to lead a counterattack against the Mycenaeans. The fusion unleashed devastating power, but also uncontrollable fury that led to atrocities. When Ylverian severed the connection, Thalirin was left to face the consequences alone. His family and city collapsed in the aftermath. In 1449 BCE, consumed by guilt, he ended his own life.`,
  personality: `Restless and resilient. Trauma manifested as vigilance rather than paralysis. Deeply protective of those he loved, and prone to overreach in their defense — a mirror of Ylverian's own fatal flaw.`,
  events: [
    { link: 'Events/Mycenaean_Invasion_of_Kea', label: 'Mycenaean Invasion of Kea' },
    { link: 'Events/Defense_of_the_Minoan_City', label: 'Defense of the Minoan City' },
    { link: 'Events/Divine_Fusion', label: 'Divine Fusion' },
    { link: 'Events/Fall_of_Crete', label: 'Fall of Crete' },
  ],
  factions: [
    { link: 'Factions/Minoans', label: 'Minoans' },
    { link: 'Factions/Mycenaeans', label: 'Mycenaeans' },
  ],
  notes: `His arc is the mortal mirror of Ylverian's cosmic one. Both are guardians who destroy what they love through the act of protecting it.`,
  backlinks: [
    { link: 'Characters/Arion', label: 'Arion' },
    { link: 'Characters/Melina', label: 'Melina' },
    { link: 'Characters/Ylverian', label: 'Ylverian' },
    { link: 'Characters/Mira', label: 'Mira' },
    { link: 'Events/Divine_Fusion', label: 'Divine Fusion' },
    { link: 'Events/Fall_of_Crete', label: 'Fall of Crete' },
    { link: 'Factions/Minoans', label: 'Minoans' },
    { link: 'Lore/Cosmic_Fusion', label: 'Cosmic Fusion' },
  ],
};

// Parse "Type/Name" or "Locations/Kea" into { type, label }.
function parseLink(linkPath) {
  const [folder, ...rest] = linkPath.split('/');
  const raw = rest.join('/').replace(/_/g, ' ');
  const type = FOLDER_TO_TYPE[folder] || 'Lore';
  return { type, label: raw };
}

window.AxiomTypes = TYPES;
window.AxiomFolderToType = FOLDER_TO_TYPE;
window.AxiomSidebarTypes = SIDEBAR_TYPES;
window.AxiomSidebarDocs = SIDEBAR_DOCS;
window.AxiomThalirin = THALIRIN;
window.AxiomParseLink = parseLink;
