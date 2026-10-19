/**
 * Regression check for Admin > Profile → "Save Supermarket Location".
 *
 * Asserts that a pin saved from the admin profile is returned verbatim by
 * resolveLiveTransactionAdminLocation — the marker must never snap back to an
 * older location or the default hub right after Save — while AUTO-derived
 * fallback coordinates keep their heuristic guards.
 *
 * Run from the project root:
 *   node_modules\.bin\tsx.cmd verify_supermarket_location.ts
 * Exit code 0 = all cases pass.
 */

const store = new Map<string, string>();

// Minimal browser globals so farmRoute.ts can read/write localStorage.
(globalThis as unknown as { window: unknown }).window = globalThis;
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
  setItem: (k: string, v: string) => {
    store.set(k, v);
  },
  removeItem: (k: string) => {
    store.delete(k);
  },
};

interface Resolved {
  storeName: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface TestCase {
  name: string;
  seed?: { supermarket?: object; hub?: object };
  adminProfile?: { address?: string; latitude?: number; longitude?: number } | null;
  expect: (r: Resolved) => string | null;
}

// Deliberately inside the "generic Dumaguete center" box checked by the old
// heuristics (9.3068 ± 0.002, 123.3054 ± 0.002).
const DOWNTOWN_SAVE = {
  storeName: 'Negros Fresh Mart',
  address: 'Perdices St, Dumaguete City',
  latitude: 9.3070,
  longitude: 123.3050,
};
// Clearly outside the generic box — must keep working in every case.
const VALENCIA_SAVE = {
  storeName: 'Highland Store',
  address: 'Valencia, Negros Oriental',
  latitude: 9.3300,
  longitude: 123.2500,
};
// The admin account's older, previously saved pin ("past location").
const OLD_ACCOUNT_PIN = { address: 'Old DA Office', latitude: 9.3150, longitude: 123.2900 };
const DEFAULT_PIN = { latitude: 9.3080, longitude: 123.3105 };

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

const cases: TestCase[] = [
  {
    name: 'REPRO: saved pin inside generic Dumaguete-center box must NOT revert to the old account pin',
    seed: { supermarket: DOWNTOWN_SAVE, hub: DOWNTOWN_SAVE },
    adminProfile: OLD_ACCOUNT_PIN,
    expect: (r) =>
      near(r.latitude, DOWNTOWN_SAVE.latitude) && near(r.longitude, DOWNTOWN_SAVE.longitude)
        ? null
        : `reverted to ${r.latitude},${r.longitude} (expected 9.3070,123.3050)`,
  },
  {
    name: 'Saved pin keeps its custom store name + address (verbatim)',
    seed: { supermarket: DOWNTOWN_SAVE, hub: DOWNTOWN_SAVE },
    adminProfile: OLD_ACCOUNT_PIN,
    expect: (r) =>
      r.storeName === DOWNTOWN_SAVE.storeName && r.address === DOWNTOWN_SAVE.address
        ? null
        : `storeName="${r.storeName}" address="${r.address}" were rewritten`,
  },
  {
    name: 'Ordinary save (Valencia) still wins over the old account pin',
    seed: { supermarket: VALENCIA_SAVE, hub: VALENCIA_SAVE },
    adminProfile: OLD_ACCOUNT_PIN,
    expect: (r) =>
      near(r.latitude, VALENCIA_SAVE.latitude) && near(r.longitude, VALENCIA_SAVE.longitude)
        ? null
        : `got ${r.latitude},${r.longitude}`,
  },
  {
    name: 'Save pinned exactly on default coords keeps custom store name',
    seed: {
      supermarket: { storeName: 'Branch 2', address: 'Silliman St, Dumaguete', ...DEFAULT_PIN },
      hub: { address: 'Silliman St, Dumaguete', ...DEFAULT_PIN },
    },
    adminProfile: OLD_ACCOUNT_PIN,
    expect: (r) => (r.storeName === 'Branch 2' ? null : `storeName reverted to "${r.storeName}"`),
  },
  {
    name: 'Legacy: supermarket key only (no hub record) is honoured and backfills the hub',
    seed: { supermarket: VALENCIA_SAVE },
    adminProfile: OLD_ACCOUNT_PIN,
    expect: (r) => {
      if (!near(r.latitude, VALENCIA_SAVE.latitude)) return `got ${r.latitude},${r.longitude}`;
      if (!store.has('veggieconnect_v9_clean_admin_hub')) return 'hub record was not backfilled';
      return null;
    },
  },
  {
    name: 'Regression: never saved → falls back to the admin account pin',
    seed: undefined,
    adminProfile: OLD_ACCOUNT_PIN,
    expect: (r) =>
      near(r.latitude, OLD_ACCOUNT_PIN.latitude) && near(r.longitude, OLD_ACCOUNT_PIN.longitude)
        ? null
        : `got ${r.latitude},${r.longitude}`,
  },
  {
    name: 'Regression: never saved + auto-derived generic-center account pin → default hub',
    seed: undefined,
    adminProfile: { latitude: 9.3068, longitude: 123.3054 },
    expect: (r) =>
      near(r.latitude, DEFAULT_PIN.latitude) && near(r.longitude, DEFAULT_PIN.longitude)
        ? null
        : `got ${r.latitude},${r.longitude}`,
  },
  {
    name: 'Regression: no records at all → default hub',
    seed: undefined,
    adminProfile: null,
    expect: (r) =>
      near(r.latitude, DEFAULT_PIN.latitude) && near(r.longitude, DEFAULT_PIN.longitude)
        ? null
        : `got ${r.latitude},${r.longitude}`,
  },
];

async function main() {
  const { resolveLiveTransactionAdminLocation, SUPERMARKET_STORAGE_KEY, ADMIN_HUB_STORAGE_KEY } =
    await import('./src/utils/farmRoute');

  let failures = 0;
  for (const testCase of cases) {
    store.clear();
    if (testCase.seed?.supermarket) {
      store.set(SUPERMARKET_STORAGE_KEY, JSON.stringify(testCase.seed.supermarket));
    }
    if (testCase.seed?.hub) {
      store.set(ADMIN_HUB_STORAGE_KEY, JSON.stringify(testCase.seed.hub));
    }
    const result = resolveLiveTransactionAdminLocation([], testCase.adminProfile) as Resolved;
    const error = testCase.expect(result);
    if (error) {
      failures++;
      console.log(`FAIL  ${testCase.name}\n      → ${error}`);
    } else {
      console.log(`PASS  ${testCase.name}`);
    }
  }
  console.log(`\n${cases.length - failures}/${cases.length} passed`);
  if (failures > 0) process.exitCode = 1;
}

main();
