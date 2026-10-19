import { DAPriceItem, DABulletinMeta } from '../types';

export const DA_BULLETIN_METADATA: DABulletinMeta = {
  bulletinDate: 'September 28, 2026',
  lastSynced: 'Today at 6:30 AM (DA AMAS Negros Oriental)',
  marketCenter: 'Dumaguete City & Negros Oriental Markets',
  dataSource: 'DA Agribusiness and Marketing Assistance Service (AMAS) Price Watch',
  agency: 'Department of Agriculture - Negros Oriental',
  totalCommodities: 34,
  inflationNote: 'Vegetable prices remain steady across Negros Oriental trading corridors with fresh harvests from Valencia and Canlaon.',
};

export const DA_DAILY_PRICES: DAPriceItem[] = [
  // --- Lowland Vegetables ---
  {
    id: 'da-ampalaya',
    commodity: 'Ampalaya (Bitter Gourd)',
    localName: 'Parya / Bitter Melon',
    variety: 'Native Dark Green',
    category: 'Lowland Vegetables',
    unit: 'kg',
    prevailingRetailPrice: 80,
    prevailingFarmgatePrice: 48,
    priceRangeMin: 70,
    priceRangeMax: 90,
    trend: 'up',
    changeAmount: 5,
    changePercent: 6.7,
    marketCenter: 'Negros Oriental (Dumaguete Market)',
    updatedDate: 'Sep 28, 2026',
    source: 'DA AMAS Negros Oriental',
    suggestedDirectFarmPrice: 65,
    notes: 'High demand from local eateries and carinderias in Dumaguete.',
  },
  {
    id: 'da-eggplant',
    commodity: 'Eggplant (Talong)',
    localName: 'Talong Puti / Long Purple',
    variety: 'Dumaguete Native Long',
    category: 'Lowland Vegetables',
    unit: 'kg',
    prevailingRetailPrice: 60,
    prevailingFarmgatePrice: 35,
    priceRangeMin: 50,
    priceRangeMax: 70,
    trend: 'stable',
    changeAmount: 0,
    changePercent: 0,
    marketCenter: 'Negros Oriental (Dumaguete Market)',
    updatedDate: 'Sep 28, 2026',
    source: 'DA AMAS Negros Oriental',
    suggestedDirectFarmPrice: 48,
    notes: 'Stable supply from Sibulan and Bacong farms.',
  },
  {
    id: 'da-tomato',
    commodity: 'Tomato (Kamatis)',
    localName: 'Kamatis Native',
    variety: 'Valencia Saladette / Native Round',
    category: 'Lowland Vegetables',
    unit: 'kg',
    prevailingRetailPrice: 55,
    prevailingFarmgatePrice: 32,
    priceRangeMin: 45,
    priceRangeMax: 65,
    trend: 'down',
    changeAmount: -5,
    changePercent: -8.3,
    marketCenter: 'Negros Oriental (Dumaguete Market)',
    updatedDate: 'Sep 28, 2026',
    source: 'DA AMAS Negros Oriental',
    suggestedDirectFarmPrice: 45,
    notes: 'Fresh morning harvests from Valencia volcanic slopes.',
  },
  {
    id: 'da-sitaw',
    commodity: 'String Beans (Sitaw)',
    localName: 'Balatong / Long Yard Beans',
    variety: 'Green Pods',
    category: 'Lowland Vegetables',
    unit: 'kg',
    prevailingRetailPrice: 65,
    prevailingFarmgatePrice: 38,
    priceRangeMin: 55,
    priceRangeMax: 75,
    trend: 'up',
    changeAmount: 3,
    changePercent: 4.8,
    marketCenter: 'Negros Oriental (Dumaguete Market)',
    updatedDate: 'Sep 28, 2026',
    source: 'DA AMAS Negros Oriental',
    suggestedDirectFarmPrice: 52,
    notes: 'Steady consumer demand for local home cooking.',
  },
  {
    id: 'da-squash',
    commodity: 'Squash (Kalabasa)',
    localName: 'Kalabasa / Kabotcha',
    variety: 'Suprema / Native Round',
    category: 'Lowland Vegetables',
    unit: 'kg',
    prevailingRetailPrice: 45,
    prevailingFarmgatePrice: 24,
    priceRangeMin: 35,
    priceRangeMax: 50,
    trend: 'stable',
    changeAmount: 0,
    changePercent: 0,
    marketCenter: 'Negros Oriental (Dumaguete Market)',
    updatedDate: 'Sep 28, 2026',
    source: 'DA AMAS Negros Oriental',
    suggestedDirectFarmPrice: 35,
    notes: 'Excellent shelf-life and sweet golden flesh.',
  },
  {
    id: 'da-pechay-tagalog',
    commodity: 'Pechay Tagalog',
    localName: 'Pechay Native',
    variety: 'Black Behi',
    category: 'Lowland Vegetables',
    unit: 'kg',
    prevailingRetailPrice: 50,
    prevailingFarmgatePrice: 28,
    priceRangeMin: 40,
    priceRangeMax: 60,
    trend: 'stable',
    changeAmount: 0,
    changePercent: 0,
    marketCenter: 'Negros Oriental (Dumaguete Market)',
    updatedDate: 'Sep 28, 2026',
    source: 'DA AMAS Negros Oriental',
    suggestedDirectFarmPrice: 38,
    notes: 'Fresh crisp morning bunches.',
  },
  {
    id: 'da-kangkong',
    commodity: 'Kangkong (Water Spinach)',
    localName: 'Tangcong / Water Convolvulus',
    variety: 'Upland / Riverbed Tender',
    category: 'Lowland Vegetables',
    unit: 'kg',
    prevailingRetailPrice: 50,
    prevailingFarmgatePrice: 25,
    priceRangeMin: 40,
    priceRangeMax: 60,
    trend: 'stable',
    changeAmount: 0,
    changePercent: 0,
    marketCenter: 'Negros Oriental (Dumaguete Market)',
    updatedDate: 'Sep 28, 2026',
    source: 'DA AMAS Negros Oriental',
    suggestedDirectFarmPrice: 38,
    notes: 'Fast-growing fresh leafy greens from local clean waterways.',
  },
  {
    id: 'da-okra',
    commodity: 'Okra (Lady Finger)',
    localName: 'Okra Smooth Green',
    variety: 'Native Tender Pod',
    category: 'Lowland Vegetables',
    unit: 'kg',
    prevailingRetailPrice: 60,
    prevailingFarmgatePrice: 34,
    priceRangeMin: 50,
    priceRangeMax: 70,
    trend: 'down',
    changeAmount: -2,
    changePercent: -3.2,
    marketCenter: 'Negros Oriental (Dumaguete Market)',
    updatedDate: 'Sep 28, 2026',
    source: 'DA AMAS Negros Oriental',
    suggestedDirectFarmPrice: 46,
    notes: 'Young and tender green pods.',
  },
  {
    id: 'da-upo',
    commodity: 'Upo (Bottle Gourd)',
    localName: 'Upo White Long',
    variety: 'Tambuli',
    category: 'Lowland Vegetables',
    unit: 'kg',
    prevailingRetailPrice: 40,
    prevailingFarmgatePrice: 20,
    priceRangeMin: 30,
    priceRangeMax: 45,
    trend: 'stable',
    changeAmount: 0,
    changePercent: 0,
    marketCenter: 'Negros Oriental (Dumaguete Market)',
    updatedDate: 'Sep 28, 2026',
    source: 'DA AMAS Negros Oriental',
    suggestedDirectFarmPrice: 30,
    notes: 'Freshly harvested bottle gourd.',
  },
  {
    id: 'da-patola',
    commodity: 'Patola (Sponge Gourd)',
    localName: 'Patola Ribbed / Angled Luffa',
    variety: 'Smooth & Ribbed',
    category: 'Lowland Vegetables',
    unit: 'kg',
    prevailingRetailPrice: 50,
    prevailingFarmgatePrice: 28,
    priceRangeMin: 40,
    priceRangeMax: 60,
    trend: 'up',
    changeAmount: 4,
    changePercent: 8.7,
    marketCenter: 'Negros Oriental (Dumaguete Market)',
    updatedDate: 'Sep 28, 2026',
    source: 'DA AMAS Negros Oriental',
    suggestedDirectFarmPrice: 40,
    notes: 'Sourced from local Valencia growers.',
  },

  // --- Highland Vegetables ---
  {
    id: 'da-cabbage',
    commodity: 'Cabbage (Repolyo)',
    localName: 'Repolyo / Head Cabbage',
    variety: 'Wonderball / Scorpio',
    category: 'Highland Vegetables',
    unit: 'kg',
    prevailingRetailPrice: 75,
    prevailingFarmgatePrice: 45,
    priceRangeMin: 65,
    priceRangeMax: 90,
    trend: 'up',
    changeAmount: 5,
    changePercent: 7.1,
    marketCenter: 'Negros Oriental (Dumaguete Market)',
    updatedDate: 'Sep 28, 2026',
    source: 'DA AMAS Negros Oriental',
    suggestedDirectFarmPrice: 60,
    notes: 'Sourced from Canlaon City and Valencia highlands.',
  },
  {
    id: 'da-carrots',
    commodity: 'Carrots',
    localName: 'Karot / Orange Crunch',
    variety: 'Kuroda / Highland Sweet',
    category: 'Highland Vegetables',
    unit: 'kg',
    prevailingRetailPrice: 70,
    prevailingFarmgatePrice: 42,
    priceRangeMin: 60,
    priceRangeMax: 80,
    trend: 'stable',
    changeAmount: 0,
    changePercent: 0,
    marketCenter: 'Negros Oriental (Dumaguete Market)',
    updatedDate: 'Sep 28, 2026',
    source: 'DA AMAS Negros Oriental',
    suggestedDirectFarmPrice: 56,
    notes: 'Sweet crisp carrots from Mount Canlaon foothills.',
  },
  {
    id: 'da-baguio-beans',
    commodity: 'Baguio Beans (Habitchuelas)',
    localName: 'Snap Beans / Baguio Beans',
    variety: 'Kentucky Wonder / French Bush',
    category: 'Highland Vegetables',
    unit: 'kg',
    prevailingRetailPrice: 80,
    prevailingFarmgatePrice: 48,
    priceRangeMin: 70,
    priceRangeMax: 95,
    trend: 'up',
    changeAmount: 5,
    changePercent: 6.7,
    marketCenter: 'Negros Oriental (Dumaguete Market)',
    updatedDate: 'Sep 28, 2026',
    source: 'DA AMAS Negros Oriental',
    suggestedDirectFarmPrice: 65,
    notes: 'Popular choice for local Dumaguete restaurants.',
  },
  {
    id: 'da-bell-pepper-green',
    commodity: 'Bell Pepper (Green)',
    localName: 'Atsal Green / Sweet Pepper',
    variety: 'California Wonder',
    category: 'Highland Vegetables',
    unit: 'kg',
    prevailingRetailPrice: 120,
    prevailingFarmgatePrice: 70,
    priceRangeMin: 100,
    priceRangeMax: 140,
    trend: 'up',
    changeAmount: 10,
    changePercent: 9.1,
    marketCenter: 'Negros Oriental (Dumaguete Market)',
    updatedDate: 'Sep 28, 2026',
    source: 'DA AMAS Negros Oriental',
    suggestedDirectFarmPrice: 95,
    notes: 'Crisp green sweet peppers grown in cool mountain air.',
  },
  {
    id: 'da-bell-pepper-red',
    commodity: 'Bell Pepper (Red / Yellow)',
    localName: 'Atsal Pula / Sweet Red',
    variety: 'Red Beauty',
    category: 'Highland Vegetables',
    unit: 'kg',
    prevailingRetailPrice: 160,
    prevailingFarmgatePrice: 95,
    priceRangeMin: 140,
    priceRangeMax: 180,
    trend: 'up',
    changeAmount: 10,
    changePercent: 6.7,
    marketCenter: 'Negros Oriental (Dumaguete Market)',
    updatedDate: 'Sep 28, 2026',
    source: 'DA AMAS Negros Oriental',
    suggestedDirectFarmPrice: 130,
    notes: 'Sweet ripe bell peppers from Valencia greenhouse growers.',
  },
  {
    id: 'da-pechay-baguio',
    commodity: 'Pechay Baguio (Wombok)',
    localName: 'Chinese Cabbage / Wombok',
    variety: 'Napa Cabbage',
    category: 'Highland Vegetables',
    unit: 'kg',
    prevailingRetailPrice: 60,
    prevailingFarmgatePrice: 35,
    priceRangeMin: 50,
    priceRangeMax: 70,
    trend: 'down',
    changeAmount: -3,
    changePercent: -4.8,
    marketCenter: 'Negros Oriental (Dumaguete Market)',
    updatedDate: 'Sep 28, 2026',
    source: 'DA AMAS Negros Oriental',
    suggestedDirectFarmPrice: 48,
    notes: 'Crisp highland Chinese cabbage.',
  },
  {
    id: 'da-lettuce',
    commodity: 'Romaine / Green Ice Lettuce',
    localName: 'Lettuce / Salada',
    variety: 'Hydroponic & Soil Grown',
    category: 'Highland Vegetables',
    unit: 'kg',
    prevailingRetailPrice: 110,
    prevailingFarmgatePrice: 65,
    priceRangeMin: 90,
    priceRangeMax: 130,
    trend: 'stable',
    changeAmount: 0,
    changePercent: 0,
    marketCenter: 'Negros Oriental (Dumaguete Market)',
    updatedDate: 'Sep 28, 2026',
    source: 'DA AMAS Negros Oriental',
    suggestedDirectFarmPrice: 85,
    notes: 'Freshly harvested for local salad bars and cafes.',
  },
  {
    id: 'da-sayote',
    commodity: 'Sayote (Chayote)',
    localName: 'Sayote Green',
    variety: 'Valencia Highland Smooth',
    category: 'Highland Vegetables',
    unit: 'kg',
    prevailingRetailPrice: 35,
    prevailingFarmgatePrice: 18,
    priceRangeMin: 25,
    priceRangeMax: 40,
    trend: 'stable',
    changeAmount: 0,
    changePercent: 0,
    marketCenter: 'Negros Oriental (Dumaguete Market)',
    updatedDate: 'Sep 28, 2026',
    source: 'DA AMAS Negros Oriental',
    suggestedDirectFarmPrice: 28,
    notes: 'Abundant harvests from Valencia mountain trellises.',
  },
  {
    id: 'da-broccoli',
    commodity: 'Broccoli',
    localName: 'Broccoli Green Crown',
    variety: 'Highland Crown',
    category: 'Highland Vegetables',
    unit: 'kg',
    prevailingRetailPrice: 200,
    prevailingFarmgatePrice: 120,
    priceRangeMin: 180,
    priceRangeMax: 240,
    trend: 'stable',
    changeAmount: 0,
    changePercent: 0,
    marketCenter: 'Negros Oriental (Dumaguete Market)',
    updatedDate: 'Sep 28, 2026',
    source: 'DA AMAS Negros Oriental',
    suggestedDirectFarmPrice: 160,
    notes: 'Premium highland crowns from Canlaon.',
  },
  {
    id: 'da-cauliflower',
    commodity: 'Cauliflower',
    localName: 'Cauliflower White Head',
    variety: 'Highland Snow',
    category: 'Highland Vegetables',
    unit: 'kg',
    prevailingRetailPrice: 190,
    prevailingFarmgatePrice: 110,
    priceRangeMin: 170,
    priceRangeMax: 220,
    trend: 'stable',
    changeAmount: 0,
    changePercent: 0,
    marketCenter: 'Negros Oriental (Dumaguete Market)',
    updatedDate: 'Sep 28, 2026',
    source: 'DA AMAS Negros Oriental',
    suggestedDirectFarmPrice: 150,
    notes: 'Fresh white cauliflower heads from mountain farms.',
  },

  // --- Spices & Aromatics ---
  {
    id: 'da-red-onion',
    commodity: 'Red Onion (Sibuyas Pula)',
    localName: 'Sibuyas Pula / Shallot',
    variety: 'Native Medium Bulb',
    category: 'Spices & Aromatics',
    unit: 'kg',
    prevailingRetailPrice: 100,
    prevailingFarmgatePrice: 62,
    priceRangeMin: 90,
    priceRangeMax: 120,
    trend: 'stable',
    changeAmount: 0,
    changePercent: 0,
    marketCenter: 'Negros Oriental (Dumaguete Market)',
    updatedDate: 'Sep 28, 2026',
    source: 'DA AMAS Negros Oriental',
    suggestedDirectFarmPrice: 82,
    notes: 'Essential spice with steady daily demand.',
  },
  {
    id: 'da-white-onion',
    commodity: 'White / Yellow Onion',
    localName: 'Sibuyas Puti',
    variety: 'Sweet White Bulb',
    category: 'Spices & Aromatics',
    unit: 'kg',
    prevailingRetailPrice: 110,
    prevailingFarmgatePrice: 68,
    priceRangeMin: 95,
    priceRangeMax: 130,
    trend: 'stable',
    changeAmount: 0,
    changePercent: 0,
    marketCenter: 'Negros Oriental (Dumaguete Market)',
    updatedDate: 'Sep 28, 2026',
    source: 'DA AMAS Negros Oriental',
    suggestedDirectFarmPrice: 88,
    notes: 'Popular for sautés and savory sauces.',
  },
  {
    id: 'da-garlic-native',
    commodity: 'Native Garlic (Bawang)',
    localName: 'Bawang Bisaya / Native Garlic',
    variety: 'Visayan White',
    category: 'Spices & Aromatics',
    unit: 'kg',
    prevailingRetailPrice: 130,
    prevailingFarmgatePrice: 80,
    priceRangeMin: 110,
    priceRangeMax: 150,
    trend: 'stable',
    changeAmount: 0,
    changePercent: 0,
    marketCenter: 'Negros Oriental (Dumaguete Market)',
    updatedDate: 'Sep 28, 2026',
    source: 'DA AMAS Negros Oriental',
    suggestedDirectFarmPrice: 105,
    notes: 'Aromatic native garlic cloves.',
  },
  {
    id: 'da-ginger',
    commodity: 'Ginger (Luya)',
    localName: 'Luya Puti / Native Ginger',
    variety: 'Native Visayan',
    category: 'Spices & Aromatics',
    unit: 'kg',
    prevailingRetailPrice: 110,
    prevailingFarmgatePrice: 62,
    priceRangeMin: 90,
    priceRangeMax: 130,
    trend: 'up',
    changeAmount: 8,
    changePercent: 7.8,
    marketCenter: 'Negros Oriental (Dumaguete Market)',
    updatedDate: 'Sep 28, 2026',
    source: 'DA AMAS Negros Oriental',
    suggestedDirectFarmPrice: 85,
    notes: 'Freshly harvested ginger root from mountain plots.',
  },
  {
    id: 'da-chili-labuyo',
    commodity: "Siling Labuyo (Bird's Eye Chili)",
    localName: 'Katsubong / Hot Pepper',
    variety: 'Native Pure Labuyo',
    category: 'Spices & Aromatics',
    unit: 'kg',
    prevailingRetailPrice: 280,
    prevailingFarmgatePrice: 160,
    priceRangeMin: 220,
    priceRangeMax: 350,
    trend: 'down',
    changeAmount: -20,
    changePercent: -6.7,
    marketCenter: 'Negros Oriental (Dumaguete Market)',
    updatedDate: 'Sep 28, 2026',
    source: 'DA AMAS Negros Oriental',
    suggestedDirectFarmPrice: 220,
    notes: 'High pungency fresh local siling labuyo.',
  },
  {
    id: 'da-basil-herbs',
    commodity: 'Fresh Culinary Herbs (Basil, Rosemary)',
    localName: 'Herba / Sweet Basil',
    variety: 'Italian Genovese',
    category: 'Spices & Aromatics',
    unit: 'kg',
    prevailingRetailPrice: 150,
    prevailingFarmgatePrice: 90,
    priceRangeMin: 120,
    priceRangeMax: 180,
    trend: 'stable',
    changeAmount: 0,
    changePercent: 0,
    marketCenter: 'Negros Oriental (Dumaguete Market)',
    updatedDate: 'Sep 28, 2026',
    source: 'DA AMAS Negros Oriental',
    suggestedDirectFarmPrice: 120,
    notes: 'Fresh aromatic herbs for local home and bistro cooks.',
  },

  // --- Fruits & Citrus ---
  {
    id: 'da-calamansi',
    commodity: 'Calamansi',
    localName: 'Limonsito / Calamondin',
    variety: 'Juicy Green Native',
    category: 'Fruits',
    unit: 'kg',
    prevailingRetailPrice: 75,
    prevailingFarmgatePrice: 42,
    priceRangeMin: 60,
    priceRangeMax: 90,
    trend: 'stable',
    changeAmount: 0,
    changePercent: 0,
    marketCenter: 'Negros Oriental (Dumaguete Market)',
    updatedDate: 'Sep 28, 2026',
    source: 'DA AMAS Negros Oriental',
    suggestedDirectFarmPrice: 58,
    notes: 'Fresh juicy calamansi from Bacong and Dauin orchards.',
  },
  {
    id: 'da-banana-lakatan',
    commodity: 'Banana (Lakatan)',
    localName: 'Saging Lakatan',
    variety: 'Golden Sweet',
    category: 'Fruits',
    unit: 'kg',
    prevailingRetailPrice: 70,
    prevailingFarmgatePrice: 40,
    priceRangeMin: 60,
    priceRangeMax: 80,
    trend: 'stable',
    changeAmount: 0,
    changePercent: 0,
    marketCenter: 'Negros Oriental (Dumaguete Market)',
    updatedDate: 'Sep 28, 2026',
    source: 'DA AMAS Negros Oriental',
    suggestedDirectFarmPrice: 55,
    notes: 'Golden sweet bananas freshly cut from trees.',
  },
  {
    id: 'da-papaya',
    commodity: 'Papaya (Solo / Red Lady)',
    localName: 'Kapayas / Sweet Red',
    variety: 'Red Lady F1',
    category: 'Fruits',
    unit: 'kg',
    prevailingRetailPrice: 45,
    prevailingFarmgatePrice: 24,
    priceRangeMin: 35,
    priceRangeMax: 55,
    trend: 'stable',
    changeAmount: 0,
    changePercent: 0,
    marketCenter: 'Negros Oriental (Dumaguete Market)',
    updatedDate: 'Sep 28, 2026',
    source: 'DA AMAS Negros Oriental',
    suggestedDirectFarmPrice: 35,
    notes: 'Sweet local papayas harvested at prime ripeness.',
  },

  // --- Root Crops ---
  {
    id: 'da-white-radish',
    commodity: 'White Radish (Labanos)',
    localName: 'Labanos / Daikon',
    variety: 'Mountain White',
    category: 'Root Crops',
    unit: 'kg',
    prevailingRetailPrice: 45,
    prevailingFarmgatePrice: 25,
    priceRangeMin: 35,
    priceRangeMax: 55,
    trend: 'stable',
    changeAmount: 0,
    changePercent: 0,
    marketCenter: 'Negros Oriental (Dumaguete Market)',
    updatedDate: 'Sep 28, 2026',
    source: 'DA AMAS Negros Oriental',
    suggestedDirectFarmPrice: 35,
    notes: 'Crisp white radish from Apolong, Valencia.',
  },
  {
    id: 'da-kamote',
    commodity: 'Sweet Potato (Kamote)',
    localName: 'Kamote Dilaw / Purple Yam',
    variety: 'Yellow Heart & Purple',
    category: 'Root Crops',
    unit: 'kg',
    prevailingRetailPrice: 45,
    prevailingFarmgatePrice: 25,
    priceRangeMin: 35,
    priceRangeMax: 55,
    trend: 'stable',
    changeAmount: 0,
    changePercent: 0,
    marketCenter: 'Negros Oriental (Dumaguete Market)',
    updatedDate: 'Sep 28, 2026',
    source: 'DA AMAS Negros Oriental',
    suggestedDirectFarmPrice: 35,
    notes: 'Naturally sweet nutrient-rich tubers.',
  },
  {
    id: 'da-cassava',
    commodity: 'Cassava (Kamoteng Kahoy)',
    localName: 'Balanghoy / Cassava',
    variety: 'Golden Sweet Cooking',
    category: 'Root Crops',
    unit: 'kg',
    prevailingRetailPrice: 30,
    prevailingFarmgatePrice: 15,
    priceRangeMin: 25,
    priceRangeMax: 38,
    trend: 'stable',
    changeAmount: 0,
    changePercent: 0,
    marketCenter: 'Negros Oriental (Dumaguete Market)',
    updatedDate: 'Sep 28, 2026',
    source: 'DA AMAS Negros Oriental',
    suggestedDirectFarmPrice: 22,
    notes: 'Freshly dug cassava tubers.',
  },

  // --- Staples & Rice ---
  {
    id: 'da-rice-well-milled',
    commodity: 'Well-Milled Rice (Local White)',
    localName: 'Bugas Humay / Well Milled',
    variety: 'Local Visayan Harvest',
    category: 'Staples & Rice',
    unit: 'kg',
    prevailingRetailPrice: 48,
    prevailingFarmgatePrice: 28,
    priceRangeMin: 45,
    priceRangeMax: 52,
    trend: 'stable',
    changeAmount: 0,
    changePercent: 0,
    marketCenter: 'Negros Oriental (Dumaguete Market)',
    updatedDate: 'Sep 28, 2026',
    source: 'DA AMAS Negros Oriental',
    suggestedDirectFarmPrice: 42,
    notes: 'Locally grown Visayan well-milled rice.',
  },
  {
    id: 'da-corn-grits',
    commodity: 'White Corn Grits (Mais)',
    localName: 'Bugas Mais / Corn Rice',
    variety: 'Visayan White Dent',
    category: 'Staples & Rice',
    unit: 'kg',
    prevailingRetailPrice: 38,
    prevailingFarmgatePrice: 22,
    priceRangeMin: 35,
    priceRangeMax: 42,
    trend: 'stable',
    changeAmount: 0,
    changePercent: 0,
    marketCenter: 'Negros Oriental (Dumaguete Market)',
    updatedDate: 'Sep 28, 2026',
    source: 'DA AMAS Negros Oriental',
    suggestedDirectFarmPrice: 30,
    notes: 'Wholesome white corn grits milled locally.',
  },
];

/**
 * Fuzzy matches a produce item name (e.g., "Sweet Native Tomatoes" -> "Tomato (Kamatis)")
 * to its corresponding DA Bantay Presyo item.
 */
export function findMatchingDAPrice(searchName: string): DAPriceItem | undefined {
  if (!searchName) return undefined;
  const clean = searchName.toLowerCase().trim();

  if (clean.includes('ampalaya') || clean.includes('bitter gourd') || clean.includes('parya')) {
    return DA_DAILY_PRICES.find((i) => i.id === 'da-ampalaya');
  }
  if (clean.includes('eggplant') || clean.includes('talong')) {
    return DA_DAILY_PRICES.find((i) => i.id === 'da-eggplant');
  }
  if (clean.includes('tomato') || clean.includes('kamatis')) {
    return DA_DAILY_PRICES.find((i) => i.id === 'da-tomato');
  }
  if (clean.includes('sitaw') || clean.includes('string bean') || clean.includes('balatong')) {
    return DA_DAILY_PRICES.find((i) => i.id === 'da-sitaw');
  }
  if (clean.includes('cabbage') || clean.includes('repolyo')) {
    return DA_DAILY_PRICES.find((i) => i.id === 'da-cabbage');
  }
  if (clean.includes('carrot') || clean.includes('karot')) {
    return DA_DAILY_PRICES.find((i) => i.id === 'da-carrots');
  }
  if (clean.includes('baguio bean') || clean.includes('snap bean') || clean.includes('habitchuelas')) {
    return DA_DAILY_PRICES.find((i) => i.id === 'da-baguio-beans');
  }
  if (clean.includes('squash') || clean.includes('kalabasa') || clean.includes('kabotcha')) {
    return DA_DAILY_PRICES.find((i) => i.id === 'da-squash');
  }
  if (clean.includes('kangkong') || clean.includes('water spinach')) {
    return DA_DAILY_PRICES.find((i) => i.id === 'da-kangkong');
  }
  if (clean.includes('okra')) {
    return DA_DAILY_PRICES.find((i) => i.id === 'da-okra');
  }
  if (clean.includes('radish') || clean.includes('labanos')) {
    return DA_DAILY_PRICES.find((i) => i.id === 'da-white-radish');
  }
  if (clean.includes('lettuce') || clean.includes('romaine')) {
    return DA_DAILY_PRICES.find((i) => i.id === 'da-lettuce');
  }
  if (clean.includes('bell pepper') || clean.includes('sweet pepper') || clean.includes('atsal')) {
    return clean.includes('red')
      ? DA_DAILY_PRICES.find((i) => i.id === 'da-bell-pepper-red')
      : DA_DAILY_PRICES.find((i) => i.id === 'da-bell-pepper-green');
  }
  if (clean.includes('red onion') || clean.includes('sibuyas pula')) {
    return DA_DAILY_PRICES.find((i) => i.id === 'da-red-onion');
  }
  if (clean.includes('white onion') || clean.includes('yellow onion') || clean.includes('sibuyas puti')) {
    return DA_DAILY_PRICES.find((i) => i.id === 'da-white-onion');
  }
  if (clean.includes('garlic') || clean.includes('bawang')) {
    return DA_DAILY_PRICES.find((i) => i.id === 'da-garlic-native');
  }
  if (clean.includes('ginger') || clean.includes('luya')) {
    return DA_DAILY_PRICES.find((i) => i.id === 'da-ginger');
  }
  if (clean.includes('chili') || clean.includes('labuyo') || clean.includes('sili')) {
    return DA_DAILY_PRICES.find((i) => i.id === 'da-chili-labuyo');
  }
  if (clean.includes('calamansi') || clean.includes('limonsito')) {
    return DA_DAILY_PRICES.find((i) => i.id === 'da-calamansi');
  }
  if (clean.includes('banana') || clean.includes('saging')) {
    return DA_DAILY_PRICES.find((i) => i.id === 'da-banana-lakatan');
  }
  if (clean.includes('papaya') || clean.includes('kapayas')) {
    return DA_DAILY_PRICES.find((i) => i.id === 'da-papaya');
  }
  if (clean.includes('sayote') || clean.includes('chayote')) {
    return DA_DAILY_PRICES.find((i) => i.id === 'da-sayote');
  }
  if (clean.includes('broccoli')) {
    return DA_DAILY_PRICES.find((i) => i.id === 'da-broccoli');
  }
  if (clean.includes('cauliflower')) {
    return DA_DAILY_PRICES.find((i) => i.id === 'da-cauliflower');
  }
  if (clean.includes('pechay') || clean.includes('wombok')) {
    return clean.includes('baguio') || clean.includes('wombok')
      ? DA_DAILY_PRICES.find((i) => i.id === 'da-pechay-baguio')
      : DA_DAILY_PRICES.find((i) => i.id === 'da-pechay-tagalog');
  }
  if (clean.includes('sweet potato') || clean.includes('kamote')) {
    return DA_DAILY_PRICES.find((i) => i.id === 'da-kamote');
  }
  if (clean.includes('cassava') || clean.includes('balanghoy')) {
    return DA_DAILY_PRICES.find((i) => i.id === 'da-cassava');
  }
  if (clean.includes('rice') || clean.includes('humay')) {
    return DA_DAILY_PRICES.find((i) => i.id === 'da-rice-well-milled');
  }
  if (clean.includes('corn') || clean.includes('mais')) {
    return DA_DAILY_PRICES.find((i) => i.id === 'da-corn-grits');
  }
  if (clean.includes('basil') || clean.includes('herb')) {
    return DA_DAILY_PRICES.find((i) => i.id === 'da-basil-herbs');
  }

  return DA_DAILY_PRICES.find(
    (item) =>
      item.commodity.toLowerCase().includes(clean) ||
      (item.localName && item.localName.toLowerCase().includes(clean))
  );
}

/**
 * Calculates direct-selling profit and buyer savings in Negros Oriental:
 * Compares Suggested Direct Farm Price vs Wet Market Retail.
 */
export function calculateAnoMuraSpread(item: DAPriceItem, volumeKg: number = 50) {
  const directFarmTotal = item.suggestedDirectFarmPrice * volumeKg;
  const retailTotal = item.prevailingRetailPrice * volumeKg;
  const buyerSavings = retailTotal - directFarmTotal;

  return {
    volumeKg,
    directFarmTotal,
    retailTotal,
    buyerSavings,
  };
}
