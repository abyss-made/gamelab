// Content for the batch 3 social games. Kept server-side so answers never reach a client early.

// Bluff Battle: the real answer is `a`; `alt` lists other spellings that count as the real answer.
const BLUFF = [
  { q: 'A group of flamingos is called a ___.', a: 'flamboyance' },
  { q: 'A group of crows is called a ___.', a: 'murder' },
  { q: 'A group of owls is called a ___.', a: 'parliament' },
  { q: 'A group of porcupines is called a ___.', a: 'prickle' },
  { q: 'The plastic tip on the end of a shoelace is called an ___.', a: 'aglet' },
  { q: 'The dot over a lowercase "i" is called a ___.', a: 'tittle' },
  { q: 'The groove between your nose and upper lip is called the ___.', a: 'philtrum' },
  { q: 'The smell of rain on dry earth is called ___.', a: 'petrichor' },
  { q: 'The study of flags is called ___.', a: 'vexillology' },
  { q: 'The study of bells is called ___.', a: 'campanology' },
  { q: 'The "#" symbol is technically called an ___.', a: 'octothorpe' },
  { q: 'The national animal of Scotland is the ___.', a: 'unicorn' },
  { q: 'Bhutan measures its progress with Gross National ___.', a: 'happiness' },
  { q: 'The Hawaiian state fish, the humuhumunukunukuapua\'a, is a type of ___.', a: 'triggerfish' },
  { q: 'Nintendo was founded in 1889 as a company that made ___.', a: 'playing cards', alt: ['cards', 'hanafuda'] },
  { q: 'Before it was called Google, the search engine was nicknamed ___.', a: 'backrub' },
  { q: 'The first item ever sold on eBay was a broken ___.', a: 'laser pointer', alt: ['laserpointer'] },
  { q: 'The Frisbee was originally sold as the Pluto ___.', a: 'platter' },
  { q: 'Bubble Wrap was originally invented to be ___.', a: 'wallpaper', alt: ['textured wallpaper'] },
  { q: 'Play-Doh was originally created as a ___ cleaner.', a: 'wallpaper' },
  { q: 'A day on Venus is longer than its ___.', a: 'year' },
  { q: 'Botanically speaking, a banana is a ___.', a: 'berry' },
  { q: 'Honey that is still edible was found in the tombs of ancient ___.', a: 'egypt', alt: ['egyptians'] },
  { q: 'A shrimp\'s heart is located in its ___.', a: 'head' },
  { q: 'Wombat droppings are shaped like ___.', a: 'cubes', alt: ['cube'] },
  { q: 'An octopus has this many hearts: ___.', a: 'three', alt: ['3'] },
  { q: 'Oxford University is older than the ___ Empire.', a: 'aztec' },
  { q: 'Cleopatra lived closer in time to the Moon landing than to the building of the ___.', a: 'great pyramid', alt: ['pyramids', 'great pyramid of giza', 'pyramid of giza'] },
  { q: 'The word "quarantine" comes from the Italian for this many days: ___.', a: 'forty', alt: ['40'] },
  { q: 'Sharks have existed longer than ___.', a: 'trees' },
  { q: 'A snail can sleep for up to this many years: ___.', a: 'three', alt: ['3'] },
  { q: 'The Statue of Liberty is made mostly of ___.', a: 'copper' },
  { q: 'The only letter that does not appear in any US state name is ___.', a: 'q' },
  { q: 'Coca-Cola was first marketed as a ___.', a: 'medicine', alt: ['patent medicine', 'tonic'] },
  { q: 'The tallest mountain in the solar system, Olympus Mons, is on ___.', a: 'mars' },
  { q: 'For a long time many Europeans believed tomatoes were ___.', a: 'poisonous' },
];

// The Impostor: crew sees one word from the category; the impostor sees only the category.
const IMPOSTOR = [
  { cat: 'Animals', words: ['elephant', 'penguin', 'giraffe', 'dolphin', 'kangaroo', 'octopus', 'owl', 'tiger', 'turtle', 'rabbit'] },
  { cat: 'Foods', words: ['pizza', 'sushi', 'pancakes', 'burrito', 'spaghetti', 'popcorn', 'hamburger', 'omelette', 'dumplings', 'ice cream'] },
  { cat: 'Fruits & Vegetables', words: ['banana', 'broccoli', 'strawberry', 'carrot', 'pineapple', 'potato', 'watermelon', 'spinach', 'avocado', 'corn'] },
  { cat: 'Places', words: ['library', 'airport', 'beach', 'hospital', 'museum', 'circus', 'farm', 'castle', 'subway', 'volcano'] },
  { cat: 'Jobs', words: ['teacher', 'firefighter', 'chef', 'pilot', 'dentist', 'farmer', 'astronaut', 'plumber', 'librarian', 'detective'] },
  { cat: 'Sports', words: ['soccer', 'tennis', 'swimming', 'basketball', 'skiing', 'golf', 'archery', 'bowling', 'surfing', 'boxing'] },
  { cat: 'Household Items', words: ['toaster', 'umbrella', 'pillow', 'scissors', 'mirror', 'broom', 'candle', 'blender', 'clock', 'ladder'] },
  { cat: 'Vehicles', words: ['bicycle', 'helicopter', 'submarine', 'tractor', 'ambulance', 'skateboard', 'rocket', 'canoe', 'tram', 'motorcycle'] },
  { cat: 'Musical Instruments', words: ['guitar', 'trumpet', 'piano', 'violin', 'drums', 'flute', 'harp', 'saxophone', 'banjo', 'accordion'] },
  { cat: 'Clothing', words: ['scarf', 'sneakers', 'raincoat', 'sweater', 'mittens', 'bow tie', 'sandals', 'overalls', 'hat', 'pajamas'] },
];

// Hot Potato: the category a bomb-holder must answer to pass it on.
const POTATO = [
  'Name a fruit', 'Name an animal', 'Name a country', 'Name a color', 'Name a sport',
  'Name something in a kitchen', 'Name a movie', 'Name a vegetable', 'Name a job',
  'Name a musical instrument', 'Name something you wear', 'Name a car brand',
  'Name a city', 'Name a board game', 'Name something at the beach', 'Name a drink',
  'Name a superhero', 'Name a school subject', 'Name a type of weather', 'Name a pizza topping',
  'Name something with wheels', 'Name a body part', 'Name a candy', 'Name a farm animal',
  'Name something that is round', 'Name a famous singer', 'Name a video game', 'Name a bird',
];

module.exports = { BLUFF, IMPOSTOR, POTATO };
