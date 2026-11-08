// Property Tycoon board: "Playgrid Plaza", 36 original tiles (9 per side). All names, colours and cards are
// original to Playgrid.
const GROUPS = {
  moss: { name: 'Moss', color: '#7a9b57' },
  sky: { name: 'Sky', color: '#5fb4e8' },
  rose: { name: 'Rose', color: '#e0709a' },
  amber: { name: 'Amber', color: '#f0a63a' },
  coral: { name: 'Coral', color: '#ee6a55' },
  forest: { name: 'Forest', color: '#2f9e6a' },
  indigo: { name: 'Indigo', color: '#6a63d8' },
  gold: { name: 'Gold', color: '#e6c84a' },
};

const prop = (name, group, price) => ({ type: 'prop', name, group, price });
const station = (name) => ({ type: 'station', name, price: 200 });
const utility = (name) => ({ type: 'util', name, price: 150 });

const TILES = [
  { type: 'launch', name: 'Launch Pad' },
  prop('Mossy Lane', 'moss', 60),
  { type: 'surprise', name: 'Surprise' },
  prop('Pebble Court', 'moss', 60),
  { type: 'tax', name: 'City Levy', amount: 100 },
  station('North Skyline'),
  prop('Harbor Walk', 'sky', 100),
  prop('Kite Hill', 'sky', 100),
  prop('Lantern Row', 'sky', 120),
  { type: 'timeout', name: 'Time Out' },
  prop('Rosewater Street', 'rose', 140),
  utility('Power Plant'),
  prop('Petal Plaza', 'rose', 140),
  prop('Blossom Avenue', 'rose', 160),
  station('East Skyline'),
  prop('Amber Alley', 'amber', 180),
  { type: 'surprise', name: 'Surprise' },
  prop('Honey Mews', 'amber', 180),
  { type: 'rest', name: 'Rest Stop' },
  prop('Beacon Hill', 'amber', 200),
  prop('Coral Cove', 'coral', 220),
  prop('Reef Road', 'coral', 220),
  prop('Tide Terrace', 'coral', 240),
  station('South Skyline'),
  prop('Pinewood Path', 'forest', 260),
  prop('Cedar Circle', 'forest', 260),
  utility('Water Works'),
  { type: 'gototimeout', name: 'Go To Time Out' },
  prop('Fern Gardens', 'forest', 280),
  { type: 'surprise', name: 'Surprise' },
  prop('Midnight Mile', 'indigo', 300),
  prop('Starlight Strip', 'indigo', 320),
  station('West Skyline'),
  { type: 'tax', name: 'Luxury Fee', amount: 100 },
  prop('Skyline Tower', 'gold', 350),
  prop('Playgrid Palace', 'gold', 400),
];

const SALARY = 200;
const JAIL_FEE = 50;
const JAIL_POS = 9;
const MAX_LEVEL = 4;
const RENT_MULT = [0.08, 0.35, 0.9, 1.9, 3.2];
const LEVEL_NAMES = ['Empty lot', 'Shop', 'Block', 'Tower', 'Landmark'];

const upgradeCost = (t) => Math.round((t.price * 0.5) / 10) * 10;
const rentAt = (t, level) => Math.max(2, Math.round((t.price * RENT_MULT[level]) / 2) * 2);

const GROUP_TILES = {};
TILES.forEach((t, i) => { if (t.type === 'prop') (GROUP_TILES[t.group] = GROUP_TILES[t.group] || []).push(i); });

// Surprise cards: [id, text]. The effect for each id lives in tycoon.js.
const CARDS = [
  ['refund', 'Tax refund arrives. Collect $50.'],
  ['wallet', 'You found a wallet. Collect $30.'],
  ['repairs', 'Repair bills. Pay $10 for each upgrade level you own.'],
  ['launch', 'Advance to Launch Pad and collect $200.'],
  ['timeout', 'Go straight to Time Out.'],
  ['birthday', "It's your birthday. Collect $20 from every player."],
  ['party', 'You throw a party. Pay every player $15.'],
  ['fwd3', 'Take the express lane. Move forward 3 spaces.'],
  ['back3', 'Detour. Move back 3 spaces.'],
  ['harbor', 'Advance to Harbor Walk. Collect $200 if you pass Launch Pad.'],
  ['freecard', 'Get out of Time Out free. Keep this card until you need it.'],
  ['fair', 'Street fair. Collect $100.'],
];

module.exports = { GROUPS, TILES, GROUP_TILES, CARDS, SALARY, JAIL_FEE, JAIL_POS, MAX_LEVEL, LEVEL_NAMES, upgradeCost, rentAt };
