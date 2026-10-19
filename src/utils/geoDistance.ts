// Source: Google Maps Platform Code Assist
// Geo distance and location utility functions for Dumaguete and Negros Oriental

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LandmarkLocation {
  name: string;
  barangay: string;
  city: string;
  lat: number;
  lng: number;
  description: string;
}

export const DUMAGUETE_DEFAULT_COORDS: Coordinates = {
  lat: 9.3068,
  lng: 123.3054,
};

// Comprehensive coordinates database for Negros Oriental municipalities, cities, barangays, subdivisions, and agricultural hubs
export const NEGROS_ORIENTAL_LOCATIONS: Record<string, Coordinates> = {
  // Subdivisions, Streets & Specific Neighborhoods
  'jasonville subdv': { lat: 9.3031, lng: 123.2853 },
  'jasonville subdivision': { lat: 9.3031, lng: 123.2853 },
  'jasonville': { lat: 9.3031, lng: 123.2853 },
  'dumaguete-balugo rd': { lat: 9.3035, lng: 123.2850 },
  'dumaguete-balugo road': { lat: 9.3035, lng: 123.2850 },
  'balugo road': { lat: 9.3035, lng: 123.2850 },
  'lourdesville subdivision': { lat: 9.2990, lng: 123.2900 },
  'lourdesville': { lat: 9.2990, lng: 123.2900 },
  'villa amada subdivision': { lat: 9.3190, lng: 123.2850 },
  'villa amada': { lat: 9.3190, lng: 123.2850 },
  'camella dumaguete': { lat: 9.3420, lng: 123.2800 },
  'camella': { lat: 9.3420, lng: 123.2800 },
  'silliman heights': { lat: 9.3300, lng: 123.2750 },
  'perdices st': { lat: 9.3080, lng: 123.3080 },
  'perdices street': { lat: 9.3080, lng: 123.3080 },
  'real st': { lat: 9.3090, lng: 123.3040 },
  'real street': { lat: 9.3090, lng: 123.3040 },
  'colon extension': { lat: 9.3050, lng: 123.3020 },
  'hibbard ave': { lat: 9.3170, lng: 123.3090 },
  'hibbard avenue': { lat: 9.3170, lng: 123.3090 },

  // Dumaguete Barangays & Districts (Higher specificity)
  'northern junob': { lat: 9.3065, lng: 123.2878 },
  'junob covered court': { lat: 9.3061, lng: 123.2870 },
  'junob': { lat: 9.3061, lng: 123.2870 },
  'batinguel': { lat: 9.3080, lng: 123.2920 },
  'bagacay': { lat: 9.2980, lng: 123.2920 },
  'taclobo': { lat: 9.3040, lng: 123.2970 },
  'daro': { lat: 9.3150, lng: 123.2980 },
  'piapi': { lat: 9.3214, lng: 123.3082 },
  'bantayan': { lat: 9.3280, lng: 123.3035 },
  'calindagan': { lat: 9.2920, lng: 123.3010 },
  'cadawinonan': { lat: 9.3180, lng: 123.2750 },
  'candau-ay': { lat: 9.3120, lng: 123.2680 },
  'camanjac': { lat: 9.3350, lng: 123.2850 },
  'bajumpandan': { lat: 9.2830, lng: 123.2840 },
  'banilad': { lat: 9.2720, lng: 123.2950 },
  'mangnao': { lat: 9.2820, lng: 123.2990 },
  'cantil-e': { lat: 9.2950, lng: 123.2700 },
  'talay': { lat: 9.3080, lng: 123.2580 },
  'motong': { lat: 9.3230, lng: 123.2910 },
  'pulantubig': { lat: 9.3270, lng: 123.2980 },
  'balugo': { lat: 9.3020, lng: 123.2580 },
  'public market': { lat: 9.3068, lng: 123.3054 },
  'rizal boulevard': { lat: 9.3102, lng: 123.3105 },
  'silliman': { lat: 9.3150, lng: 123.3080 },

  // Valencia Highlands (Mount Talinis Foothills)
  'apolong': { lat: 9.2842, lng: 123.2380 },
  'malabo': { lat: 9.2785, lng: 123.2380 },
  'casaroro': { lat: 9.2790, lng: 123.2320 },
  'pulangbato': { lat: 9.3120, lng: 123.2180 },
  'bong-ao': { lat: 9.2870, lng: 123.2510 },
  'luzuriaga': { lat: 9.2820, lng: 123.2460 },
  'liptong': { lat: 9.2760, lng: 123.2580 },
  'valencia poblacion': { lat: 9.2818, lng: 123.2458 },
  'valencia': { lat: 9.2818, lng: 123.2458 },

  // Sibulan Agriculture Plains
  'maslog': { lat: 9.3450, lng: 123.2950 },
  'cangmating': { lat: 9.3710, lng: 123.2810 },
  'ajong': { lat: 9.3890, lng: 123.2680 },
  'san antonio': { lat: 9.3620, lng: 123.2620 },
  'calabnugan': { lat: 9.3410, lng: 123.2780 },
  'boloc-boloc': { lat: 9.3520, lng: 123.2890 },
  'sibulan poblacion': { lat: 9.3582, lng: 123.2842 },
  'sibulan': { lat: 9.3582, lng: 123.2842 },

  // Bacong Coastal & Lowland Farms
  'san roque': { lat: 9.2520, lng: 123.2950 },
  'kombado': { lat: 9.2410, lng: 123.2990 },
  'lutao': { lat: 9.2480, lng: 123.2880 },
  'timbanga': { lat: 9.2380, lng: 123.2840 },
  'bacong poblacion': { lat: 9.2457, lng: 123.2982 },
  'bacong': { lat: 9.2457, lng: 123.2982 },

  // Dauin Southern Agriculture
  'maluay': { lat: 9.1820, lng: 123.2610 },
  'masaplod': { lat: 9.2010, lng: 123.2740 },
  'maayongtubig': { lat: 9.2150, lng: 123.2820 },
  'lipayo': { lat: 9.2220, lng: 123.2870 },
  'dauin poblacion': { lat: 9.1915, lng: 123.2687 },
  'dauin': { lat: 9.1915, lng: 123.2687 },

  // Zamboanguita & Siaton
  'zamboanguita': { lat: 9.1022, lng: 123.1975 },
  'siaton': { lat: 9.0620, lng: 123.0333 },

  // San Jose & Amlan
  'san jose': { lat: 9.4180, lng: 123.2270 },
  'amlan': { lat: 9.4633, lng: 123.2272 },

  // Tanjay City, Bais City & Northern Negros
  'tanjay': { lat: 9.5167, lng: 123.1583 },
  'bais': { lat: 9.5911, lng: 123.1228 },
  'bais city': { lat: 9.5911, lng: 123.1228 },
  'canlaon': { lat: 10.3861, lng: 123.2250 },
  'canlaon city': { lat: 10.3861, lng: 123.2250 },
  'bayawan': { lat: 9.3667, lng: 122.8000 },

  // General Municipalities
  'dumaguete city': { lat: 9.3068, lng: 123.3054 },
  'dumaguete': { lat: 9.3068, lng: 123.3054 },
  'dgte': { lat: 9.3068, lng: 123.3054 },
};

export const POPULAR_LANDMARKS: LandmarkLocation[] = [
  {
    name: 'Jasonville Subdv',
    barangay: 'Barangay Junob',
    city: 'Dumaguete City',
    lat: 9.3031,
    lng: 123.2853,
    description: 'Jasonville Subdivision along Dumaguete-Balugo Road in Barangay Junob.',
  },
  {
    name: 'Dumaguete-Balugo Road',
    barangay: 'Barangay Junob',
    city: 'Dumaguete City',
    lat: 9.3035,
    lng: 123.2850,
    description: 'Dumaguete-Balugo Road connecting Junob and Balugo.',
  },
  {
    name: 'Northern Junob',
    barangay: 'Barangay Junob',
    city: 'Dumaguete City',
    lat: 9.3065,
    lng: 123.2878,
    description: 'Northern Junob community & residential farm area.',
  },
  {
    name: 'Junob Multipurpose Covered Court',
    barangay: 'Barangay Junob',
    city: 'Dumaguete City',
    lat: 9.3061,
    lng: 123.2870,
    description: 'Barangay Junob residential and community agricultural center.',
  },
  {
    name: 'Dumaguete Public Market & Tienda',
    barangay: 'Barangay 2 (Central Market)',
    city: 'Dumaguete City',
    lat: 9.3068,
    lng: 123.3054,
    description: 'Central fresh produce trading center and retail wet market.',
  },
  {
    name: 'Rizal Boulevard & Port Area',
    barangay: 'Barangay 4 (Rizal Blvd)',
    city: 'Dumaguete City',
    lat: 9.3102,
    lng: 123.3105,
    description: 'Downtown coastal promenade and residential corridor.',
  },
  {
    name: 'Batinguel / Taclobo District',
    barangay: 'Barangay Batinguel',
    city: 'Dumaguete City',
    lat: 9.3080,
    lng: 123.2920,
    description: 'Dumaguete urban-agricultural residential zone.',
  },
  {
    name: 'Daro & Silliman Area',
    barangay: 'Barangay Daro',
    city: 'Dumaguete City',
    lat: 9.3150,
    lng: 123.2980,
    description: 'Central educational and commerce district.',
  },
  {
    name: 'Bagacay & Cantil-e Corridor',
    barangay: 'Barangay Bagacay',
    city: 'Dumaguete City',
    lat: 9.2980,
    lng: 123.2920,
    description: 'Southern Dumaguete residential farming outskirts.',
  },
  {
    name: 'Valencia Highlands (Apolong Farm Valley)',
    barangay: 'Apolong',
    city: 'Valencia',
    lat: 9.2842,
    lng: 123.2380,
    description: 'Cool volcanic mountain farm district below Mount Talinis.',
  },
  {
    name: 'Valencia Malabo & Casaroro Highland',
    barangay: 'Malabo',
    city: 'Valencia',
    lat: 9.2785,
    lng: 123.2380,
    description: 'Mountain organic vegetable and herb growers area.',
  },
  {
    name: 'Valencia Poblacion (Town Center)',
    barangay: 'Poblacion',
    city: 'Valencia',
    lat: 9.2818,
    lng: 123.2458,
    description: 'Valencia town center and highland agricultural dispatch.',
  },
  {
    name: 'Sibulan Agro-Plain (Maslog Area)',
    barangay: 'Maslog',
    city: 'Sibulan',
    lat: 9.3450,
    lng: 123.2950,
    description: 'Northern agriculture hub with direct access to coastal markets.',
  },
  {
    name: 'Bacong Coastal & Farm Corridor',
    barangay: 'Poblacion',
    city: 'Bacong',
    lat: 9.2457,
    lng: 123.2982,
    description: 'Southern town with mixed low-land crops and direct farmgates.',
  },
  {
    name: 'Dauin Organic & Foothill Farms',
    barangay: 'Poblacion',
    city: 'Dauin',
    lat: 9.1915,
    lng: 123.2687,
    description: 'Southern coastal agricultural basin with vegetable farms.',
  },
];

/**
 * High-accuracy spatial resolution for Negros Oriental coordinates
 */
export function resolveAddressFromCoords(lat: number, lng: number): string {
  // 1. Check exact closest landmark in Negros Oriental (within 350m)
  const closest = getClosestLandmark(lat, lng);
  const dist = calculateDistanceKm(lat, lng, closest.lat, closest.lng);

  if (dist < 0.35) {
    if (closest.name.includes(closest.barangay)) {
      return `${closest.name}, ${closest.city}, Negros Oriental`;
    }
    return `${closest.name}, ${closest.barangay}, ${closest.city}, Negros Oriental`;
  }

  // 2. Check Dumaguete Barangays by coordinate boundaries
  if (lat >= 9.260 && lat <= 9.345 && lng >= 123.250 && lng <= 123.320) {
    // Jasonville Subdv / Dumaguete-Balugo Road zone
    if (lat >= 9.301 && lat <= 9.305 && lng >= 123.283 && lng <= 123.287) {
      return `Jasonville Subdv, Barangay Junob, Dumaguete City, Negros Oriental`;
    }

    // Junob & Northern Junob
    if (lat >= 9.300 && lat <= 9.314 && lng >= 123.275 && lng <= 123.292) {
      if (lat >= 9.304 && lng <= 123.290) {
        return `Northern Junob, Barangay Junob, Dumaguete City, Negros Oriental`;
      }
      return `Barangay Junob, Dumaguete City, Negros Oriental`;
    }
    if (lat >= 9.304 && lat <= 9.314 && lng >= 123.288 && lng <= 123.296) {
      return `Barangay Batinguel, Dumaguete City, Negros Oriental`;
    }
    if (lat >= 9.293 && lat <= 9.303 && lng >= 123.285 && lng <= 123.298) {
      return `Barangay Bagacay, Dumaguete City, Negros Oriental`;
    }
    if (lat >= 9.300 && lat <= 9.308 && lng >= 123.295 && lng <= 123.305) {
      return `Barangay Taclobo, Dumaguete City, Negros Oriental`;
    }
    if (lat >= 9.310 && lat <= 9.322 && lng >= 123.290 && lng <= 123.303) {
      return `Barangay Daro, Dumaguete City, Negros Oriental`;
    }
    if (lat >= 9.318 && lat <= 9.328 && lng >= 123.302 && lng <= 123.315) {
      return `Barangay Piapi, Dumaguete City, Negros Oriental`;
    }
    if (lat >= 9.325 && lat <= 9.340 && lng >= 123.295 && lng <= 123.310) {
      return `Barangay Bantayan, Dumaguete City, Negros Oriental`;
    }
    if (lat >= 9.312 && lat <= 9.325 && lng >= 123.265 && lng <= 123.280) {
      return `Barangay Cadawinonan, Dumaguete City, Negros Oriental`;
    }
    if (lat >= 9.305 && lat <= 9.318 && lng >= 123.255 && lng <= 123.272) {
      return `Barangay Candau-ay, Dumaguete City, Negros Oriental`;
    }
    if (lat >= 9.325 && lat <= 9.345 && lng >= 123.270 && lng <= 123.292) {
      return `Barangay Camanjac, Dumaguete City, Negros Oriental`;
    }
    if (lat >= 9.285 && lat <= 9.300 && lng >= 123.260 && lng <= 123.280) {
      return `Barangay Cantil-e, Dumaguete City, Negros Oriental`;
    }
    if (lat >= 9.275 && lat <= 9.290 && lng >= 123.275 && lng <= 123.292) {
      return `Barangay Bajumpandan, Dumaguete City, Negros Oriental`;
    }
    if (lat >= 9.265 && lat <= 9.280 && lng >= 123.285 && lng <= 123.305) {
      return `Barangay Banilad, Dumaguete City, Negros Oriental`;
    }
    if (lat >= 9.285 && lat <= 9.298 && lng >= 123.298 && lng <= 123.310) {
      return `Barangay Calindagan, Dumaguete City, Negros Oriental`;
    }
    if (lat >= 9.303 && lat <= 9.315 && lng >= 123.303 && lng <= 123.315) {
      return `Poblacion, Dumaguete City, Negros Oriental`;
    }
    return `Barangay Junob, Dumaguete City, Negros Oriental`;
  }

  // Valencia
  if (lat >= 9.260 && lat <= 9.320 && lng >= 123.190 && lng <= 123.260) {
    if (lat >= 9.280 && lat <= 9.290 && lng >= 123.230 && lng <= 123.245) {
      return `Barangay Apolong, Valencia, Negros Oriental`;
    }
    if (lat >= 9.270 && lat <= 9.285 && lng >= 123.230 && lng <= 123.245) {
      return `Barangay Malabo, Valencia, Negros Oriental`;
    }
    if (lat >= 9.280 && lat <= 9.295 && lng >= 123.245 && lng <= 123.260) {
      return `Barangay Bong-ao, Valencia, Negros Oriental`;
    }
    return `Poblacion, Valencia, Negros Oriental`;
  }

  // Sibulan
  if (lat >= 9.340 && lat <= 9.400 && lng >= 123.240 && lng <= 123.310) {
    if (lat >= 9.340 && lat <= 9.355 && lng >= 123.285 && lng <= 123.305) {
      return `Barangay Maslog, Sibulan, Negros Oriental`;
    }
    return `Sibulan, Negros Oriental`;
  }

  // Bacong
  if (lat >= 9.220 && lat <= 9.260 && lng >= 123.260 && lng <= 123.310) {
    return `Bacong, Negros Oriental`;
  }

  // Dauin
  if (lat >= 9.160 && lat <= 9.220 && lng >= 123.240 && lng <= 123.300) {
    return `Dauin, Negros Oriental`;
  }

  return `${closest.barangay}, ${closest.city}, Negros Oriental`;
}

/**
 * Resolves exact coordinates for any given location text or coordinates.
 * Priority: Valid numeric GPS coords > Specific landmark/barangay name > Municipality name
 */
export function resolveCoordinates(
  locationText?: string,
  lat?: number,
  lng?: number
): Coordinates {
  // If valid GPS coordinates are already provided, strictly use them
  if (
    lat !== undefined &&
    lng !== undefined &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= 8.0 &&
    lat <= 12.0 &&
    lng >= 121.0 &&
    lng <= 125.0
  ) {
    return { lat, lng };
  }

  if (!locationText || typeof locationText !== 'string') {
    return { ...DUMAGUETE_DEFAULT_COORDS };
  }

  const clean = locationText.toLowerCase().trim();

  // 1. Sort known locations by key length descending so specific locations
  // like 'jasonville subdv' (16 chars) or 'northern junob' (14 chars) match before 'dumaguete' (9 chars)
  const sortedKeys = Object.keys(NEGROS_ORIENTAL_LOCATIONS).sort(
    (a, b) => b.length - a.length
  );

  for (const key of sortedKeys) {
    if (clean.includes(key)) {
      return { ...NEGROS_ORIENTAL_LOCATIONS[key] };
    }
  }

  // 2. Check popular landmarks
  for (const landmark of POPULAR_LANDMARKS) {
    if (
      clean.includes(landmark.name.toLowerCase()) ||
      clean.includes(landmark.barangay.toLowerCase())
    ) {
      return { lat: landmark.lat, lng: landmark.lng };
    }
  }

  return { ...DUMAGUETE_DEFAULT_COORDS };
}

/**
 * Calculates accurate geodesic distance between two GPS coordinates in kilometers using Haversine formula
 */
export function calculateDistanceKm(
  lat1?: number,
  lon1?: number,
  lat2?: number,
  lon2?: number,
  defaultDistance = 3.5
): number {
  if (
    lat1 === undefined ||
    lon1 === undefined ||
    lat2 === undefined ||
    lon2 === undefined ||
    isNaN(lat1) ||
    isNaN(lon1) ||
    isNaN(lat2) ||
    isNaN(lon2)
  ) {
    return defaultDistance;
  }

  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const rawDist = R * c;

  if (rawDist < 0.05) {
    return 0.1;
  }

  return Math.round(rawDist * 10) / 10;
}

/**
 * Calculates dynamic distance between two location entities accurately
 */
export function calculateDistanceBetween(
  origin: { lat?: number; lng?: number; location?: string },
  destination: { lat?: number; lng?: number; location?: string }
): number {
  const coordA = resolveCoordinates(origin.location, origin.lat, origin.lng);
  const coordB = resolveCoordinates(destination.location, destination.lat, destination.lng);

  return calculateDistanceKm(coordA.lat, coordA.lng, coordB.lat, coordB.lng);
}

/**
 * Find closest landmark for a given coordinate
 */
export function getClosestLandmark(lat: number, lng: number): LandmarkLocation {
  let closest = POPULAR_LANDMARKS[0];
  let minDistance = Infinity;

  for (const landmark of POPULAR_LANDMARKS) {
    const dist = calculateDistanceKm(lat, lng, landmark.lat, landmark.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closest = landmark;
    }
  }

  return closest;
}
