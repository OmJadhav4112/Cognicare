/**
 * DementiaCare+ — NER Cultural Content Library
 *
 * Culturally familiar content from North Eastern India for use in
 * cognitive games (memory matching, picture recall, pattern attention, sequence memory).
 *
 * Categories: foods, festivals, landmarks, clothing, plants, animals,
 *             everyday objects, folk arts, instruments, places
 *
 * Each item carries:
 *   id         — unique slug
 *   label      — display name (English)
 *   nativeLabel — name in regional language (transliterated)
 *   category   — content category
 *   emoji      — visual fallback when image is not available
 *   state      — NER state(s) most associated with this item
 *   description — short cultural context sentence
 *   difficulty — 'easy' | 'medium' | 'hard' (how recognisable for elderly)
 *   tags       — for filtering in games
 */

const NER_CONTENT = [

  // ─────────────────────────────────────────
  //  FOODS
  // ─────────────────────────────────────────
  {
    id: 'rice_assam',
    label: 'Joha Rice',
    nativeLabel: 'জহা চাউল (Joha Chaul)',
    category: 'food',
    emoji: '🍚',
    state: ['Assam'],
    description: 'Fragrant short-grain rice unique to Assam, used in festivals and daily meals.',
    difficulty: 'easy',
    tags: ['food', 'assam', 'staple']
  },
  {
    id: 'pitha',
    label: 'Pitha',
    nativeLabel: 'পিঠা (Pitha)',
    category: 'food',
    emoji: '🥮',
    state: ['Assam', 'Manipur'],
    description: 'Traditional rice cake prepared during Bihu and other festivals.',
    difficulty: 'easy',
    tags: ['food', 'festival', 'assam', 'manipur']
  },
  {
    id: 'bamboo_shoot',
    label: 'Bamboo Shoot',
    nativeLabel: 'বাঁহৰ গাজ (Bahor Gaaj)',
    category: 'food',
    emoji: '🎍',
    state: ['Assam', 'Nagaland', 'Manipur', 'Mizoram', 'Arunachal Pradesh'],
    description: 'A staple ingredient in NER cooking, used in curries, pickles, and fermented dishes.',
    difficulty: 'easy',
    tags: ['food', 'vegetable', 'ner_common']
  },
  {
    id: 'eromba',
    label: 'Eromba',
    nativeLabel: 'এৰোম্বা (Eromba)',
    category: 'food',
    emoji: '🌶️',
    state: ['Manipur'],
    description: 'A popular Manipuri dish made with boiled vegetables and fermented fish.',
    difficulty: 'medium',
    tags: ['food', 'manipur']
  },
  {
    id: 'smoked_pork',
    label: 'Smoked Pork',
    nativeLabel: 'Vawksa Rep',
    category: 'food',
    emoji: '🥩',
    state: ['Nagaland', 'Mizoram', 'Meghalaya'],
    description: 'Wood-smoked pork is a beloved delicacy across several NER states.',
    difficulty: 'easy',
    tags: ['food', 'nagaland', 'mizoram', 'meghalaya']
  },
  {
    id: 'black_sesame_laddoo',
    label: 'Til Pitha',
    nativeLabel: 'তিল পিঠা (Til Pitha)',
    category: 'food',
    emoji: '🍡',
    state: ['Assam'],
    description: 'Sweet sesame-filled rice pitha, especially made during Magh Bihu.',
    difficulty: 'easy',
    tags: ['food', 'festival', 'assam', 'bihu']
  },
  {
    id: 'fish_tenga',
    label: 'Fish Tenga',
    nativeLabel: 'মাছ টেঙা (Maas Tenga)',
    category: 'food',
    emoji: '🐟',
    state: ['Assam'],
    description: 'A light sour fish curry made with tomatoes or elephant apple — an Assamese classic.',
    difficulty: 'easy',
    tags: ['food', 'assam', 'curry']
  },
  {
    id: 'jadoh',
    label: 'Jadoh',
    nativeLabel: 'Jadoh',
    category: 'food',
    emoji: '🍛',
    state: ['Meghalaya'],
    description: 'A traditional Khasi rice dish cooked with pork blood and spices.',
    difficulty: 'medium',
    tags: ['food', 'meghalaya', 'khasi']
  },
  {
    id: 'nagaland_raja_chilli',
    label: 'Raja Mircha',
    nativeLabel: 'ৰজা জলকীয়া (Raja Jolokia)',
    category: 'food',
    emoji: '🌶️',
    state: ['Nagaland', 'Assam'],
    description: 'The famous Bhut Jolokia — one of the world\'s hottest chillies, grown in NER.',
    difficulty: 'easy',
    tags: ['food', 'spice', 'nagaland', 'assam']
  },
  {
    id: 'apong',
    label: 'Apong (Rice Beer)',
    nativeLabel: 'আপং (Apong)',
    category: 'food',
    emoji: '🍺',
    state: ['Assam', 'Arunachal Pradesh'],
    description: 'Traditional rice beer brewed by the Mising and Adi tribes.',
    difficulty: 'medium',
    tags: ['food', 'drink', 'tribal', 'arunachal', 'assam']
  },

  // ─────────────────────────────────────────
  //  FESTIVALS
  // ─────────────────────────────────────────
  {
    id: 'bihu',
    label: 'Bihu',
    nativeLabel: 'বিহু (Bihu)',
    category: 'festival',
    emoji: '🎊',
    state: ['Assam'],
    description: 'The most important festival of Assam, celebrated three times a year with music, dance, and feasting.',
    difficulty: 'easy',
    tags: ['festival', 'assam', 'dance']
  },
  {
    id: 'hornbill',
    label: 'Hornbill Festival',
    nativeLabel: 'Hornbill Festival',
    category: 'festival',
    emoji: '🦜',
    state: ['Nagaland'],
    description: 'A week-long celebration of Naga tribal heritage, held every December in Kisama.',
    difficulty: 'medium',
    tags: ['festival', 'nagaland', 'tribal']
  },
  {
    id: 'sangai',
    label: 'Sangai Festival',
    nativeLabel: 'সাংগাই উৎসৱ',
    category: 'festival',
    emoji: '🦌',
    state: ['Manipur'],
    description: 'Manipur\'s largest tourism festival, named after the endangered brow-antlered deer.',
    difficulty: 'medium',
    tags: ['festival', 'manipur', 'deer']
  },
  {
    id: 'chapchar_kut',
    label: 'Chapchar Kut',
    nativeLabel: 'Chapchar Kut',
    category: 'festival',
    emoji: '🌸',
    state: ['Mizoram'],
    description: 'Spring festival of Mizoram celebrating the completion of jungle clearing for farming.',
    difficulty: 'medium',
    tags: ['festival', 'mizoram', 'spring']
  },
  {
    id: 'wangala',
    label: 'Wangala Festival',
    nativeLabel: 'Wangala',
    category: 'festival',
    emoji: '🥁',
    state: ['Meghalaya'],
    description: 'The harvest festival of the Garo people, featuring traditional drum dances.',
    difficulty: 'medium',
    tags: ['festival', 'meghalaya', 'garo', 'harvest']
  },
  {
    id: 'losar',
    label: 'Losar',
    nativeLabel: 'Losar',
    category: 'festival',
    emoji: '🎆',
    state: ['Arunachal Pradesh', 'Sikkim'],
    description: 'Tibetan New Year celebrated with prayers, dances, and traditional rituals.',
    difficulty: 'medium',
    tags: ['festival', 'arunachal', 'sikkim', 'tibetan']
  },

  // ─────────────────────────────────────────
  //  LANDMARKS
  // ─────────────────────────────────────────
  {
    id: 'kamakhya_temple',
    label: 'Kamakhya Temple',
    nativeLabel: 'কামাখ্যা মন্দিৰ',
    category: 'landmark',
    emoji: '🛕',
    state: ['Assam'],
    description: 'One of the most sacred Hindu temples, located on Nilachal Hill in Guwahati.',
    difficulty: 'easy',
    tags: ['landmark', 'assam', 'temple', 'guwahati']
  },
  {
    id: 'kaziranga',
    label: 'Kaziranga National Park',
    nativeLabel: 'কাজিৰঙা',
    category: 'landmark',
    emoji: '🦏',
    state: ['Assam'],
    description: 'UNESCO World Heritage Site, home to two-thirds of the world\'s one-horned rhinos.',
    difficulty: 'easy',
    tags: ['landmark', 'assam', 'wildlife', 'rhino']
  },
  {
    id: 'loktak_lake',
    label: 'Loktak Lake',
    nativeLabel: 'লোকটাক হ্ৰদ',
    category: 'landmark',
    emoji: '🏞️',
    state: ['Manipur'],
    description: 'The largest freshwater lake in northeast India, famous for its floating phumdis.',
    difficulty: 'medium',
    tags: ['landmark', 'manipur', 'lake']
  },
  {
    id: 'cherrapunji',
    label: 'Cherrapunji',
    nativeLabel: 'Sohra (Cherrapunji)',
    category: 'landmark',
    emoji: '🌧️',
    state: ['Meghalaya'],
    description: 'One of the wettest places on Earth, famous for living root bridges.',
    difficulty: 'easy',
    tags: ['landmark', 'meghalaya', 'rain']
  },
  {
    id: 'tawang_monastery',
    label: 'Tawang Monastery',
    nativeLabel: 'Tawang Gompa',
    category: 'landmark',
    emoji: '🏯',
    state: ['Arunachal Pradesh'],
    description: 'The largest monastery in India, perched high in the Himalayas.',
    difficulty: 'medium',
    tags: ['landmark', 'arunachal', 'monastery', 'buddhist']
  },
  {
    id: 'brahmaputra',
    label: 'Brahmaputra River',
    nativeLabel: 'ব্ৰহ্মপুত্ৰ নদী',
    category: 'landmark',
    emoji: '🌊',
    state: ['Assam', 'Arunachal Pradesh'],
    description: 'One of the major rivers of Asia, flowing through the heart of Assam.',
    difficulty: 'easy',
    tags: ['landmark', 'assam', 'river']
  },
  {
    id: 'shillong_peak',
    label: 'Shillong Peak',
    nativeLabel: 'Shillong Peak',
    category: 'landmark',
    emoji: '⛰️',
    state: ['Meghalaya'],
    description: 'The highest point in Meghalaya offering panoramic views of the Scotland of the East.',
    difficulty: 'easy',
    tags: ['landmark', 'meghalaya', 'mountain']
  },

  // ─────────────────────────────────────────
  //  CLOTHING & TEXTILES
  // ─────────────────────────────────────────
  {
    id: 'mekhela_chador',
    label: 'Mekhela Chador',
    nativeLabel: 'মেখেলা চাদৰ',
    category: 'clothing',
    emoji: '👘',
    state: ['Assam'],
    description: 'Traditional two-piece silk garment worn by Assamese women, often made of Muga silk.',
    difficulty: 'easy',
    tags: ['clothing', 'assam', 'silk', 'women']
  },
  {
    id: 'muga_silk',
    label: 'Muga Silk',
    nativeLabel: 'মুগা ৰেচম',
    category: 'clothing',
    emoji: '🧵',
    state: ['Assam'],
    description: 'Golden-hued natural silk unique to Assam, one of the most prized in the world.',
    difficulty: 'medium',
    tags: ['clothing', 'assam', 'silk', 'craft']
  },
  {
    id: 'naga_shawl',
    label: 'Naga Tribal Shawl',
    nativeLabel: 'Naga Shawl',
    category: 'clothing',
    emoji: '🧣',
    state: ['Nagaland'],
    description: 'Handwoven shawls worn by Naga tribes, each pattern representing a specific clan or status.',
    difficulty: 'easy',
    tags: ['clothing', 'nagaland', 'tribal', 'handloom']
  },
  {
    id: 'phanek',
    label: 'Phanek',
    nativeLabel: 'ফানেক (Phanek)',
    category: 'clothing',
    emoji: '🪡',
    state: ['Manipur'],
    description: 'Traditional wraparound skirt worn by Meitei women of Manipur.',
    difficulty: 'medium',
    tags: ['clothing', 'manipur', 'women']
  },
  {
    id: 'puanchei',
    label: 'Puanchei',
    nativeLabel: 'Puanchei',
    category: 'clothing',
    emoji: '🌈',
    state: ['Mizoram'],
    description: 'A brightly coloured traditional dress of the Mizo people, worn during festivals.',
    difficulty: 'medium',
    tags: ['clothing', 'mizoram', 'festival', 'women']
  },

  // ─────────────────────────────────────────
  //  PLANTS & TREES
  // ─────────────────────────────────────────
  {
    id: 'foxtail_orchid',
    label: 'Foxtail Orchid',
    nativeLabel: 'কপৌ ফুল (Kopou Phul)',
    category: 'plant',
    emoji: '🌸',
    state: ['Assam'],
    description: 'State flower of Assam, traditionally worn in the hair during Bihu.',
    difficulty: 'easy',
    tags: ['plant', 'flower', 'assam', 'bihu']
  },
  {
    id: 'bamboo',
    label: 'Bamboo',
    nativeLabel: 'বাঁহ (Banh)',
    category: 'plant',
    emoji: '🎋',
    state: ['Assam', 'Manipur', 'Nagaland', 'Mizoram', 'Arunachal Pradesh'],
    description: 'Integral to life in NER — used for food, construction, crafts, and instruments.',
    difficulty: 'easy',
    tags: ['plant', 'bamboo', 'ner_common']
  },
  {
    id: 'rhododendron',
    label: 'Rhododendron',
    nativeLabel: 'বুৰঞ্জী ফুল',
    category: 'plant',
    emoji: '🌺',
    state: ['Arunachal Pradesh', 'Sikkim', 'Meghalaya'],
    description: 'State flower of Sikkim and Nagaland, blooming across hillsides in spring.',
    difficulty: 'easy',
    tags: ['plant', 'flower', 'sikkim', 'arunachal']
  },
  {
    id: 'betel_nut',
    label: 'Betel Nut (Tamul)',
    nativeLabel: 'তামোল (Tamul)',
    category: 'plant',
    emoji: '🥜',
    state: ['Assam', 'Meghalaya', 'Tripura'],
    description: 'A culturally significant offering in Assamese hospitality and rituals.',
    difficulty: 'easy',
    tags: ['plant', 'assam', 'tradition']
  },
  {
    id: 'tea_plant',
    label: 'Tea Plant',
    nativeLabel: 'চাহ গছ (Chah Gosh)',
    category: 'plant',
    emoji: '🍃',
    state: ['Assam'],
    description: 'Assam is one of the world\'s largest tea-producing regions.',
    difficulty: 'easy',
    tags: ['plant', 'assam', 'tea', 'iconic']
  },

  // ─────────────────────────────────────────
  //  ANIMALS & BIRDS
  // ─────────────────────────────────────────
  {
    id: 'one_horned_rhino',
    label: 'One-Horned Rhino',
    nativeLabel: 'একশিঙীয়া গঁড় (Ekshingia Gond)',
    category: 'animal',
    emoji: '🦏',
    state: ['Assam'],
    description: 'The iconic Indian one-horned rhinoceros, protected in Kaziranga.',
    difficulty: 'easy',
    tags: ['animal', 'assam', 'wildlife', 'iconic']
  },
  {
    id: 'sangai_deer',
    label: 'Sangai Deer',
    nativeLabel: 'সাংগাই হৰিণ',
    category: 'animal',
    emoji: '🦌',
    state: ['Manipur'],
    description: 'The brow-antlered deer, state animal of Manipur and critically endangered.',
    difficulty: 'medium',
    tags: ['animal', 'manipur', 'endangered', 'deer']
  },
  {
    id: 'hornbill_bird',
    label: 'Great Hornbill',
    nativeLabel: 'হৰ্নবিল',
    category: 'animal',
    emoji: '🦜',
    state: ['Arunachal Pradesh', 'Nagaland'],
    description: 'State bird of Arunachal Pradesh and Kerala, deeply symbolic to Naga tribes.',
    difficulty: 'easy',
    tags: ['animal', 'bird', 'nagaland', 'arunachal']
  },
  {
    id: 'elephant',
    label: 'Asian Elephant',
    nativeLabel: 'হাতী (Haati)',
    category: 'animal',
    emoji: '🐘',
    state: ['Assam', 'Arunachal Pradesh', 'Meghalaya'],
    description: 'Wild elephants roam the forests and grasslands of northeast India.',
    difficulty: 'easy',
    tags: ['animal', 'assam', 'forest', 'iconic']
  },
  {
    id: 'golden_langur',
    label: 'Golden Langur',
    nativeLabel: 'সোণালী বান্দৰ',
    category: 'animal',
    emoji: '🐒',
    state: ['Assam'],
    description: 'A rare golden-furred primate found only along the Assam-Bhutan border.',
    difficulty: 'hard',
    tags: ['animal', 'primate', 'assam', 'rare']
  },
  {
    id: 'river_dolphin',
    label: 'Gangetic River Dolphin',
    nativeLabel: 'শিহু (Sihu)',
    category: 'animal',
    emoji: '🐬',
    state: ['Assam'],
    description: 'National aquatic animal of India, found in the Brahmaputra river system.',
    difficulty: 'medium',
    tags: ['animal', 'assam', 'river', 'dolphin']
  },

  // ─────────────────────────────────────────
  //  EVERYDAY OBJECTS
  // ─────────────────────────────────────────
  {
    id: 'dhol',
    label: 'Dhol (Drum)',
    nativeLabel: 'ঢোল (Dhol)',
    category: 'everyday_object',
    emoji: '🥁',
    state: ['Assam', 'Manipur'],
    description: 'Traditional double-headed drum played during Bihu and other celebrations.',
    difficulty: 'easy',
    tags: ['object', 'instrument', 'assam', 'bihu', 'music']
  },
  {
    id: 'pepa',
    label: 'Pepa (Flute)',
    nativeLabel: 'পেঁপা (Pepa)',
    category: 'everyday_object',
    emoji: '🎵',
    state: ['Assam'],
    description: 'A traditional horn flute made from buffalo horn, played during Bihu.',
    difficulty: 'medium',
    tags: ['object', 'instrument', 'assam', 'bihu', 'music']
  },
  {
    id: 'jaapi',
    label: 'Jaapi (Hat)',
    nativeLabel: 'জাপি (Jaapi)',
    category: 'everyday_object',
    emoji: '👒',
    state: ['Assam'],
    description: 'Traditional conical hat made from bamboo and palm leaves — symbol of Assamese culture.',
    difficulty: 'easy',
    tags: ['object', 'assam', 'iconic', 'craft']
  },
  {
    id: 'xorai',
    label: 'Xorai (Brass Vessel)',
    nativeLabel: 'চৰাই (Xorai)',
    category: 'everyday_object',
    emoji: '🏺',
    state: ['Assam'],
    description: 'Sacred brass vessel used in Assamese rituals and as a symbol of respect.',
    difficulty: 'medium',
    tags: ['object', 'assam', 'brass', 'ritual']
  },
  {
    id: 'cane_basket',
    label: 'Cane Basket',
    nativeLabel: 'বেত পাচি',
    category: 'everyday_object',
    emoji: '🧺',
    state: ['Assam', 'Nagaland', 'Manipur', 'Tripura'],
    description: 'Handwoven cane baskets are used daily across NER for carrying goods and food.',
    difficulty: 'easy',
    tags: ['object', 'craft', 'ner_common', 'bamboo']
  },
  {
    id: 'earthen_pot',
    label: 'Earthen Pot',
    nativeLabel: 'মাটিৰ পাত্ৰ',
    category: 'everyday_object',
    emoji: '🪔',
    state: ['Assam', 'Manipur', 'Meghalaya'],
    description: 'Traditional clay pots used for cooking, storing water, and religious purposes.',
    difficulty: 'easy',
    tags: ['object', 'kitchen', 'ner_common', 'pottery']
  },

  // ─────────────────────────────────────────
  //  FOLK ARTS & CRAFTS
  // ─────────────────────────────────────────
  {
    id: 'bihu_dance',
    label: 'Bihu Dance',
    nativeLabel: 'বিহু নৃত্য',
    category: 'folk_art',
    emoji: '💃',
    state: ['Assam'],
    description: 'Vibrant folk dance performed during Bihu, with energetic hand and hip movements.',
    difficulty: 'easy',
    tags: ['folk_art', 'dance', 'assam', 'bihu']
  },
  {
    id: 'sattriya_dance',
    label: 'Sattriya Dance',
    nativeLabel: 'সত্ৰীয়া নৃত্য',
    category: 'folk_art',
    emoji: '🩰',
    state: ['Assam'],
    description: 'Classical dance form from Assam, originating in the Vaishnavite monasteries.',
    difficulty: 'medium',
    tags: ['folk_art', 'dance', 'assam', 'classical']
  },
  {
    id: 'ras_leela',
    label: 'Ras Leela',
    nativeLabel: 'ৰাছ লীলা',
    category: 'folk_art',
    emoji: '🎭',
    state: ['Manipur'],
    description: 'Classical dance-drama of Manipur depicting the life of Lord Krishna.',
    difficulty: 'medium',
    tags: ['folk_art', 'dance', 'manipur', 'classical']
  },
  {
    id: 'bamboo_dance',
    label: 'Cheraw (Bamboo Dance)',
    nativeLabel: 'Cheraw',
    category: 'folk_art',
    emoji: '🎋',
    state: ['Mizoram'],
    description: 'Iconic bamboo dance of Mizoram where dancers weave between clapping bamboo poles.',
    difficulty: 'easy',
    tags: ['folk_art', 'dance', 'mizoram', 'bamboo']
  },
  {
    id: 'mask_making',
    label: 'Traditional Masks',
    nativeLabel: 'মুখা (Mukha)',
    category: 'folk_art',
    emoji: '🎭',
    state: ['Assam', 'Arunachal Pradesh'],
    description: 'Handcrafted festival masks used in Sattriya performances and tribal rituals.',
    difficulty: 'medium',
    tags: ['folk_art', 'craft', 'assam', 'arunachal']
  },

  // ─────────────────────────────────────────
  //  PLACES / TOWNS
  // ─────────────────────────────────────────
  {
    id: 'guwahati',
    label: 'Guwahati',
    nativeLabel: 'গুৱাহাটী',
    category: 'place',
    emoji: '🏙️',
    state: ['Assam'],
    description: 'The largest city of Assam and gateway to Northeast India.',
    difficulty: 'easy',
    tags: ['place', 'city', 'assam']
  },
  {
    id: 'imphal',
    label: 'Imphal',
    nativeLabel: 'ইম্ফাল',
    category: 'place',
    emoji: '🏛️',
    state: ['Manipur'],
    description: 'Capital of Manipur, known for its historic palaces and Ima Keithel women\'s market.',
    difficulty: 'easy',
    tags: ['place', 'city', 'manipur', 'capital']
  },
  {
    id: 'shillong',
    label: 'Shillong',
    nativeLabel: 'শিলং',
    category: 'place',
    emoji: '🌄',
    state: ['Meghalaya'],
    description: 'Capital of Meghalaya, known as the "Scotland of the East" for its rolling hills.',
    difficulty: 'easy',
    tags: ['place', 'city', 'meghalaya', 'capital']
  },
  {
    id: 'kohima',
    label: 'Kohima',
    nativeLabel: 'Kohima',
    category: 'place',
    emoji: '⛰️',
    state: ['Nagaland'],
    description: 'Capital of Nagaland, site of the famous WWII Battle of Kohima.',
    difficulty: 'medium',
    tags: ['place', 'city', 'nagaland', 'capital']
  },
  {
    id: 'aizawl',
    label: 'Aizawl',
    nativeLabel: 'Aizawl',
    category: 'place',
    emoji: '🏘️',
    state: ['Mizoram'],
    description: 'Capital of Mizoram, a hilltop city known for its literacy and music culture.',
    difficulty: 'medium',
    tags: ['place', 'city', 'mizoram', 'capital']
  }
];

// ─────────────────────────────────────────
//  HELPER FUNCTIONS
// ─────────────────────────────────────────

/**
 * Get content filtered by category
 */
const getByCategory = (category) =>
  NER_CONTENT.filter(item => item.category === category);

/**
 * Get content filtered by difficulty
 */
const getByDifficulty = (difficulty) =>
  NER_CONTENT.filter(item => item.difficulty === difficulty);

/**
 * Get content filtered by state
 */
const getByState = (state) =>
  NER_CONTENT.filter(item => item.state.includes(state));

/**
 * Get content by tag
 */
const getByTag = (tag) =>
  NER_CONTENT.filter(item => item.tags.includes(tag));

/**
 * Get a random selection of N items, optionally filtered by difficulty
 * Used by the game engine to populate game cards
 */
const getRandomItems = (count, difficulty = null, category = null) => {
  let pool = [...NER_CONTENT];
  if (difficulty) pool = pool.filter(item => item.difficulty === difficulty);
  if (category) pool = pool.filter(item => item.category === category);

  // Shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, count);
};

/**
 * Get items suitable for memory matching game
 * Returns pairs-ready selection (count must be even)
 */
const getMatchingPairs = (pairCount, difficulty = 'easy') => {
  const items = getRandomItems(pairCount, difficulty);
  // Duplicate and shuffle for card pairs
  const pairs = [...items, ...items].sort(() => Math.random() - 0.5);
  return pairs;
};

/**
 * Get items for picture recall game
 */
const getPictureRecallSet = (studyCount, difficulty = 'easy') => {
  // Study set + distractors for the recall phase
  const studyItems = getRandomItems(studyCount, difficulty);
  const distractorPool = NER_CONTENT.filter(
    item => !studyItems.find(s => s.id === item.id) &&
    (difficulty ? item.difficulty === difficulty : true)
  );

  // Shuffle distractors and pick ~half study count
  const distractors = distractorPool
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.ceil(studyCount / 2));

  return { studyItems, distractors };
};

/**
 * Get sequence items for sequence memory game
 */
const getSequenceItems = (length, difficulty = 'easy') => {
  return getRandomItems(length, difficulty);
};

// Difficulty-to-count mapping for games
const GAME_CONFIG = {
  memoryMatching: { easy: 6, medium: 10, hard: 16 },     // pair counts
  pictureRecall:  { easy: 4, medium: 6,  hard: 9  },     // study item counts
  sequenceMemory: { easy: 3, medium: 5,  hard: 7  },     // sequence length
  patternAttention:{ easy: 4, medium: 6, hard: 9  }      // grid items
};

const CATEGORIES = [...new Set(NER_CONTENT.map(i => i.category))];
const STATES = ['Assam', 'Manipur', 'Meghalaya', 'Nagaland', 'Mizoram', 'Arunachal Pradesh', 'Sikkim', 'Tripura'];
const TOTAL_ITEMS = NER_CONTENT.length;

module.exports = {
  NER_CONTENT,
  GAME_CONFIG,
  CATEGORIES,
  STATES,
  TOTAL_ITEMS,
  getByCategory,
  getByDifficulty,
  getByState,
  getByTag,
  getRandomItems,
  getMatchingPairs,
  getPictureRecallSet,
  getSequenceItems
};
