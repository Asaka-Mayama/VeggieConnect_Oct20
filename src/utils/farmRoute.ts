import { useEffect, useState } from 'react';
import { Coordinates, DUMAGUETE_DEFAULT_COORDS, resolveCoordinates } from './geoDistance';
import { ProduceItem, UserProfile } from '../types';

// ---------------------------------------------------------------------------
// Supermarket hub (origin of every "route to the farmer's house" map).
// The admin pins this from Admin > Profile tab.
// ---------------------------------------------------------------------------
export const SUPERMARKET_STORAGE_KEY = 'veggieconnect_v9_clean_supermarket';
export const ADMIN_HUB_STORAGE_KEY = 'veggieconnect_v9_clean_admin_hub';

export interface SupermarketLocation {
  storeName: string;
  address: string;
  latitude: number;
  longitude: number;
  /** Epoch ms of the admin's latest Save — lets devices detect stale copies. */
  savedAt?: number;
}

export interface AdminLocationProfile {
  address?: string;
  latitude?: number;
  longitude?: number;
}

export const DEFAULT_SUPERMARKET: SupermarketLocation = {
  storeName: 'VeggieConnect Central Supermarket Hub',
  address: 'Rizal Boulevard & Port Area, Dumaguete City Proper, Negros Oriental',
  latitude: 9.3080,
  longitude: 123.3105,
};

/** Default western agricultural foothill coordinates for farms in Negros Oriental (Left side of map) */
export const DEFAULT_FARM_COORDINATES: Coordinates = {
  lat: 9.2842,
  lng: 123.2380, // Apolong / Valencia Highland Agricultural Valley (Mount Talinis foothills)
};

/**
 * Loads the saved supermarket location, merged on top of `seed`
 * (usually the admin account's own address/GPS pin).
 */
export function resolveSupermarketLocation(seed?: Partial<SupermarketLocation>): SupermarketLocation {
  const base: SupermarketLocation = { ...DEFAULT_SUPERMARKET, ...seed };
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return base;
  try {
    const saved = localStorage.getItem(SUPERMARKET_STORAGE_KEY);
    if (saved) {
      return { ...base, ...(JSON.parse(saved) as Partial<SupermarketLocation>) };
    }
  } catch (e) {
    console.error('Failed to parse saved supermarket location', e);
  }
  return base;
}

export function loadSupermarketLocation(): SupermarketLocation {
  return resolveSupermarketLocation();
}

/**
 * Forces a re-render whenever the admin saves a live-route location, either in
 * this tab or through a cross-tab localStorage update.
 */
export function useAdminLocationSyncTick(): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setTick((current) => current + 1);

    window.addEventListener('veggieconnect:admin-location-updated', handleUpdate);
    return () => {
      window.removeEventListener('veggieconnect:admin-location-updated', handleUpdate);
    };
  }, []);

  return tick;
}

/**
 * Finds the signed-in admin's location data for live-route fallback resolution.
 * Farmers do not have an admin currentUser, so this checks the shared registry
 * first and then the persisted current-user record.
 */
export function getAdminProfileForLocationFallback(
  currentUser?: UserProfile | null,
  registeredUsers: UserProfile[] = []
): AdminLocationProfile | null {
  if (currentUser && currentUser.role === 'admin') {
    return {
      address: currentUser.location,
      ...(typeof currentUser.latitude === 'number'
        ? { latitude: currentUser.latitude }
        : {}),
      ...(typeof currentUser.longitude === 'number'
        ? { longitude: currentUser.longitude }
        : {}),
    };
  }

  // IMPORTANT: never fall back to the farmer's own currentUser. A farmer's
  // profile can contain a newer, resolved GPS pin that would otherwise make the
  // admin marker appear on the farm itself.
  const adminCandidates = registeredUsers.filter(
    (user) =>
      user.role === 'admin' &&
      (user.id === 'admin-main' || user.email?.trim().toLowerCase() === 'admin@gmail.com')
  );

  for (const registeredAdmin of adminCandidates) {
    const profile = toAdminLocationProfile(
      registeredAdmin.location,
      registeredAdmin.latitude,
      registeredAdmin.longitude
    );
    if (profile) return profile;
  }

  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const savedUser = localStorage.getItem('veggieconnect_v9_clean_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser) as UserProfile | null;
        if (parsed && parsed.role === 'admin') {
          const profile = toAdminLocationProfile(parsed.location, parsed.latitude, parsed.longitude);
          if (profile) return profile;
        }
      }
    } catch (err) {
      console.error('Failed to read saved admin location', err);
    }
  }

  // Last resort: the admin hub record stored separately from the signed-in
  // farmer session. It must never be interpreted as a farmer pin.
  return loadPersistedAdminHubProfile();
}

function toAdminLocationProfile(
  address?: string,
  latitude?: number,
  longitude?: number
): AdminLocationProfile | null {
  if (!address && typeof latitude !== 'number' && typeof longitude !== 'number') return null;
  return {
    ...(address ? { address } : {}),
    ...(typeof latitude === 'number' ? { latitude } : {}),
    ...(typeof longitude === 'number' ? { longitude } : {}),
  };
}

function loadPersistedAdminHubProfile(): AdminLocationProfile | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ADMIN_HUB_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminLocationProfile | null;
    if (!parsed) return null;
    return toAdminLocationProfile(parsed.address, parsed.latitude, parsed.longitude);
  } catch (err) {
    console.error('Failed to read persisted admin hub location', err);
    return null;
  }
}

function savePersistedAdminHubProfile(profile: AdminLocationProfile): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    const normalized = toAdminLocationProfile(
      profile.address,
      profile.latitude,
      profile.longitude
    );
    if (normalized) {
      localStorage.setItem(ADMIN_HUB_STORAGE_KEY, JSON.stringify(normalized));
    }
  } catch (err) {
    console.error('Failed to persist admin hub location', err);
  }
}

/**
 * Raw record the admin saved from Admin > Profile — `null` when no explicit
 * save exists yet (the resolver then falls back to account/default coords).
 */
function loadSavedSupermarketRecord(): Partial<SupermarketLocation> | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SUPERMARKET_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SupermarketLocation> | null;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (e) {
    console.error('Failed to parse saved supermarket location', e);
    return null;
  }
}

/**
 * Numeric pair check for an explicitly saved pin. Deliberately applies NO
 * region heuristics — what the admin saved is what shows on the map.
 */
function toExplicitPin(
  record?: { latitude?: number; longitude?: number } | null
): Coordinates | null {
  if (
    record &&
    typeof record.latitude === 'number' &&
    typeof record.longitude === 'number' &&
    !isNaN(record.latitude) &&
    !isNaN(record.longitude)
  ) {
    return { lat: record.latitude, lng: record.longitude };
  }
  return null;
}

/**
 * Resolves the admin/supermarket endpoint shown on farmer live-transaction maps.
 *
 * Priority: an explicit pin saved from Admin > Profile (returned verbatim — it
 * represents the store/admin logistics origin) → the dedicated admin-hub record
 * → GPS attached to the admin account → the default Dumaguete hub. The
 * "generic Dumaguete centre" heuristic only guards AUTO-derived fallback
 * coordinates so placeholder geocodes never masquerade as a deliberate pin —
 * it must never reject the admin's own save, or the marker snaps back to an
 * older location the moment Save is pressed.
 */
export function resolveLiveTransactionAdminLocation(
  registeredUsers: UserProfile[] = [],
  adminProfile?: AdminLocationProfile | null
): SupermarketLocation {
  const isGenericDumagueteCenter = (lat?: number, lng?: number) => {
    if (typeof lat !== 'number' || typeof lng !== 'number') return true;
    return Math.abs(lat - 9.3068) < 0.002 && Math.abs(lng - 123.3054) < 0.002;
  };

  const sanitizeAdminAddress = (addr?: string): string => {
    if (!addr || !addr.trim()) return DEFAULT_SUPERMARKET.address;
    const lower = addr.trim().toLowerCase();
    if (
      lower === 'dumaguete city' ||
      lower === 'dumaguete city, negros oriental' ||
      lower === 'dumaguete' ||
      lower === 'dgte' ||
      lower === 'dumaguete city proper'
    ) {
      return DEFAULT_SUPERMARKET.address;
    }
    return addr.trim();
  };

  const savedSupermarket = resolveSupermarketLocation();
  const savedPin = toExplicitPin(loadSavedSupermarketRecord());

  // 1. A pin explicitly saved from Admin > Profile is ALWAYS authoritative.
  //    The heuristics further down exist only to guard AUTO-derived fallback
  //    coordinates; applying them to the admin's own deliberate save made the
  //    marker snap back to an older location right after Save (whenever the
  //    new pin landed on the generic Dumaguete-centre placeholder, matched
  //    the default hub exactly, or fell outside the province bounds).
  if (savedPin) {
    // Keep the dedicated hub record in sync — legacy installs only carry the
    // supermarket key, and farmer live-route maps read the hub record as
    // their fallback source.
    const hubRecord = loadPersistedAdminHubProfile();
    const hubPin = toExplicitPin(hubRecord);
    if (
      !hubPin ||
      hubPin.lat !== savedPin.lat ||
      hubPin.lng !== savedPin.lng ||
      (hubRecord?.address || '') !== (savedSupermarket.address || '')
    ) {
      savePersistedAdminHubProfile({
        address: savedSupermarket.address,
        latitude: savedPin.lat,
        longitude: savedPin.lng,
      });
    }
    return {
      storeName: savedSupermarket.storeName || DEFAULT_SUPERMARKET.storeName,
      address: savedSupermarket.address || DEFAULT_SUPERMARKET.address,
      latitude: savedPin.lat,
      longitude: savedPin.lng,
    };
  }

  // 2. A dedicated hub record written by an earlier save (supermarket key
  //    missing) is still an explicit pin and outranks account fallbacks.
  const persistedHub = loadPersistedAdminHubProfile();
  const persistedHubPin = toExplicitPin(persistedHub);
  if (persistedHubPin) {
    return {
      storeName: savedSupermarket.storeName || DEFAULT_SUPERMARKET.storeName,
      address: persistedHub?.address || savedSupermarket.address || DEFAULT_SUPERMARKET.address,
      latitude: persistedHubPin.lat,
      longitude: persistedHubPin.lng,
    };
  }

  // 3. Check explicit admin GPS pin from registered admin profile
  const adminAccount = adminProfile || getAdminProfileForLocationFallback(null, registeredUsers);
  if (adminAccount) {
    const adminPin = toGpsPin(adminAccount.latitude, adminAccount.longitude);
    if (
      adminPin &&
      !isGenericDumagueteCenter(adminPin.lat, adminPin.lng)
    ) {
      return {
        storeName: DEFAULT_SUPERMARKET.storeName,
        address: sanitizeAdminAddress(adminAccount.address || savedSupermarket.address),
        latitude: adminPin.lat,
        longitude: adminPin.lng,
      };
    }
  }

  // The authoritative Supermarket Hub is at Rizal Boulevard & Port Area, Dumaguete City Proper
  // on the eastern waterfront (right side of the map/image, lng 123.3105).
  return DEFAULT_SUPERMARKET;
}

// Origin point of the live route map
export function getSupermarketHubCoords(registeredUsers?: UserProfile[]): Coordinates {
  const hub = resolveLiveTransactionAdminLocation(registeredUsers);
  return { lat: hub.latitude, lng: hub.longitude };
}

// ---------------------------------------------------------------------------
// Farmer house coordinate resolution
// ---------------------------------------------------------------------------
export interface FarmHouseLookup {
  /**
   * Direct GPS pin (highest priority). Pass only when it belongs to THIS
   * transaction — never seed it with the viewer's unrelated account coordinates.
   */
  latitude?: number;
  longitude?: number;
  farmerId?: string;
  farmName?: string;
  farmerName?: string;
  /** Textual pickup / farm address used as the last resort. */
  locationText?: string;
  registeredUsers?: UserProfile[];
  produceList?: ProduceItem[];
  /**
   * Optional item-level identities for orders containing produce from multiple
   * farmers. These are checked before the order-level farmer identity so the
   * route points at the actual farm supplying this transaction.
   */
  itemFarmerId?: string;
  itemFarmerName?: string;
  itemFarmName?: string;
}

export interface FarmHouse {
  coords: Coordinates;
  label: string;
  address: string;
  source: 'pin' | 'account' | 'produce' | 'location';
}

/** Returns GPS coordinates only when the pair is inside Negros Oriental bounds. */
function toGpsPin(lat?: number, lng?: number): Coordinates | null {
  if (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= 8.0 &&
    lat <= 12.0 &&
    lng >= 121.0 &&
    lng <= 125.0
  ) {
    return { lat, lng };
  }
  return null;
}

/**
 * Resolves the GPS coordinates of the farmer's house for a live transaction.
 * Priority: explicit pin > registered farmer account > produce listing > text address.
 */
export function resolveFarmHouseCoordinates(lookup: FarmHouseLookup): FarmHouse {
  const {
    latitude,
    longitude,
    farmerId,
    farmName,
    farmerName,
    locationText,
    registeredUsers = [],
    produceList = [],
    itemFarmerId,
    itemFarmerName,
    itemFarmName,
  } = lookup;

  // The supplying item identifies the farm more precisely than order-level
  // metadata, which can be absent or belong to a different party.
  const effectiveFarmerId = itemFarmerId || farmerId;
  const effectiveFarmName = itemFarmName || farmName;
  const effectiveFarmerName = itemFarmerName || farmerName;

  const normalizedFarm = effectiveFarmName?.trim().toLowerCase();
  const normalizedFarmer = effectiveFarmerName?.trim().toLowerCase();

  const isGenericDumagueteOrDowntown = (lat?: number, lng?: number) => {
    if (typeof lat !== 'number' || typeof lng !== 'number') return true;
    if (lng >= 123.2850) return true;
    return Math.abs(lat - 9.3068) < 0.002 && Math.abs(lng - 123.3054) < 0.002;
  };

  const sanitizeFarmAddress = (addr?: string): string => {
    if (!addr || !addr.trim()) return 'Valencia Highland Agricultural Valley, Negros Oriental';
    const lower = addr.trim().toLowerCase();
    if (
      lower === 'dumaguete city' ||
      lower === 'dumaguete city, negros oriental' ||
      lower === 'dumaguete' ||
      lower === 'dgte' ||
      lower === 'dumaguete city proper'
    ) {
      return 'Valencia Highland Agricultural Valley, Negros Oriental';
    }
    return addr.trim();
  };

  // Helper to ensure the farm coordinates remain on the Western agricultural foothills (Left side of map)
  const sanitizeFarmCoordinates = (pin?: Coordinates | null): Coordinates => {
    if (!pin) return DEFAULT_FARM_COORDINATES;
    // In Negros Oriental, agricultural farms are situated in the western valleys (Mount Talinis / Valencia / Apolong).
    // If the pin is >= 123.2850 (downtown Dumaguete or coast) or center fallback, anchor the farm to the western agricultural valley.
    if (isGenericDumagueteOrDowntown(pin.lat, pin.lng)) {
      return DEFAULT_FARM_COORDINATES;
    }
    return pin;
  };

  // 1. Exact GPS pin handed in by the caller
  const requestedPin = toGpsPin(latitude, longitude);
  if (requestedPin && !isGenericDumagueteOrDowntown(requestedPin.lat, requestedPin.lng)) {
    return {
      coords: sanitizeFarmCoordinates(requestedPin),
      label: effectiveFarmName || effectiveFarmerName || 'Farmer House',
      address: sanitizeFarmAddress(locationText),
      source: 'pin',
    };
  }

  // 2. Registered farmer account (its pinned house / farm location)
  const account = registeredUsers.find(
    (u) =>
      (effectiveFarmerId && u.id === effectiveFarmerId) ||
      (normalizedFarm && u.farmName && u.farmName.trim().toLowerCase() === normalizedFarm) ||
      (normalizedFarmer && u.name && u.name.trim().toLowerCase() === normalizedFarmer)
  );
  const accountPin = account ? toGpsPin(account.latitude, account.longitude) : null;
  if (account && accountPin && !isGenericDumagueteOrDowntown(accountPin.lat, accountPin.lng)) {
    return {
      coords: sanitizeFarmCoordinates(accountPin),
      label: account.farmName || account.name || effectiveFarmName || 'Farmer House',
      address: sanitizeFarmAddress(account.location),
      source: 'account',
    };
  }

  // 3. Produce listing carried its own farm GPS pin
  const produce = produceList.find(
    (p) =>
      (effectiveFarmerId && p.farmerId === effectiveFarmerId) ||
      (normalizedFarm && p.farmName && p.farmName.trim().toLowerCase() === normalizedFarm) ||
      (normalizedFarmer && p.farmerName && p.farmerName.trim().toLowerCase() === normalizedFarmer)
  );
  const producePin = produce ? toGpsPin(produce.latitude, produce.longitude) : null;
  if (produce && producePin && !isGenericDumagueteOrDowntown(producePin.lat, producePin.lng)) {
    return {
      coords: sanitizeFarmCoordinates(producePin),
      label: produce.farmName || effectiveFarmName || 'Farmer House',
      address: sanitizeFarmAddress(produce.location),
      source: 'produce',
    };
  }

  // 4. Last resort: geocode the textual address (default to western farm valley if blank or centered downtown)
  const rawAddress = locationText || account?.location || produce?.location || '';
  const address = sanitizeFarmAddress(rawAddress);
  let resolvedCoords = resolveCoordinates(address);
  if (!address || isGenericDumagueteOrDowntown(resolvedCoords.lat, resolvedCoords.lng)) {
    resolvedCoords = DEFAULT_FARM_COORDINATES;
  }
  return {
    coords: resolvedCoords,
    label: effectiveFarmName || effectiveFarmerName || account?.farmName || produce?.farmName || 'Farmer House',
    address: address,
    source: 'location',
  };
}
