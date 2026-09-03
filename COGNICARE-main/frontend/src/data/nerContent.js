/**
 * DementiaCare+ — NER Cultural Content (Frontend copy)
 * Mirrors backend data for offline-first game rendering.
 * Each item uses emoji as visual fallback while real images load.
 */

export const NER_CONTENT = [
  // FOODS
  { id: 'rice_assam', label: 'Joha Rice', nativeLabel: 'জহা চাউল', category: 'food', emoji: '🍚', state: ['Assam'], description: 'Fragrant Assamese rice used in festivals and daily meals.', difficulty: 'easy', tags: ['food', 'assam'] },
  { id: 'pitha', label: 'Pitha', nativeLabel: 'পিঠা', category: 'food', emoji: '🥮', state: ['Assam', 'Manipur'], description: 'Traditional rice cake prepared during Bihu.', difficulty: 'easy', tags: ['food', 'festival'] },
  { id: 'bamboo_shoot', label: 'Bamboo Shoot', nativeLabel: 'বাঁহৰ গাজ', category: 'food', emoji: '🎍', state: ['Assam', 'Nagaland', 'Manipur'], description: 'Staple NER ingredient used in curries and pickles.', difficulty: 'easy', tags: ['food', 'vegetable'] },
  { id: 'eromba', label: 'Eromba', nativeLabel: 'এৰোম্বা', category: 'food', emoji: '🌶️', state: ['Manipur'], description: 'Manipuri dish with boiled vegetables and fermented fish.', difficulty: 'medium', tags: ['food', 'manipur'] },
  { id: 'smoked_pork', label: 'Smoked Pork', nativeLabel: 'Vawksa Rep', category: 'food', emoji: '🥩', state: ['Nagaland', 'Mizoram'], description: 'Wood-smoked pork delicacy across NER.', difficulty: 'easy', tags: ['food', 'nagaland'] },
  { id: 'til_pitha', label: 'Til Pitha', nativeLabel: 'তিল পিঠা', category: 'food', emoji: '🍡', state: ['Assam'], description: 'Sesame rice pitha made during Magh Bihu.', difficulty: 'easy', tags: ['food', 'festival', 'assam'] },
  { id: 'fish_tenga', label: 'Fish Tenga', nativeLabel: 'মাছ টেঙা', category: 'food', emoji: '🐟', state: ['Assam'], description: 'Light sour fish curry — an Assamese classic.', difficulty: 'easy', tags: ['food', 'assam'] },
  { id: 'jadoh', label: 'Jadoh', nativeLabel: 'Jadoh', category: 'food', emoji: '🍛', state: ['Meghalaya'], description: 'Khasi rice dish cooked with pork and spices.', difficulty: 'medium', tags: ['food', 'meghalaya'] },
  { id: 'raja_chilli', label: 'Raja Mircha', nativeLabel: 'ৰজা জলকীয়া', category: 'food', emoji: '🌶️', state: ['Nagaland', 'Assam'], description: 'One of the world\'s hottest chillies from NER.', difficulty: 'easy', tags: ['food', 'spice'] },
  { id: 'apong', label: 'Apong (Rice Beer)', nativeLabel: 'আপং', category: 'food', emoji: '🍺', state: ['Assam', 'Arunachal Pradesh'], description: 'Traditional rice beer of the Mising tribe.', difficulty: 'medium', tags: ['food', 'drink', 'tribal'] },

  // FESTIVALS
  { id: 'bihu', label: 'Bihu', nativeLabel: 'বিহু', category: 'festival', emoji: '🎊', state: ['Assam'], description: 'Most important festival of Assam.', difficulty: 'easy', tags: ['festival', 'assam'] },
  { id: 'hornbill_festival', label: 'Hornbill Festival', nativeLabel: 'Hornbill Festival', category: 'festival', emoji: '🦜', state: ['Nagaland'], description: 'Week-long Naga tribal heritage celebration.', difficulty: 'medium', tags: ['festival', 'nagaland'] },
  { id: 'sangai_festival', label: 'Sangai Festival', nativeLabel: 'সাংগাই উৎসৱ', category: 'festival', emoji: '🦌', state: ['Manipur'], description: 'Manipur\'s largest tourism festival.', difficulty: 'medium', tags: ['festival', 'manipur'] },
  { id: 'chapchar_kut', label: 'Chapchar Kut', nativeLabel: 'Chapchar Kut', category: 'festival', emoji: '🌸', state: ['Mizoram'], description: 'Spring festival of Mizoram.', difficulty: 'medium', tags: ['festival', 'mizoram'] },
  { id: 'wangala', label: 'Wangala Festival', nativeLabel: 'Wangala', category: 'festival', emoji: '🥁', state: ['Meghalaya'], description: 'Harvest festival of the Garo people.', difficulty: 'medium', tags: ['festival', 'meghalaya'] },

  // LANDMARKS
  { id: 'kamakhya', label: 'Kamakhya Temple', nativeLabel: 'কামাখ্যা মন্দিৰ', category: 'landmark', emoji: '🛕', state: ['Assam'], description: 'Sacred Hindu temple on Nilachal Hill, Guwahati.', difficulty: 'easy', tags: ['landmark', 'assam', 'temple'] },
  { id: 'kaziranga', label: 'Kaziranga', nativeLabel: 'কাজিৰঙা', category: 'landmark', emoji: '🦏', state: ['Assam'], description: 'UNESCO park, home to one-horned rhinos.', difficulty: 'easy', tags: ['landmark', 'assam', 'wildlife'] },
  { id: 'loktak', label: 'Loktak Lake', nativeLabel: 'লোকটাক হ্ৰদ', category: 'landmark', emoji: '🏞️', state: ['Manipur'], description: 'Largest freshwater lake in northeast India.', difficulty: 'medium', tags: ['landmark', 'manipur'] },
  { id: 'cherrapunji', label: 'Cherrapunji', nativeLabel: 'Sohra', category: 'landmark', emoji: '🌧️', state: ['Meghalaya'], description: 'One of the wettest places on Earth.', difficulty: 'easy', tags: ['landmark', 'meghalaya'] },
  { id: 'tawang', label: 'Tawang Monastery', nativeLabel: 'Tawang Gompa', category: 'landmark', emoji: '🏯', state: ['Arunachal Pradesh'], description: 'Largest monastery in India.', difficulty: 'medium', tags: ['landmark', 'arunachal'] },
  { id: 'brahmaputra', label: 'Brahmaputra River', nativeLabel: 'ব্ৰহ্মপুত্ৰ নদী', category: 'landmark', emoji: '🌊', state: ['Assam'], description: 'Mighty river flowing through Assam.', difficulty: 'easy', tags: ['landmark', 'assam', 'river'] },

  // CLOTHING
  { id: 'mekhela', label: 'Mekhela Chador', nativeLabel: 'মেখেলা চাদৰ', category: 'clothing', emoji: '👘', state: ['Assam'], description: 'Traditional Assamese silk dress for women.', difficulty: 'easy', tags: ['clothing', 'assam', 'silk'] },
  { id: 'muga_silk', label: 'Muga Silk', nativeLabel: 'মুগা ৰেচম', category: 'clothing', emoji: '🧵', state: ['Assam'], description: 'Golden natural silk unique to Assam.', difficulty: 'medium', tags: ['clothing', 'assam', 'silk'] },
  { id: 'naga_shawl', label: 'Naga Shawl', nativeLabel: 'Naga Shawl', category: 'clothing', emoji: '🧣', state: ['Nagaland'], description: 'Handwoven clan-patterned tribal shawl.', difficulty: 'easy', tags: ['clothing', 'nagaland'] },
  { id: 'phanek', label: 'Phanek', nativeLabel: 'ফানেক', category: 'clothing', emoji: '🪡', state: ['Manipur'], description: 'Traditional wraparound skirt of Meitei women.', difficulty: 'medium', tags: ['clothing', 'manipur'] },

  // PLANTS
  { id: 'foxtail_orchid', label: 'Foxtail Orchid', nativeLabel: 'কপৌ ফুল', category: 'plant', emoji: '🌸', state: ['Assam'], description: 'State flower of Assam, worn during Bihu.', difficulty: 'easy', tags: ['plant', 'flower', 'assam'] },
  { id: 'bamboo', label: 'Bamboo', nativeLabel: 'বাঁহ', category: 'plant', emoji: '🎋', state: ['Assam', 'Nagaland', 'Manipur'], description: 'Integral to life across NER.', difficulty: 'easy', tags: ['plant', 'bamboo'] },
  { id: 'rhododendron', label: 'Rhododendron', nativeLabel: 'বুৰঞ্জী ফুল', category: 'plant', emoji: '🌺', state: ['Arunachal Pradesh', 'Sikkim'], description: 'Hillside blooms of spring in NER.', difficulty: 'easy', tags: ['plant', 'flower', 'sikkim'] },
  { id: 'betel_nut', label: 'Betel Nut', nativeLabel: 'তামোল', category: 'plant', emoji: '🥜', state: ['Assam'], description: 'Symbol of Assamese hospitality.', difficulty: 'easy', tags: ['plant', 'assam', 'tradition'] },
  { id: 'tea_plant', label: 'Tea Plant', nativeLabel: 'চাহ গছ', category: 'plant', emoji: '🍃', state: ['Assam'], description: 'Assam — one of the world\'s largest tea regions.', difficulty: 'easy', tags: ['plant', 'assam', 'tea'] },

  // ANIMALS
  { id: 'rhino', label: 'One-Horned Rhino', nativeLabel: 'একশিঙীয়া গঁড়', category: 'animal', emoji: '🦏', state: ['Assam'], description: 'Iconic animal of Kaziranga.', difficulty: 'easy', tags: ['animal', 'assam', 'wildlife'] },
  { id: 'sangai', label: 'Sangai Deer', nativeLabel: 'সাংগাই হৰিণ', category: 'animal', emoji: '🦌', state: ['Manipur'], description: 'Brow-antlered state animal of Manipur.', difficulty: 'medium', tags: ['animal', 'manipur'] },
  { id: 'hornbill', label: 'Great Hornbill', nativeLabel: 'হৰ্নবিল', category: 'animal', emoji: '🦜', state: ['Arunachal Pradesh', 'Nagaland'], description: 'Symbol of Naga heritage.', difficulty: 'easy', tags: ['animal', 'bird', 'nagaland'] },
  { id: 'elephant', label: 'Asian Elephant', nativeLabel: 'হাতী', category: 'animal', emoji: '🐘', state: ['Assam'], description: 'Wild elephants of northeast forests.', difficulty: 'easy', tags: ['animal', 'assam'] },
  { id: 'dolphin', label: 'River Dolphin', nativeLabel: 'শিহু', category: 'animal', emoji: '🐬', state: ['Assam'], description: 'National aquatic animal found in Brahmaputra.', difficulty: 'medium', tags: ['animal', 'assam', 'river'] },

  // EVERYDAY OBJECTS
  { id: 'dhol', label: 'Dhol (Drum)', nativeLabel: 'ঢোল', category: 'everyday_object', emoji: '🥁', state: ['Assam', 'Manipur'], description: 'Traditional drum of Bihu celebrations.', difficulty: 'easy', tags: ['object', 'instrument', 'assam'] },
  { id: 'pepa', label: 'Pepa (Flute)', nativeLabel: 'পেঁপা', category: 'everyday_object', emoji: '🎵', state: ['Assam'], description: 'Buffalo horn flute of Bihu.', difficulty: 'medium', tags: ['object', 'instrument', 'assam'] },
  { id: 'jaapi', label: 'Jaapi (Hat)', nativeLabel: 'জাপি', category: 'everyday_object', emoji: '👒', state: ['Assam'], description: 'Iconic bamboo conical hat of Assam.', difficulty: 'easy', tags: ['object', 'assam', 'iconic'] },
  { id: 'xorai', label: 'Xorai', nativeLabel: 'চৰাই', category: 'everyday_object', emoji: '🏺', state: ['Assam'], description: 'Sacred brass vessel used in rituals.', difficulty: 'medium', tags: ['object', 'assam', 'brass'] },
  { id: 'cane_basket', label: 'Cane Basket', nativeLabel: 'বেত পাচি', category: 'everyday_object', emoji: '🧺', state: ['Assam', 'Nagaland', 'Manipur'], description: 'Handwoven basket used across NER.', difficulty: 'easy', tags: ['object', 'craft'] },

  // FOLK ARTS
  { id: 'bihu_dance', label: 'Bihu Dance', nativeLabel: 'বিহু নৃত্য', category: 'folk_art', emoji: '💃', state: ['Assam'], description: 'Vibrant folk dance of Assam.', difficulty: 'easy', tags: ['folk_art', 'dance', 'assam'] },
  { id: 'sattriya', label: 'Sattriya Dance', nativeLabel: 'সত্ৰীয়া নৃত্য', category: 'folk_art', emoji: '🩰', state: ['Assam'], description: 'Classical dance of Assam\'s monasteries.', difficulty: 'medium', tags: ['folk_art', 'dance', 'assam'] },
  { id: 'cheraw', label: 'Cheraw (Bamboo Dance)', nativeLabel: 'Cheraw', category: 'folk_art', emoji: '🎋', state: ['Mizoram'], description: 'Iconic bamboo dance of Mizoram.', difficulty: 'easy', tags: ['folk_art', 'dance', 'mizoram'] },
];

export const GAME_CONFIG = {
  memoryMatching:  { easy: 6, medium: 10, hard: 16 },
  pictureRecall:   { easy: 4, medium: 6,  hard: 9  },
  sequenceMemory:  { easy: 3, medium: 5,  hard: 8  },
  patternAttention: { easy: 4, medium: 6,  hard: 9  }
};

export const CATEGORIES = [...new Set(NER_CONTENT.map(i => i.category))];

/** Shuffle helper */
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Get random items filtered by difficulty/category */
export const getRandomItems = (count, difficulty = null, category = null) => {
  let pool = [...NER_CONTENT];
  if (difficulty) {
    if (difficulty === 'easy') {
      const easyPool = pool.filter(i => i.difficulty === 'easy');
      if (easyPool.length >= count) pool = easyPool;
    } else if (difficulty === 'medium') {
      const medPool = pool.filter(i => i.difficulty === 'easy' || i.difficulty === 'medium');
      if (medPool.length >= count) pool = medPool;
    } else {
      // Hard mode: include all content items for maximum variety
      pool = [...NER_CONTENT];
    }
  }

  if (category) {
    const catPool = pool.filter(i => i.category === category);
    if (catPool.length >= count) {
      pool = catPool;
    }
  }

  const selected = shuffle(pool).slice(0, count);
  if (selected.length < count) {
    const remaining = shuffle(NER_CONTENT.filter(i => !selected.some(s => s.id === i.id)));
    return [...selected, ...remaining.slice(0, count - selected.length)];
  }
  return selected;
};

/** Get pairs for memory matching */
export const getMatchingPairs = (pairCount, difficulty = 'easy') => {
  const items = getRandomItems(pairCount, difficulty);
  return shuffle([...items, ...items].map((item, idx) => ({ ...item, cardId: `${item.id}_${idx}`, flipped: false, matched: false })));
};

/** Get study set + distractors for picture recall */
export const getPictureRecallSet = (studyCount, difficulty = 'easy') => {
  const studyItems = getRandomItems(studyCount, difficulty);
  const usedIds = new Set(studyItems.map(i => i.id));
  const availableDistractors = NER_CONTENT.filter(i => !usedIds.has(i.id));
  const distractors = shuffle(availableDistractors).slice(0, Math.ceil(studyCount / 2));
  return { studyItems, distractors };
};

/** Get sequence for sequence memory */
export const getSequenceItems = (length, difficulty = 'easy') =>
  getRandomItems(length, difficulty);

/** Get items for pattern attention */
export const getPatternItems = (count, difficulty = 'easy') =>
  getRandomItems(count + 3, difficulty);

