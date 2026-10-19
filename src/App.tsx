import React, { useState, useEffect, useMemo } from 'react';
import { MobileFrame } from './components/MobileFrame';
import { Header } from './components/Header';
import { BuyerMarketView } from './components/BuyerMarketView';
import { FarmDirectoryView } from './components/FarmDirectoryView';
import { CartDrawer } from './components/CartDrawer';
import { OrdersView } from './components/OrdersView';
import { FarmerDashboardView } from './components/FarmerDashboardView';
import { ProduceDetailModal } from './components/ProduceDetailModal';
import { AddProduceModal } from './components/AddProduceModal';
import { DirectChatModal, ChatContact } from './components/DirectChatModal';
import { FarmProfileModal } from './components/FarmProfileModal';
import { LoginRegisterView } from './components/LoginRegisterView';
import { EditProfileModal } from './components/EditProfileModal';
import { AdminApp } from './components/AdminApp';
import { ProfileMenuView } from './components/ProfileMenuView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DAPriceWatchModal } from './components/DAPriceWatchModal';
import { AddressMapPickerModal } from './components/AddressMapPickerModal';
import { SystemGuidePage } from './components/SystemGuidePage';
import { calculateDistanceKm, calculateDistanceBetween, resolveCoordinates } from './utils/geoDistance';
import { SUPERMARKET_STORAGE_KEY, ADMIN_HUB_STORAGE_KEY } from './utils/farmRoute';
import { appSync } from './utils/appSync';
import { INITIAL_PRODUCE, INITIAL_FARMERS, INITIAL_ORDERS, INITIAL_TRANSPORT_JOBS } from './data/mockData';
import { ProduceItem, FarmerProfile, CartItem, Order, DirectMessage, UserRole, OrderStatus, TransportJob, UserProfile } from './types';
import { CheckCircle, AlertCircle, Sprout, MapPin, X } from 'lucide-react';

const STORAGE_KEYS = {
  PRODUCE: 'veggieconnect_v9_clean_produce',
  CART: 'veggieconnect_v9_clean_cart',
  ORDERS: 'veggieconnect_v9_clean_orders',
  MESSAGES: 'veggieconnect_v9_clean_messages',
  ROLE: 'veggieconnect_v9_clean_role',
  USER: 'veggieconnect_v9_clean_user',
  JOBS: 'veggieconnect_v9_clean_jobs',
  USERS: 'veggieconnect_registered_users_v9',
};

/** Reads the persisted account registry (used to recover saved GPS pins). */
function readCachedUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed.filter((u: any) => u && u.id) : [];
  } catch (e) {
    return [];
  }
}

/**
 * The backend can hand back users without GPS pins (legacy MySQL rows created
 * before latitude/longitude columns existed). Never let that wipe a location
 * the user already saved: reuse the previously known pin first and only
 * geocode the text address as a last resort. This keeps every profile's
 * location stable across app/browser restarts.
 */
function enrichUsersWithKnownPins(
  remoteUsers: UserProfile[],
  knownUsers: UserProfile[] = []
): UserProfile[] {
  const knownById = new Map<string, UserProfile>();
  // Live state wins over the cached registry (it is fresher).
  [...knownUsers, ...readCachedUsers()].forEach((u) => {
    if (u && u.id && !knownById.has(u.id)) knownById.set(u.id, u);
  });
  return remoteUsers.map((u) => {
    if (!u) return u;
    if (typeof u.latitude === 'number' && typeof u.longitude === 'number') return u;
    const known = knownById.get(u.id);
    if (
      known &&
      typeof known.latitude === 'number' &&
      typeof known.longitude === 'number'
    ) {
      return { ...u, latitude: known.latitude, longitude: known.longitude };
    }
    const c = resolveCoordinates(u.location, u.latitude, u.longitude);
    return { ...u, latitude: c.lat, longitude: c.lng };
  });
}

/**
 * Mirrors the admin's published supermarket-hub pin from the backend into this
 * browser. The admin's saved pin used to live ONLY in the admin's own browser,
 * so every other device resolved the live-transaction admin marker from stale
 * fallbacks (usually the default hub). `savedAt` timestamps ensure an older
 * backend copy never overwrites a newer local save.
 */
async function syncSupermarketFromBackend(): Promise<void> {
  try {
    const res = await fetch('/api/supermarket');
    if (!res.ok) return;
    const remote = await res.json();
    if (
      !remote ||
      typeof remote.latitude !== 'number' ||
      typeof remote.longitude !== 'number' ||
      isNaN(remote.latitude) ||
      isNaN(remote.longitude)
    ) {
      return;
    }
    let local: any = null;
    try {
      const raw = localStorage.getItem(SUPERMARKET_STORAGE_KEY);
      local = raw ? JSON.parse(raw) : null;
    } catch (e) {}
    const localSavedAt = local && typeof local.savedAt === 'number' ? local.savedAt : 0;
    const remoteSavedAt = typeof remote.savedAt === 'number' ? remote.savedAt : 0;
    if (local && remoteSavedAt <= localSavedAt) return; // local copy is current or newer
    const record = {
      storeName: remote.storeName || 'VeggieConnect Central Supermarket Hub',
      address: remote.address || '',
      latitude: remote.latitude,
      longitude: remote.longitude,
      savedAt: remoteSavedAt,
    };
    localStorage.setItem(SUPERMARKET_STORAGE_KEY, JSON.stringify(record));
    localStorage.setItem(
      ADMIN_HUB_STORAGE_KEY,
      JSON.stringify({
        address: record.address,
        latitude: record.latitude,
        longitude: record.longitude,
      })
    );
    window.dispatchEvent(
      new CustomEvent('veggieconnect:admin-location-updated', {
        detail: { latitude: record.latitude, longitude: record.longitude },
      })
    );
  } catch (e) {
    // Backend unavailable — keep whatever local pin exists.
  }
}

export default function App() {
  // Current logged in user (null by default so app opens in login form)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USER);
    if (saved) {
      try {
        const u = JSON.parse(saved);
        // The transporter role no longer exists - ignore any old saved transporter session.
        if (u && (u.role as string) === 'transporter') return null;
        if (u && (!u.latitude || !u.longitude)) {
          // Recover the last saved pin before geocoding the text address so a
          // reloaded session never rewrites the profile location.
          const known = readCachedUsers().find((k) => k.id === u.id);
          if (
            known &&
            typeof known.latitude === 'number' &&
            typeof known.longitude === 'number'
          ) {
            return { ...u, latitude: known.latitude, longitude: known.longitude };
          }
          const c = resolveCoordinates(u.location, u.latitude, u.longitude);
          return { ...u, latitude: c.lat, longitude: c.lng };
        }
        return u;
      } catch (e) {
        console.error('Failed to parse user', e);
      }
    }
    return null;
  });

  // Route detection: Admin App is accessible at /admin and /sql
  const checkIsAdminRoute = (): boolean => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname.toLowerCase();
    const searchParams = new URLSearchParams(window.location.search);
    return (
      path === '/admin' ||
      path === '/admin/' ||
      path.startsWith('/admin/') ||
      path === '/sql' ||
      path.startsWith('/sql/') ||
      searchParams.get('app') === 'admin' ||
      searchParams.get('admin') !== null
    );
  };

  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => checkIsAdminRoute());

  // Route detection: public Project Guide page at /system
  const checkIsSystemRoute = (): boolean => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname.toLowerCase();
    return path === '/system' || path === '/system/';
  };

  const [isSystemRoute, setIsSystemRoute] = useState<boolean>(() => checkIsSystemRoute());

  // Determine admin subpath: 'admin' or 'sql'
  const getAdminPath = (): 'admin' | 'sql' => {
    if (typeof window === 'undefined') return 'admin';
    const path = window.location.pathname.toLowerCase();
    return path === '/sql' || path.startsWith('/sql/') ? 'sql' : 'admin';
  };

  const [adminPath, setAdminPath] = useState<'admin' | 'sql'>(() => getAdminPath());

  useEffect(() => {
    const handleLocationChange = () => {
      setIsAdminRoute(checkIsAdminRoute());
      setAdminPath(getAdminPath());
      setIsSystemRoute(checkIsSystemRoute());
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const handleNavigateToMain = () => {
    try {
      window.history.pushState({}, '', '/');
      setIsAdminRoute(false);
    } catch (e) {}
  };

  const handleOpenMarketAppNewTab = () => {
    try {
      window.open('/', '_blank');
    } catch (e) {}
  };

  // App Role: Buyer vs Farmer vs Admin
  const [userRole, setUserRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ROLE);
    const valid = saved === 'buyer' || saved === 'farmer' || saved === 'admin';
    return valid ? (saved as UserRole) : currentUser ? currentUser.role : 'buyer';
  });

  // Active Bottom Tab
  const [activeTab, setActiveTab] = useState<string>(() => {
    return userRole === 'farmer' ? 'farmer-portal' : 'market';
  });

  const handleSelectTab = (tab: string) => {
    if (userRole === 'farmer' && (tab === 'farms' || tab === 'market')) {
      setActiveTab('farmer-portal');
      return;
    }
    setActiveTab(tab);
  };

  // Ensure farmer role never stays on farms or market tab
  useEffect(() => {
    if (userRole === 'farmer' && (activeTab === 'farms' || activeTab === 'market')) {
      setActiveTab('farmer-portal');
    }
  }, [userRole, activeTab]);

  // Produce State
  const [produceList, setProduceList] = useState<ProduceItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PRODUCE);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse produce', e);
      }
    }
    return INITIAL_PRODUCE;
  });

  // Farmers State
  const [farmers] = useState<FarmerProfile[]>(INITIAL_FARMERS);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CART);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse cart', e);
      }
    }
    return [];
  });

  // Orders State
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ORDERS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse orders', e);
      }
    }
    return INITIAL_ORDERS;
  });

  // Transport Jobs State
  const [transportJobs, setTransportJobs] = useState<TransportJob[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.JOBS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse jobs', e);
      }
    }
    return INITIAL_TRANSPORT_JOBS;
  });

  // Direct Messages State (localized for Dumaguete)
  const [messages, setMessages] = useState<DirectMessage[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse messages', e);
      }
    }
    return [];
  });

  // Modals & Active Selections
  const [selectedProduce, setSelectedProduce] = useState<ProduceItem | null>(null);
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
  const [isAddProduceOpen, setIsAddProduceOpen] = useState(false);
  const [editingProduce, setEditingProduce] = useState<ProduceItem | null>(null);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<string>(() => {
    return currentUser?.location || 'Dumaguete City Proper (Rizal Blvd & Public Market)';
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isGlobalPriceWatchOpen, setIsGlobalPriceWatchOpen] = useState(false);
  const [globalPriceWatchSearch, setGlobalPriceWatchSearch] = useState('');

  // Keep currentLocation in sync with currentUser
  useEffect(() => {
    if (currentUser?.location) {
      setCurrentLocation(currentUser.location);
    }
  }, [currentUser?.location]);

  // Registered Users (clean slate, built from user registrations)
  const [registeredUsers, setRegisteredUsers] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((u) => u && u.role !== 'transporter').map((u) => {
            if (!u.latitude || !u.longitude) {
              const c = resolveCoordinates(u.location, u.latitude, u.longitude);
              return { ...u, latitude: c.lat, longitude: c.lng };
            }
            return u;
          });
        }
      }
    } catch (e) {}
    return [];
  });

  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    const handleQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  // Facebook Messenger Chat State
  const [isChatBoxOpen, setIsChatBoxOpen] = useState<boolean>(false);
  const [isChatMinimized, setIsChatMinimized] = useState<boolean>(false);
  const [activeChatPartner, setActiveChatPartner] = useState<ChatContact | null>(null);
  const [ordersInitialFilter, setOrdersInitialFilter] = useState<'all' | 'active' | 'completed'>('all');

  // Clean any legacy unsplash avatars from existing stored session
  useEffect(() => {
    if (currentUser?.avatar && currentUser.avatar.includes('unsplash.com')) {
      setCurrentUser((prev) => (prev ? { ...prev, avatar: '' } : null));
    }
  }, []);

  // Sync with Backend and purge obsolete legacy localStorage keys
  useEffect(() => {
    try {
      // Remove obsolete versions of stored data (legacy keys from older app versions).
      // Active v9 keys — including the registered-users registry — must NEVER be
      // purged, otherwise the local account list (login fallback) is wiped on
      // every page load and farmer/buyer accounts appear "lost" after a restart.
      const activeKeys = new Set<string>([
        ...Object.values(STORAGE_KEYS),
        'veggieconnect_v9_clean_supermarket',
        'veggieconnect_v9_clean_admin_hub',
        'veggieconnect_sync_event',
      ]);
      const oldKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('veggieconnect_') && !k.includes('_v9_clean') && !activeKeys.has(k)) {
          oldKeys.push(k);
        }
      }
      oldKeys.forEach((k) => localStorage.removeItem(k));
    } catch (e) {}

    async function loadBackendData() {
      try {
        const prodRes = await fetch('/api/products');
        if (prodRes.ok) {
          const remoteProds = await prodRes.json();
          if (Array.isArray(remoteProds)) {
            // Intelligent merge: keep any supermarket stocked items that were saved locally
            const localSaved: ProduceItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCE) || '[]');

            if (remoteProds.length === 0 && localSaved.length > 0) {
              // The backend came back empty (e.g. the server restarted with fresh
              // memory). Keep the locally saved listings and re-publish them to the
              // backend so farmers never lose their produce after an app/browser exit.
              setProduceList(localSaved);
              localSaved.forEach((item) => {
                fetch('/api/products', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(item),
                }).catch(() => {});
              });
            } else {
              const remoteMap = new Map<string, ProduceItem>();
              remoteProds.forEach((p: ProduceItem) => remoteMap.set(p.id, p));

              // Ensure any local supermarket items not in remote or with updated status are preserved
              localSaved.forEach((localItem: ProduceItem) => {
                if (
                  localItem.sellerStoreName === 'VeggieConnect Supermarket' ||
                  localItem.sellerStatus === 'bought_and_stocked' ||
                  (localItem.boughtQuantity && localItem.boughtQuantity > 0)
                ) {
                  const existingInRemote = remoteMap.get(localItem.id);
                  if (!existingInRemote) {
                    remoteMap.set(localItem.id, localItem);
                  } else if (
                    localItem.sellerStoreName === 'VeggieConnect Supermarket' &&
                    existingInRemote.sellerStoreName !== 'VeggieConnect Supermarket'
                  ) {
                    remoteMap.set(localItem.id, {
                      ...existingInRemote,
                      sellerStoreName: 'VeggieConnect Supermarket',
                      sellerStatus: 'bought_and_stocked',
                      stockQuantity: localItem.stockQuantity,
                      pricePerUnit: localItem.pricePerUnit,
                    });
                  }
                }
              });

              const merged = Array.from(remoteMap.values());
              setProduceList(merged);
              localStorage.setItem(STORAGE_KEYS.PRODUCE, JSON.stringify(merged));
            }
          }
        }

        const ordRes = await fetch('/api/orders');
        if (ordRes.ok) {
          const remoteOrders = await ordRes.json();
          // Never replace local orders with an empty remote list — an empty list
          // usually means the backend just restarted with fresh memory.
          if (Array.isArray(remoteOrders) && remoteOrders.length > 0) {
            setOrders(remoteOrders);
          }
        }

        const jobRes = await fetch('/api/transport-jobs');
        if (jobRes.ok) {
          const remoteJobs = await jobRes.json();
          if (Array.isArray(remoteJobs) && remoteJobs.length > 0) {
            setTransportJobs(remoteJobs);
          }
        }

        const msgRes = await fetch('/api/messages');
        if (msgRes.ok) {
          const remoteMsgs = await msgRes.json();
          if (Array.isArray(remoteMsgs) && remoteMsgs.length > 0) {
            setMessages(remoteMsgs);
          }
        }

        const usersRes = await fetch('/api/users');
        if (usersRes.ok) {
          const remoteUsers = await usersRes.json();
          // An empty user list from the backend means it restarted with fresh
          // memory — keep the locally cached registry so accounts are not lost.
          if (Array.isArray(remoteUsers) && remoteUsers.length > 0) {
            // Never wipe a pin the user already saved: a backend row without
            // coordinates (legacy schema) reuses the known pin instead of
            // geocoding the text address into a different location.
            const enriched = enrichUsersWithKnownPins(remoteUsers, registeredUsers);
            setRegisteredUsers(enriched);
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(enriched));
          }
        }
      } catch (err) {
        // Safe offline/fallback execution
        console.log('Using local client state');
      } finally {
        setIsInitialLoadDone(true);
      }
    }
    loadBackendData();
    // Mirror the admin's published hub pin into this browser so the
    // live-transaction map shows the admin's actual saved location.
    syncSupermarketFromBackend();

    // Cross-tab Synchronization: Listen to storage changes from other tabs
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.USERS && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setRegisteredUsers(parsed);
        } catch (err) {}
      }
      if (e.key === STORAGE_KEYS.PRODUCE && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setProduceList(parsed);
        } catch (err) {}
      }
      if (e.key === STORAGE_KEYS.ORDERS && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setOrders(parsed);
        } catch (err) {}
      }
      if (e.key === STORAGE_KEYS.JOBS && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setTransportJobs(parsed);
        } catch (err) {}
      }
      if (e.key === 'veggieconnect_v9_clean_supermarket' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (
            parsed &&
            typeof parsed.latitude === 'number' &&
            typeof parsed.longitude === 'number'
          ) {
            // Persist the dedicated admin-hub record on the farmer's tab too.
            // This prevents a signed-in farmer session from ever becoming the
            // admin-location fallback source.
            localStorage.setItem(
              'veggieconnect_v9_clean_admin_hub',
              JSON.stringify({
                address: parsed.address,
                latitude: parsed.latitude,
                longitude: parsed.longitude,
              })
            );
            window.dispatchEvent(
              new CustomEvent('veggieconnect:admin-location-updated', {
                detail: { latitude: parsed.latitude, longitude: parsed.longitude },
              })
            );
          }
        } catch (err) {}
      }
      if (e.key === 'veggieconnect_v9_clean_admin_hub' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (
            parsed &&
            typeof parsed.latitude === 'number' &&
            typeof parsed.longitude === 'number'
          ) {
            window.dispatchEvent(
              new CustomEvent('veggieconnect:admin-location-updated', {
                detail: { latitude: parsed.latitude, longitude: parsed.longitude },
              })
            );
          }
        } catch (err) {}
      }
      if (e.key === STORAGE_KEYS.MESSAGES && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setMessages(parsed);
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    // Background Polling (every 2.5s) to ensure real-time status propagation across users/devices
    const pollTimer = setInterval(async () => {
      try {
        syncSupermarketFromBackend();
        const [ordRes, jobRes, prodRes, userRes] = await Promise.all([
          fetch('/api/orders'),
          fetch('/api/transport-jobs'),
          fetch('/api/products'),
          fetch('/api/users')
        ]);
        if (ordRes.ok) {
          const remoteOrders = await ordRes.json();
          // Never wipe local orders with an empty remote list (fresh server memory).
          if (Array.isArray(remoteOrders) && remoteOrders.length > 0) {
            setOrders(remoteOrders);
          }
        }
        if (jobRes.ok) {
          const remoteJobs = await jobRes.json();
          if (Array.isArray(remoteJobs) && remoteJobs.length > 0) {
            setTransportJobs(remoteJobs);
          }
        }
        if (prodRes.ok) {
          const remoteProds = await prodRes.json();
          // An empty remote list means the backend restarted with fresh memory —
          // keep the local listings instead of wiping farmer produce.
          if (Array.isArray(remoteProds) && remoteProds.length > 0) {
            // Merge with local state to ensure locally stocked supermarket items are NEVER wiped out by stale poll
            setProduceList((currentLocal) => {
              const remoteMap = new Map<string, ProduceItem>();
              remoteProds.forEach((p: ProduceItem) => remoteMap.set(p.id, p));

              // Preserve any locally stocked supermarket items or bought quantities
              currentLocal.forEach((localItem) => {
                const isSupermarket =
                  localItem.sellerStoreName === 'VeggieConnect Supermarket' ||
                  localItem.sellerStatus === 'bought_and_stocked' ||
                  localItem.id.startsWith('sm-');

                if (isSupermarket) {
                  const existingRemote = remoteMap.get(localItem.id);
                  if (!existingRemote) {
                    remoteMap.set(localItem.id, localItem);
                  } else {
                    remoteMap.set(localItem.id, {
                      ...existingRemote,
                      sellerStoreName: 'VeggieConnect Supermarket',
                      sellerStatus: 'bought_and_stocked',
                      stockQuantity: Math.max(existingRemote.stockQuantity, localItem.stockQuantity),
                      pricePerUnit: localItem.pricePerUnit || existingRemote.pricePerUnit,
                    });
                  }
                } else if ((localItem.boughtQuantity || 0) > 0) {
                  const existingRemote = remoteMap.get(localItem.id);
                  if (existingRemote) {
                    remoteMap.set(localItem.id, {
                      ...existingRemote,
                      boughtQuantity: Math.max(existingRemote.boughtQuantity || 0, localItem.boughtQuantity || 0),
                      stockQuantity: localItem.stockQuantity,
                    });
                  }
                }
              });

              const merged = Array.from(remoteMap.values());
              localStorage.setItem(STORAGE_KEYS.PRODUCE, JSON.stringify(merged));
              return merged;
            });
          }
        }
        if (userRes.ok) {
          const remoteUsers = await userRes.json();
          // Never replace the local registered-users registry with an empty list
          // (backend restarted with fresh memory) — accounts would be "lost".
          if (Array.isArray(remoteUsers) && remoteUsers.length > 0) {
            // Merge against the LIVE state (functional update) so pins saved in
            // this tab are never wiped by a backend row lacking coordinates.
            setRegisteredUsers((currentLocal) =>
              enrichUsersWithKnownPins(remoteUsers, currentLocal)
            );
          }
        }
      } catch (err) {
        // Silent background poll handling
      }
    }, 2500);

    return () => {
      window.removeEventListener('storage', handleStorageEvent);
      clearInterval(pollTimer);
    };
  }, []);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRODUCE, JSON.stringify(produceList));
  }, [produceList]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(transportJobs));
  }, [transportJobs]);

  // Self-healing synchronization: if an order is cancelled, ensure its transport job is marked cancelled
  useEffect(() => {
    const cancelledOrders = orders.filter((o) => o.status === 'cancelled');
    if (cancelledOrders.length === 0) return;

    setTransportJobs((prevJobs) => {
      let changed = false;
      const updated = prevJobs.map((j) => {
        if (j.status === 'cancelled') return j;
        const linkedOrder = cancelledOrders.find(
          (o) =>
            o.id === j.orderId ||
            (o.transportJobId && o.transportJobId === j.id) ||
            (o.farmName && j.pickupFarm && o.farmName.trim().toLowerCase() === j.pickupFarm.trim().toLowerCase() &&
             o.buyerName && j.buyerName && o.buyerName.trim().toLowerCase() === j.buyerName.trim().toLowerCase() &&
             j.status !== 'delivered')
        );
        if (linkedOrder) {
          changed = true;
          return {
            ...j,
            status: 'cancelled' as const,
            cancelReason: linkedOrder.cancelReason || 'Cancelled upon request',
            cancelledAt: linkedOrder.cancelledAt,
          };
        }
        return j;
      });
      if (changed) {
        localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(updated));
        return updated;
      }
      return prevJobs;
    });
  }, [orders]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ROLE, userRole);
  }, [userRole]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  // Automatic Cascading Cleanup:
  // If a farmer account is removed, automatically remove all their crop listings from the marketplace & cart
  useEffect(() => {
    // Only run after initial load or if we have registered users
    if (!isInitialLoadDone && registeredUsers.length === 0 && !currentUser) return;
    if (!Array.isArray(produceList) || produceList.length === 0) return;

    // Collect all valid farmer IDs, farm names, and farmer names from registeredUsers and currentUser
    const validFarmerIds = new Set<string>();
    const validFarmNames = new Set<string>();
    const validFarmerNames = new Set<string>();

    registeredUsers
      .filter((u) => u.role === 'farmer')
      .forEach((f) => {
        if (f.id) validFarmerIds.add(f.id);
        if (f.farmName) validFarmNames.add(f.farmName.trim().toLowerCase());
        if (f.name) validFarmerNames.add(f.name.trim().toLowerCase());
      });

    if (currentUser && currentUser.role === 'farmer') {
      if (currentUser.id) validFarmerIds.add(currentUser.id);
      if (currentUser.farmName) validFarmNames.add(currentUser.farmName.trim().toLowerCase());
      if (currentUser.name) validFarmerNames.add(currentUser.name.trim().toLowerCase());
    }

    // A crop is orphaned if its farmer is no longer registered in the system
    const orphaned = produceList.filter((p) => {
      // Supermarket retail stock is owned by the VeggieConnect Central Produce Hub / admin
      // (farmerId 'admin-main'), not by a registered farmer account. Never treat it as orphaned,
      // otherwise freshly stocked items would be deleted right after being put on the shelf.
      const isSupermarketStock =
        p.sellerStoreName === 'VeggieConnect Supermarket' ||
        p.sellerStatus === 'bought_and_stocked' ||
        p.farmerId === 'admin-main' ||
        p.farmName === 'VeggieConnect Supermarket' ||
        p.farmerName === 'VeggieConnect Central Produce Hub' ||
        (p.id || '').startsWith('sm-');
      if (isSupermarketStock) return false;

      const matchId = p.farmerId && validFarmerIds.has(p.farmerId);
      const matchFarm = p.farmName && validFarmNames.has(p.farmName.trim().toLowerCase());
      const matchName = p.farmerName && validFarmerNames.has(p.farmerName.trim().toLowerCase());
      return !(matchId || matchFarm || matchName);
    });

    if (orphaned.length > 0) {
      console.log(`[Cascading Cleanup] Removing ${orphaned.length} orphaned produce items belonging to deleted farmers.`);
      const remaining = produceList.filter((p) => !orphaned.some((o) => o.id === p.id));
      setProduceList(remaining);
      localStorage.setItem(STORAGE_KEYS.PRODUCE, JSON.stringify(remaining));

      // Remove orphaned crops from cart as well
      setCart((prev) => {
        const cleanedCart = prev.filter((c) => !orphaned.some((o) => o.id === c.produce.id));
        localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cleanedCart));
        return cleanedCart;
      });

      // Synchronize deletion with backend
      orphaned.forEach((item) => {
        fetch(`/api/products/${item.id}`, { method: 'DELETE' }).catch(() => {});
      });
    }
  }, [isInitialLoadDone, registeredUsers, currentUser, produceList]);

  // Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2800);
  };

  // Cart Management
  const cartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const cartItemIds = useMemo(() => {
    return new Set(cart.map((item) => item.produce.id));
  }, [cart]);

  const handleAddToCart = (produce: ProduceItem, e?: React.MouseEvent | number) => {
    if (e && typeof e === 'object' && 'stopPropagation' in e) {
      e.stopPropagation();
    }
    const qtyToAdd = typeof e === 'number' ? e : 1;

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.produce.id === produce.id);
      if (existing) {
        return prevCart.map((item) =>
          item.produce.id === produce.id
            ? { ...item, quantity: Math.min(produce.stockQuantity, item.quantity + qtyToAdd) }
            : item
        );
      }
      return [...prevCart, { produce, quantity: qtyToAdd }];
    });

    showToast(`Added ${produce.name} to Direct Basket!`);
  };

  const handleUpdateCartQuantity = (produceId: string, quantity: number) => {
    setCart((prev) =>
      prev.map((item) => (item.produce.id === produceId ? { ...item, quantity } : item))
    );
  };

  const handleRemoveFromCart = (produceId: string) => {
    setCart((prev) => prev.filter((item) => item.produce.id !== produceId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Order Handlers
  const handleOrderPlaced = (newOrder: Order) => {
    const generatedJobId = `TJ-${Date.now().toString().slice(-4)}`;
    const orderPayload = {
      ...newOrder,
      transportJobId: generatedJobId,
    };

    setOrders((prev) => [orderPayload, ...prev]);

    // Deduct purchased crop stock from produceList and sync with backend
    setProduceList((prev) => {
      const updated = prev.map((prod) => {
        const matchingItem = newOrder.items.find((it) => it.produceId === prod.id);
        if (matchingItem) {
          const newStock = Math.max(0, prod.stockQuantity - matchingItem.quantity);
          fetch(`/api/products/${prod.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stockQuantity: newStock }),
          }).catch((e) => console.log('Crop stock deduct sync notice:', e));
          return {
            ...prod,
            stockQuantity: newStock,
            sellerStatus: newStock === 0 && !prod.sellerStoreName ? ('sold_out' as const) : prod.sellerStatus,
          };
        }
        return prod;
      });
      localStorage.setItem(STORAGE_KEYS.PRODUCE, JSON.stringify(updated));
      return updated;
    });

    // Send to backend API
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
    }).catch((e) => console.log('Order sync notice:', e));

    // If order is direct delivery, automatically add a job for owner logistics fleet
    if (newOrder.deliveryType === 'direct_delivery') {
      const matchedFarmer = registeredUsers.find(
        (u) =>
          (u.id && u.id === newOrder.farmerId) ||
          (u.farmName && u.farmName.trim().toLowerCase() === newOrder.farmName.trim().toLowerCase()) ||
          (u.name && u.name.trim().toLowerCase() === newOrder.farmName.trim().toLowerCase())
      );

      const resolvedFarmLocation = matchedFarmer?.location || `${newOrder.farmName}, Negros Oriental`;

      const newJob: TransportJob = {
        id: generatedJobId,
        orderId: newOrder.id,
        pickupFarm: newOrder.farmName,
        pickupLocation: resolvedFarmLocation,
        dropoffLocation: newOrder.deliveryAddress || 'Dumaguete City Proper, Negros Oriental',
        buyerName: newOrder.buyerName,
        buyerPhone: newOrder.buyerPhone,
        itemsSummary: newOrder.items.map((it) => `${it.quantity} ${it.unit} ${it.produceName}`).join(', '),
        weightKgEst: Math.max(3, newOrder.items.length * 2.5),
        earningsPeso: newOrder.deliveryFee || 50.0,
        assignedTransporterId: 'admin-main',
        assignedTransporterName: 'Owner Logistics (You)',
        assignedTransporterPhone: '0900 000 0000',
        status: 'available',
        createdAt: 'Just now',
      };
      setTransportJobs((prev) => [newJob, ...prev.filter((j) => j.orderId !== newOrder.id)]);
      fetch('/api/transport-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newJob),
      }).catch((e) => console.log('Job sync notice:', e));
    }

    setActiveTab('orders');
    showToast(`Order ${newOrder.id} placed directly with ${newOrder.farmName}!`);
  };

  const handleUpdateOrderStatus = (
    orderId: string,
    newStatus: OrderStatus,
    cancelReason?: string,
    cancelledBy?: string
  ) => {
    const cleanOrderId = String(orderId || '').replace('#', '').trim().toLowerCase();
    const targetOrder =
      orders.find((o) => o.id === orderId || String(o.id).replace('#', '').trim().toLowerCase() === cleanOrderId) ||
      (() => {
        try {
          const saved: Order[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]');
          return saved.find((o) => o.id === orderId || String(o.id).replace('#', '').trim().toLowerCase() === cleanOrderId);
        } catch {
          return undefined;
        }
      })();
    const previousStatus = targetOrder?.status;

    // 1. If cancelling an active order, RESTOCK PRODUCE INVENTORY & CANCEL HAUL
    if (newStatus === 'cancelled' && previousStatus !== 'cancelled') {
      const itemsToRestock = targetOrder?.items || [];
      let totalRestockedKg = 0;

      if (itemsToRestock.length > 0) {
        setProduceList((prev) => {
          const updated = prev.map((prod) => {
            const matchingItem = itemsToRestock.find(
              (it) =>
                it.produceId === prod.id ||
                (it.produceName && prod.name && it.produceName.trim().toLowerCase() === prod.name.trim().toLowerCase())
            );
            if (matchingItem) {
              const qty = Number(matchingItem.quantity) || 0;
              totalRestockedKg += qty;
              const newStock = prod.stockQuantity + qty;
              const newSellerStatus =
                prod.sellerStatus === 'sold_out' ? ('bought_and_stocked' as const) : prod.sellerStatus;

              fetch(`/api/products/${prod.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stockQuantity: newStock, sellerStatus: newSellerStatus }),
              }).catch((e) => console.log('Crop stock restock sync notice:', e));

              return {
                ...prod,
                stockQuantity: newStock,
                sellerStatus: newSellerStatus,
              };
            }
            return prod;
          });
          localStorage.setItem(STORAGE_KEYS.PRODUCE, JSON.stringify(updated));
          return updated;
        });
      }

      // Cancel associated transport job
      const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const finalCancelReason = cancelReason || 'Cancelled upon request';
      const cancellerName = cancelledBy || currentUser?.name || 'User';

      setTransportJobs((prev) => {
        const updated = prev.map((j) => {
          const normJobOrderId = String(j.orderId || '').replace('#', '').trim().toLowerCase();
          const normJobId = String(j.id || '').replace('#', '').trim().toLowerCase();
          const normTargetJobId = String(targetOrder?.transportJobId || '').replace('#', '').trim().toLowerCase();
          const normTargetOrderId = String(targetOrder?.id || '').replace('#', '').trim().toLowerCase();

          const isMatch =
            normJobOrderId === cleanOrderId ||
            normJobId === cleanOrderId ||
            (normTargetOrderId && normJobOrderId === normTargetOrderId) ||
            (normTargetJobId && normJobId === normTargetJobId) ||
            (targetOrder &&
             j.pickupFarm && targetOrder.farmName &&
             j.pickupFarm.trim().toLowerCase() === targetOrder.farmName.trim().toLowerCase() &&
             j.buyerName && targetOrder.buyerName &&
             j.buyerName.trim().toLowerCase() === targetOrder.buyerName.trim().toLowerCase() &&
             j.status !== 'delivered');

          if (isMatch) {
            fetch(`/api/transport-jobs/${j.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                status: 'cancelled',
                cancelReason: finalCancelReason,
                cancelledAt: timeNow,
              }),
            }).catch((e) => console.log('Job cancel sync notice:', e));

            return {
              ...j,
              status: 'cancelled' as const,
              cancelReason: finalCancelReason,
              cancelledAt: timeNow,
            };
          }
          return j;
        });
        localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(updated));
        return updated;
      });

      // Update orders state
      setOrders((prev) => {
        const updated = prev.map((o) =>
          o.id === orderId || String(o.id).replace('#', '').trim().toLowerCase() === cleanOrderId
            ? {
                ...o,
                status: 'cancelled' as OrderStatus,
                cancelReason: finalCancelReason,
                cancelledAt: timeNow,
                cancelledBy: cancellerName,
              }
            : o
        );
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(updated));
        return updated;
      });

      // Sync cancellation to backend
      fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'cancelled',
          cancelReason: finalCancelReason,
          cancelledAt: timeNow,
          cancelledBy: cancellerName,
        }),
      }).catch((e) => console.log('Order cancel sync notice:', e));

      appSync.publish('ORDERS_UPDATED', { id: orderId, status: 'cancelled' }, 'admin');
      appSync.publish('JOBS_UPDATED', { orderId, status: 'cancelled' }, 'admin');
      appSync.publish('PRODUCE_UPDATED', { restocked: true }, 'admin');
      showToast(`Order #${orderId} cancelled. Restocked ${totalRestockedKg}kg back to supermarket stock!`);
      return;
    }

    // Regular non-cancellation status update
    setOrders((prev) => {
      const updated = prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o));
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(updated));
      return updated;
    });

    if (newStatus === 'completed') {
      setTransportJobs((prev) =>
        prev.map((j) =>
          j.orderId === orderId || j.id === orderId ? { ...j, status: 'delivered' } : j
        )
      );
    } else if (newStatus === 'in_transit') {
      setTransportJobs((prev) =>
        prev.map((j) =>
          j.orderId === orderId || j.id === orderId ? { ...j, status: 'in_transit' } : j
        )
      );
    }

    // Sync to backend
    fetch(`/api/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    }).catch((e) => console.log('Order status sync notice:', e));

    appSync.publish('ORDERS_UPDATED', { id: orderId, status: newStatus }, 'admin');
    showToast(`Order status updated to "${newStatus.replace('_', ' ')}"`);
  };

  // Delivery Job Actions (deliveries are handled by the admin / owner logistics)
  const handleAcceptTransportJob = (jobId: string) => {
    const transporter = currentUser || {
      id: 'admin-main',
      name: 'Owner Logistics (You)',
      role: 'admin' as const,
      phone: '',
      location: 'Dumaguete City',
    };

    setTransportJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? {
              ...j,
              status: 'accepted',
              assignedTransporterId: transporter.id,
              assignedTransporterName: transporter.name,
            }
          : j
      )
    );

    // Find the corresponding order by orderId or by farm + buyer fallback
    const targetJob = transportJobs.find((j) => j.id === jobId);
    const targetOrderId =
      targetJob?.orderId ||
      orders.find(
        (o) =>
          o.deliveryType === 'direct_delivery' &&
          o.status !== 'completed' &&
          ((targetJob?.pickupFarm && o.farmName.trim().toLowerCase() === targetJob.pickupFarm.trim().toLowerCase()) ||
           (targetJob?.buyerName && o.buyerName.trim().toLowerCase() === targetJob.buyerName.trim().toLowerCase()))
      )?.id;

    // Immediately update order status to in_transit and record who is delivering (the admin)
    setOrders((prev) =>
      prev.map((o) => {
        const isMatch =
          (targetOrderId && o.id === targetOrderId) ||
          (targetJob?.orderId && o.id === targetJob.orderId) ||
          (targetJob &&
            o.farmName.trim().toLowerCase() === targetJob.pickupFarm.trim().toLowerCase() &&
            o.buyerName.trim().toLowerCase() === targetJob.buyerName.trim().toLowerCase() &&
            o.status !== 'completed');

        if (isMatch) {
          return {
            ...o,
            transporterId: transporter.id,
            transporterName: transporter.name,
            status: 'in_transit' as const,
          };
        }
        return o;
      })
    );

    // Sync order to backend
    const syncOrderId = targetOrderId || targetJob?.orderId;
    if (syncOrderId) {
      fetch(`/api/orders/${syncOrderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transporterId: transporter.id,
          transporterName: transporter.name,
          status: 'in_transit',
        }),
      }).catch((e) => console.log('Order sync notice:', e));
    }

    // Sync to backend transport jobs
    fetch(`/api/transport-jobs/${jobId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'accepted',
        assignedTransporterId: transporter.id,
        assignedTransporterName: transporter.name,
      }),
    }).catch((e) => console.log('Job sync notice:', e));

    showToast(`Accepted haul ${jobId}! Route added to active trips.`);
  };

  const handleUpdateTransportJobStatus = (jobId: string, status: TransportJob['status']) => {
    setTransportJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, status } : j))
    );

    fetch(`/api/transport-jobs/${jobId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).catch((e) => console.log('Job update notice:', e));

    // Find matched order
    const targetJob = transportJobs.find((j) => j.id === jobId);
    const targetOrderId =
      targetJob?.orderId ||
      orders.find(
        (o) =>
          o.deliveryType === 'direct_delivery' &&
          ((targetJob?.pickupFarm && o.farmName.trim().toLowerCase() === targetJob.pickupFarm.trim().toLowerCase()) ||
           (targetJob?.buyerName && o.buyerName.trim().toLowerCase() === targetJob.buyerName.trim().toLowerCase()))
      )?.id;

    const newOrderStatus: Order['status'] =
      status === 'delivered'
        ? 'completed'
        : status === 'in_transit'
        ? 'in_transit'
        : status === 'picked_up'
        ? 'picked_up'
        : 'confirmed';

    setOrders((prev) =>
      prev.map((o) => {
        const isMatch =
          (targetOrderId && o.id === targetOrderId) ||
          (targetJob?.orderId && o.id === targetJob.orderId) ||
          (targetJob &&
            o.farmName.trim().toLowerCase() === targetJob.pickupFarm.trim().toLowerCase() &&
            o.buyerName.trim().toLowerCase() === targetJob.buyerName.trim().toLowerCase());

        return isMatch ? { ...o, status: newOrderStatus } : o;
      })
    );

    const syncOrderId = targetOrderId || targetJob?.orderId;
    if (syncOrderId) {
      fetch(`/api/orders/${syncOrderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newOrderStatus }),
      }).catch((e) => console.log('Order sync notice:', e));
    }

    if (status === 'delivered') {
      showToast('Delivery marked completed! Order finalized.');
    } else if (status === 'picked_up') {
      showToast('Trip progress: Crates Loaded at Farm! (Order updated)');
    } else if (status === 'in_transit') {
      showToast('Trip progress: On the Road to Customer! (Order updated)');
    } else {
      showToast(`Trip status updated to "${status.replace('_', ' ')}"`);
    }
  };

  // Farmer Add Produce
  const handleAddProduce = (newProduceData: Omit<ProduceItem, 'id' | 'rating' | 'reviewsCount'>) => {
    const coords = resolveCoordinates(newProduceData.location, newProduceData.latitude, newProduceData.longitude);
    const newItem: ProduceItem = {
      ...newProduceData,
      id: `prod-${Date.now()}`,
      farmgateAskingPrice: newProduceData.pricePerUnit,
      sourcingRegion: newProduceData.location || 'Negros Oriental Local Grower',
      sellerStatus: 'submitted',
      brokerStatus: 'approved_active',
      latitude: coords.lat,
      longitude: coords.lng,
      rating: 5.0,
      reviewsCount: 1,
    };
    setProduceList((prev) => [newItem, ...prev]);

    // Send to backend API
    fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem),
    }).catch((e) => console.log('Product sync notice:', e));

    showToast(`Vegetable listed for sale: ${newItem.name}`);
  };

  // Farmer Edit Produce
  const handleEditProduce = (updated: ProduceItem) => {
    setProduceList((prev) => {
      const exists = prev.some((item) => item.id === updated.id);
      const nextList = exists
        ? prev.map((item) => (item.id === updated.id ? updated : item))
        : [updated, ...prev];
      localStorage.setItem(STORAGE_KEYS.PRODUCE, JSON.stringify(nextList));
      return nextList;
    });

    // Sync to backend API
    fetch(`/api/products/${updated.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch((e) => console.log('Product update sync notice:', e));

    showToast(`Updated crop listing: ${updated.name}`);
    setEditingProduce(null);
  };

  const handleUpdateProduceStock = (id: string, newStock: number) => {
    setProduceList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, stockQuantity: newStock } : item))
    );

    fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stockQuantity: newStock }),
    }).catch((e) => console.log('Stock sync notice:', e));

    showToast('Stock quantity updated');
  };

  const handleUpdateProducePrice = (id: string, newPrice: number) => {
    setProduceList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, pricePerUnit: newPrice } : item))
    );

    fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pricePerUnit: newPrice }),
    }).catch((e) => console.log('Price sync notice:', e));

    showToast(`Updated crop price to ₱${newPrice.toFixed(2)}/unit based on DA Bantay Presyo`);
  };

  const handleDeleteProduce = (id: string) => {
    setProduceList((prev) => prev.filter((item) => item.id !== id));

    fetch(`/api/products/${id}`, {
      method: 'DELETE',
    }).catch((e) => console.log('Delete sync notice:', e));

    showToast('Harvest listing removed');
  };

  // Admin buys farmer's product: Deducts farmer's stock, records the bought lot in Owned/Bought (never auto-stocks Live Supermarket Stock), posts a Transport Haul Job, and records transaction
  // The resale price is NOT asked here — it is set later when the admin manually uses "Put in Stock"
  // (after successful purchase / delivery).
  const handleBuyFarmerProduct = (
    farmerProduce: ProduceItem,
    boughtQuantity: number,
    resalePrice?: number
  ) => {
    // Guard: never buy more than the farmer has available
    const availableStock = Math.max(0, farmerProduce.stockQuantity || 0);
    if (boughtQuantity > availableStock) {
      showToast(`⚠️ Cannot buy ${boughtQuantity} kg — only ${availableStock} kg available from ${farmerProduce.farmerName}.`);
      return;
    }
    const askingPrice = farmerProduce.farmgateAskingPrice || farmerProduce.pricePerUnit;
    const totalPayout = askingPrice * boughtQuantity;
    const txId = `TX-ADM-${Date.now().toString().slice(-4)}`;
    const generatedJobId = `TJ-${Date.now().toString().slice(-4)}`;
    const haulFee = Math.max(60, Math.round(boughtQuantity * 2.5));

    // 1. Calculate remaining farmer stock after procurement
    const remainingFarmerStock = Math.max(0, farmerProduce.stockQuantity - boughtQuantity);
    const updatedBoughtTotal = (farmerProduce.boughtQuantity || 0) + boughtQuantity;

    // 2. Do NOT auto-create/merge Live Supermarket Stock — the fresh produce stays
    //    in Owned / Bought until the admin manually uses "Put in Stock".
    const updatedList: ProduceItem[] = produceList.map((p) =>
      p.id === farmerProduce.id
        ? {
            ...p,
            stockQuantity: remainingFarmerStock,
            sellerStatus: remainingFarmerStock === 0 ? ('sold_out' as const) : ('submitted' as const),
            boughtQuantity: updatedBoughtTotal,
            boughtAt: new Date().toISOString(),
          }
        : p
    );

    // (Live Supermarket Stock entries are only created via the manual "Put in Stock" action)

    // Always update farmer's remaining stock on backend
    fetch(`/api/products/${farmerProduce.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stockQuantity: remainingFarmerStock,
        boughtQuantity: updatedBoughtTotal,
        sellerStatus: remainingFarmerStock === 0 ? 'sold_out' : 'submitted',
      }),
    }).catch((e) => console.log('Farmer stock sync notice:', e));

    setProduceList(updatedList);
    localStorage.setItem(STORAGE_KEYS.PRODUCE, JSON.stringify(updatedList));

    // 3. CREATE OFFICIAL PROCUREMENT TRANSACTION (ORDER)
    // Status is 'confirmed' (Awaiting the admin's delivery haul! NOT 'completed'!)
    const matchedFarmer = registeredUsers.find(
      (u) =>
        u.id === farmerProduce.farmerId ||
        (u.farmName && u.farmName.trim().toLowerCase() === farmerProduce.farmName.trim().toLowerCase()) ||
        (u.name && u.name.trim().toLowerCase() === farmerProduce.farmerName.trim().toLowerCase())
    );

    const purchaseOrder: Order = {
      id: txId,
      buyerId: currentUser?.id || 'admin-main',
      buyerName: currentUser?.name ? `${currentUser.name} (Supermarket Store)` : 'VeggieConnect Supermarket (Admin Desk)',
      buyerPhone: currentUser?.phone || '0900 000 0000',
      farmerId: farmerProduce.farmerId,
      farmName: farmerProduce.farmName,
      farmerPhone: matchedFarmer?.phone || '0917 123 4567',
      sellerStoreName: 'VeggieConnect Supermarket',
      brokerHubName: 'VeggieConnect Supermarket',
      farmgateCostTotal: totalPayout,
      sellerMargin: resalePrice ? Math.max(0, (resalePrice - askingPrice) * boughtQuantity) : 0,
      items: [
        {
          produceId: farmerProduce.id,
          produceName: farmerProduce.name,
          unit: farmerProduce.unit || 'kg',
          quantity: boughtQuantity,
          unitPrice: askingPrice,
          pricePerUnit: askingPrice,
          farmerId: farmerProduce.farmerId,
          farmerName: farmerProduce.farmerName,
          farmName: farmerProduce.farmName,
          imageUrl: farmerProduce.imageUrl,
        },
      ],
      deliveryType: 'direct_delivery',
      deliveryAddress: 'VeggieConnect Supermarket Central Hub, Dumaguete City Proper',
      pickupSlot: `Farmgate Haul from ${farmerProduce.farmName} (${farmerProduce.location || 'Negros Oriental'})`,
      subtotal: totalPayout,
      deliveryFee: haulFee,
      totalAmount: totalPayout + haulFee,
      paymentMethod: 'Direct Farmgate Cash Payout',
      status: 'pending', // Starts as 'pending' (order placed, awaiting pickup route). 'Confirmed' lights up only when the owner starts the route ('I'll Pick This Up').
      transporterId: 'admin-main',
      transporterName: 'Owner Logistics (You)',
      vehicleType: 'Owner Utility Cargo Hauler',
      transportJobId: generatedJobId,
      notes: `Admin procurement: ${boughtQuantity} ${farmerProduce.unit || 'kg'} of ${farmerProduce.name} at ₱${askingPrice.toFixed(2)}/${farmerProduce.unit || 'kg'} from grower ${farmerProduce.farmerName} (${farmerProduce.farmName}). Owner logistics route dispatched to haul from farm to Supermarket Hub.`,
      createdAt: new Date().toISOString(),
    };

    setOrders((prev) => {
      const updatedOrders = [purchaseOrder, ...prev];
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(updatedOrders));
      return updatedOrders;
    });

    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(purchaseOrder),
    }).catch((e) => console.log('Order sync notice:', e));

    // 4. CREATE TRANSPORT JOB FOR THE OWNER LOGISTICS FLEET
    const resolvedFarmLocation = matchedFarmer?.location || farmerProduce.location || `${farmerProduce.farmName}, Negros Oriental`;
    const newTransportJob: TransportJob = {
      id: generatedJobId,
      orderId: txId,
      pickupFarm: farmerProduce.farmName,
      pickupLocation: resolvedFarmLocation,
      dropoffLocation: 'VeggieConnect Supermarket Central Hub, Dumaguete City Proper',
      buyerName: 'VeggieConnect Supermarket',
      buyerPhone: currentUser?.phone || '0900 000 0000',
      itemsSummary: `${boughtQuantity} ${farmerProduce.unit || 'kg'} ${farmerProduce.name} (Farm-to-Supermarket Haul)`,
      weightKgEst: boughtQuantity,
      earningsPeso: haulFee,
      assignedTransporterId: 'admin-main',
      assignedTransporterName: 'Owner Logistics (You)',
      assignedTransporterPhone: currentUser?.phone || '0900 000 0000',
      status: 'available',
      createdAt: 'Just now',
    };

    setTransportJobs((prev) => {
      const updatedJobs = [newTransportJob, ...prev.filter((j) => j.id !== generatedJobId && j.orderId !== txId)];
      localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(updatedJobs));
      return updatedJobs;
    });

    fetch('/api/transport-jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTransportJob),
    }).catch((e) => console.log('Transport job sync notice:', e));

    appSync.publish('ORDERS_UPDATED', purchaseOrder, 'admin');
    appSync.publish('JOBS_UPDATED', newTransportJob, 'admin');

    showToast(`Purchased ${boughtQuantity}kg of ${farmerProduce.name}! Added to Owned/Bought (use "Put in Stock" to list it in Live Supermarket Stock) & Owner Haul Route active.`);
  };

  const handlePutInSupermarketStock = (itemData: {
    name: string;
    stockQuantity: number;
    pricePerUnit: number;
    category?: string;
    unit?: string;
    variety?: string;
    farmerId?: string;
    farmerName?: string;
    farmName?: string;
    farmgateAskingPrice?: number;
    imageUrl?: string;
    description?: string;
    orderId?: string;
    produceId?: string;
    boughtQuantity?: number;
  }) => {
    let resultingItem: ProduceItem | undefined;

    const norm = (s: string) => (s || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]/g, '').trim();
    const isMatch = (a: string, b: string) => {
      const na = norm(a);
      const nb = norm(b);
      if (!na || !nb) return false;
      if (na === nb) return true;
      if (na.includes(nb) || nb.includes(na)) return true;
      return false;
    };

    const hubCoords = resolveCoordinates('Dumaguete City Proper (Central Produce Hub)');

    setProduceList((prev) => {
      const existingIndex = prev.findIndex(
        (p) =>
          (p.sellerStoreName === 'VeggieConnect Supermarket' || p.sellerStatus === 'bought_and_stocked' || p.id.startsWith('sm-')) &&
          ((itemData.produceId && (p.id === itemData.produceId || p.id === `sm-${itemData.produceId}` || p.id.startsWith(`sm-${itemData.produceId}`))) ||
           p.name.trim().toLowerCase() === itemData.name.trim().toLowerCase() ||
           isMatch(p.name, itemData.name))
      );

      let nextList: ProduceItem[];

      if (existingIndex >= 0) {
        const existing = prev[existingIndex];
        resultingItem = {
          ...existing,
          name: itemData.name || existing.name,
          stockQuantity: itemData.stockQuantity,
          pricePerUnit: itemData.pricePerUnit,
          farmgateAskingPrice: itemData.farmgateAskingPrice || existing.farmgateAskingPrice,
          category: itemData.category || existing.category || 'Vegetables',
          variety: itemData.variety || existing.variety || 'Farmgate Premium',
          imageUrl: itemData.imageUrl || existing.imageUrl || '',
          sellerStatus: 'bought_and_stocked',
          brokerStatus: 'approved_active',
          sellerStoreName: 'VeggieConnect Supermarket',
          farmName: 'VeggieConnect Supermarket',
          farmerName: 'VeggieConnect Central Produce Hub',
          farmerId: 'admin-main',
          location: 'Dumaguete City Proper (Central Produce Hub)',
          latitude: hubCoords.lat,
          longitude: hubCoords.lng,
          distanceKm: 1.0,
          boughtQuantity: itemData.boughtQuantity || Math.max(existing.boughtQuantity || 0, itemData.stockQuantity),
          boughtAt: new Date().toISOString(),
          sourcingRegion: itemData.farmerName ? `${itemData.farmerName} (${itemData.farmName || 'Local Farm'})` : (existing.sourcingRegion || 'Local Farmer Partner'),
          description:
            itemData.description ||
            existing.description ||
            `Fresh harvest in Negros Oriental. Quality-inspected and stocked in VeggieConnect Supermarket for retail buyers.`,
        };
        nextList = prev.map((p) => (p.id === existing.id ? resultingItem! : p));

        fetch(`/api/products/${existing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(resultingItem),
        }).catch((e) => console.log('Supermarket stock sync notice:', e));
      } else {
        const newId = `sm-${itemData.produceId || Date.now().toString().slice(-6)}`;
        resultingItem = {
          id: newId,
          farmerId: 'admin-main',
          farmerName: 'VeggieConnect Central Produce Hub',
          farmName: 'VeggieConnect Supermarket',
          name: itemData.name,
          category: itemData.category || 'Vegetables',
          variety: itemData.variety || 'Farmgate Premium',
          pricePerUnit: itemData.pricePerUnit,
          unit: itemData.unit || 'kg',
          stockQuantity: itemData.stockQuantity,
          minOrderQuantity: 1,
          harvestStatus: 'Harvested Today',
          harvestDate: 'Delivered & Stocked Today',
          farmingMethod: 'Naturally Grown',
          imageUrl: itemData.imageUrl || '',
          isOrganic: true,
          description:
            itemData.description ||
            `Fresh harvest in Negros Oriental. Quality-inspected and stocked in VeggieConnect Supermarket for retail buyers.`,
          location: 'Dumaguete City Proper (Central Produce Hub)',
          latitude: hubCoords.lat,
          longitude: hubCoords.lng,
          distanceKm: 1.0,
          rating: 5.0,
          reviewsCount: 1,
          sellerStatus: 'bought_and_stocked',
          brokerStatus: 'approved_active',
          sellerStoreName: 'VeggieConnect Supermarket',
          farmgateAskingPrice: itemData.farmgateAskingPrice || Math.round(itemData.pricePerUnit * 0.75),
          boughtQuantity: itemData.boughtQuantity || itemData.stockQuantity,
          boughtAt: new Date().toISOString(),
          sourcingRegion: itemData.farmerName ? `${itemData.farmerName} (${itemData.farmName || 'Local Farm'})` : 'Local Farmer Partner',
        };
        nextList = [resultingItem!, ...prev];

        fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(resultingItem),
        }).catch((e) => console.log('Supermarket stock new item notice:', e));
      }

      // Also ensure if there is a matching original farmer produce item that was procured, update its boughtQuantity
      if (itemData.produceId) {
        nextList = nextList.map((p) => {
          if (p.id === itemData.produceId && (!p.sellerStoreName || p.sellerStoreName !== 'VeggieConnect Supermarket')) {
            return {
              ...p,
              boughtQuantity: Math.max(p.boughtQuantity || 0, itemData.stockQuantity),
              sellerStatus: p.stockQuantity === 0 ? ('sold_out' as const) : p.sellerStatus,
            };
          }
          return p;
        });
      }

      localStorage.setItem(STORAGE_KEYS.PRODUCE, JSON.stringify(nextList));
      return nextList;
    });

    try {
      const existingStocks = JSON.parse(localStorage.getItem('veggieconnect_v9_clean_bought_stocks') || '[]');
      const updatedStockRecord = {
        name: itemData.name,
        orderId: itemData.orderId,
        produceId: itemData.produceId,
        stockedQuantity: itemData.stockQuantity,
        resalePrice: itemData.pricePerUnit,
        farmgatePrice: itemData.farmgateAskingPrice,
        stockedAt: new Date().toISOString(),
      };
      localStorage.setItem(
        'veggieconnect_v9_clean_bought_stocks',
        JSON.stringify([
          updatedStockRecord,
          ...existingStocks.filter((s: any) => s.name !== itemData.name && s.orderId !== itemData.orderId),
        ])
      );
    } catch (e) {}

    if (resultingItem) {
      appSync.publish('PRODUCE_UPDATED', resultingItem, 'admin');
    }
    showToast(`✓ "${itemData.name}" (${itemData.stockQuantity} ${itemData.unit || 'kg'} @ ₱${itemData.pricePerUnit}/${itemData.unit || 'kg'}) is now live in Supermarket Stock!`);
  };

  const handleSaveProfile = (updatedProfile: UserProfile) => {
    const coords = resolveCoordinates(updatedProfile.location, updatedProfile.latitude, updatedProfile.longitude);
    const enriched: UserProfile = {
      ...updatedProfile,
      latitude: coords.lat,
      longitude: coords.lng,
    };
    setCurrentUser(enriched);
    if (enriched.location) {
      setCurrentLocation(enriched.location);
    }
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(enriched));

    // Update in registeredUsers list as well
    setRegisteredUsers((prev) => {
      const filtered = prev.filter((u) => u.id !== enriched.id);
      const updated = [...filtered, enriched];
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updated));
      return updated;
    });

    fetch(`/api/users/${enriched.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enriched),
    }).catch((err) => console.log('Profile update sync notice:', err));

    showToast('Profile updated successfully!');
  };

  // Farmer profile derived from current registered user
  const currentFarmer: FarmerProfile = useMemo(() => {
    if (currentUser && currentUser.role === 'farmer') {
      const coords = resolveCoordinates(currentUser.location, currentUser.latitude, currentUser.longitude);
      return {
        id: currentUser.id,
        name: currentUser.name,
        farmName: currentUser.farmName || `${currentUser.name}'s Farm`,
        location: currentUser.location,
        latitude: coords.lat,
        longitude: coords.lng,
        distanceKm: 0,
        rating: 5.0,
        totalReviews: 0,
        bio: `Fresh direct harvests in ${currentUser.location}.`,
        avatar: currentUser.avatar || '',
        coverImage: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80',
        phone: currentUser.phone,
        verified: true,
        farmingMethods: ['Locally Grown', 'Direct Harvest'],
        joinedYear: 2025,
        totalHarvestsSold: 0,
      };
    }
    const defCoords = resolveCoordinates('Dumaguete City');
    return {
      id: 'farmer-none',
      name: 'Local Farmer',
      farmName: 'Local Farm',
      location: 'Dumaguete City',
      latitude: defCoords.lat,
      longitude: defCoords.lng,
      distanceKm: 0,
      rating: 5.0,
      totalReviews: 0,
      bio: '',
      avatar: '',
      coverImage: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80',
      phone: '',
      verified: true,
      farmingMethods: ['Fresh Harvest'],
      joinedYear: 2025,
      totalHarvestsSold: 0,
    };
  }, [currentUser]);

  // Farmer directory derived from registered farmers and active produce items
  const allFarmers = useMemo<FarmerProfile[]>(() => {
    const list: FarmerProfile[] = [...INITIAL_FARMERS];

    // Add all registered users who are farmers
    registeredUsers
      .filter((u) => u.role === 'farmer')
      .forEach((fUser) => {
        if (!list.some((f) => f.id === fUser.id)) {
          const coords = resolveCoordinates(fUser.location, fUser.latitude, fUser.longitude);
          list.push({
            id: fUser.id,
            name: fUser.name,
            farmName: fUser.farmName || `${fUser.name}'s Farm`,
            location: fUser.location,
            latitude: coords.lat,
            longitude: coords.lng,
            distanceKm: 0,
            rating: 5.0,
            totalReviews: 0,
            bio: `Local grower cultivating fresh produce in ${fUser.location}.`,
            avatar: fUser.avatar || '',
            coverImage: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80',
            phone: fUser.phone,
            verified: true,
            farmingMethods: ['Naturally Grown', 'Direct Farm Gate'],
            joinedYear: 2025,
            totalHarvestsSold: 0,
          });
        }
      });

    // Also include any unique farms from produceList if not already in list
    produceList.forEach((prod) => {
      if (prod.farmerId && !list.some((f) => f.id === prod.farmerId)) {
        const coords = resolveCoordinates(prod.location, prod.latitude, prod.longitude);
        list.push({
          id: prod.farmerId,
          name: prod.farmerName || 'Local Farmer',
          farmName: prod.farmName || `${prod.farmerName || 'Local'}'s Farm`,
          location: prod.location || 'Valencia, Negros Oriental',
          latitude: coords.lat,
          longitude: coords.lng,
          distanceKm: 0,
          rating: 5.0,
          totalReviews: 0,
          bio: `Cultivating fresh produce in ${prod.location || 'Negros Oriental'}.`,
          avatar: '',
          coverImage: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80',
          phone: '',
          verified: true,
          farmingMethods: ['Locally Grown'],
          joinedYear: 2025,
          totalHarvestsSold: 0,
        });
      }
    });

    if (currentUser && currentUser.role === 'farmer') {
      const idx = list.findIndex((f) => f.id === currentFarmer.id);
      if (idx >= 0) {
        list[idx] = currentFarmer;
      } else {
        list.unshift(currentFarmer);
      }
    }

    return list;
  }, [currentUser, currentFarmer, registeredUsers, produceList]);

  // Current buyer/user location origin for dynamic distance calculations
  const buyerOrigin = useMemo(() => {
    const loc = currentUser?.location || currentLocation || 'Dumaguete City Proper';
    const coords = resolveCoordinates(loc, currentUser?.latitude, currentUser?.longitude);
    return {
      lat: coords.lat,
      lng: coords.lng,
      location: loc,
    };
  }, [currentUser?.location, currentUser?.latitude, currentUser?.longitude, currentLocation]);

  // Real-time geodesic distance calculation strictly based on GPS coordinates of each user
  const dynamicProduceList = useMemo(() => {
    const listToProcess = (!isAdminRoute && userRole === 'buyer')
      ? produceList.filter((item) => item.sellerStatus === 'bought_and_stocked' || item.brokerStatus === 'approved_active')
      : produceList;

    return listToProcess.map((item) => {
      const farmerUser = registeredUsers.find(
        (u) =>
          (item.farmerId && u.id === item.farmerId) ||
          (u.farmName && item.farmName && u.farmName.trim().toLowerCase() === item.farmName.trim().toLowerCase()) ||
          (u.name && item.farmerName && u.name.trim().toLowerCase() === item.farmerName.trim().toLowerCase())
      );

      const farmLat = farmerUser?.latitude !== undefined ? farmerUser.latitude : item.latitude;
      const farmLng = farmerUser?.longitude !== undefined ? farmerUser.longitude : item.longitude;
      const farmLoc = farmerUser?.location || item.location || 'Dumaguete City, Negros Oriental';

      const farmCoords = resolveCoordinates(farmLoc, farmLat, farmLng);

      const dynamicDist = calculateDistanceBetween(
        buyerOrigin,
        {
          lat: farmCoords.lat,
          lng: farmCoords.lng,
          location: farmLoc,
        }
      );

      return {
        ...item,
        latitude: farmCoords.lat,
        longitude: farmCoords.lng,
        distanceKm: dynamicDist,
      };
    });
  }, [produceList, buyerOrigin, registeredUsers, userRole]);

  const dynamicFarmers = useMemo(() => {
    return allFarmers.map((farmer) => {
      const isMyFarm = Boolean(
        currentUser &&
          (farmer.id === currentUser.id ||
            (farmer.name && currentUser.name && farmer.name.trim().toLowerCase() === currentUser.name.trim().toLowerCase()) ||
            (farmer.farmName && currentUser.farmName && farmer.farmName.trim().toLowerCase() === currentUser.farmName.trim().toLowerCase()))
      );

      if (isMyFarm) {
        return { ...farmer, distanceKm: 0 };
      }

      const fUser = registeredUsers.find(
        (u) =>
          u.id === farmer.id ||
          (u.farmName && farmer.farmName && u.farmName.trim().toLowerCase() === farmer.farmName.trim().toLowerCase()) ||
          (u.name && farmer.name && u.name.trim().toLowerCase() === farmer.name.trim().toLowerCase())
      );

      const farmLat = fUser?.latitude !== undefined ? fUser.latitude : farmer.latitude;
      const farmLng = fUser?.longitude !== undefined ? fUser.longitude : farmer.longitude;
      const farmLoc = fUser?.location || farmer.location || 'Valencia, Negros Oriental';

      const farmCoords = resolveCoordinates(farmLoc, farmLat, farmLng);

      const dynamicDist = calculateDistanceBetween(
        buyerOrigin,
        {
          lat: farmCoords.lat,
          lng: farmCoords.lng,
          location: farmLoc,
        }
      );

      return {
        ...farmer,
        latitude: farmCoords.lat,
        longitude: farmCoords.lng,
        distanceKm: dynamicDist,
      };
    });
  }, [allFarmers, buyerOrigin, currentUser, registeredUsers]);

  const selectedFarmer = dynamicFarmers.find((f) => f.id === selectedFarmId) || null;

  // Standard Seller Contact
  const SELLER_CONTACT = useMemo<ChatContact>(() => ({
    id: 'admin-main',
    name: 'VeggieConnect Seller',
    role: 'admin',
    farmName: 'VeggieConnect Supermarket',
    avatar: '',
    verified: true,
    isOnline: true,
    lastActive: 'Online now (Store Desk)',
  }), []);

  // Backward compatibility alias
  const BROKER_DESK_CONTACT = SELLER_CONTACT;

  // Granular available contacts list for direct messaging:
  // - Buyers ONLY chat with Seller (Admin)
  // - Farmers ONLY chat with Seller (Admin)
  // - Admin (The Seller) can chat with everyone!
  const availableContacts = useMemo<ChatContact[]>(() => {
    const contacts: ChatContact[] = [];
    const addedIds = new Set<string>();
    const myId = currentUser?.id || 'me';
    const myName = currentUser?.name ? currentUser.name.trim().toLowerCase() : '';

    if (userRole === 'admin') {
      // Admin sees all registered users (Farmers & Buyers)
      registeredUsers.forEach((user) => {
        const isMe = user.id === myId || (myName && user.name.trim().toLowerCase() === myName);
        if (!isMe && !addedIds.has(user.id)) {
          addedIds.add(user.id);
          contacts.push({
            id: user.id,
            name: user.name,
            role: user.role,
            farmName: user.farmName,
            avatar: user.avatar,
            verified: user.verified,
            isOnline: user.isOnline !== false,
            lastActive: user.lastActive || 'Active recently',
          });
        }
      });
      return contacts;
    }

    // For non-admin roles (Buyer & Farmer): ONLY include the Seller (Admin)
    contacts.push(SELLER_CONTACT);
    return contacts;
  }, [registeredUsers, currentUser, userRole, SELLER_CONTACT]);

  // Unread messages count (strictly calculated from real unread messages directed to me)
  const unreadMessagesCount = useMemo(() => {
    if (!currentUser || userRole === 'admin') return 0;
    const myId = currentUser.id;
    const myRole = userRole;

    return messages.filter((m) => {
      // Must not be sent by me
      if (m.senderId === myId) return false;
      // Must be directed to me either by recipientId or by recipientRole
      const isDirectedToMe =
        m.recipientId === myId ||
        (!m.recipientId && m.recipientRole === myRole);
      // Must be unread
      return isDirectedToMe && m.isRead === false;
    }).length;
  }, [messages, currentUser, userRole]);

  // Mark incoming messages from active chat partner as read
  useEffect(() => {
    if (!currentUser || userRole === 'admin' || !activeChatPartner) return;

    setMessages((prev) => {
      let hasUpdates = false;
      const updated = prev.map((msg) => {
        const isFromPartner =
          msg.senderId === activeChatPartner.id ||
          (msg.senderName &&
            activeChatPartner.name &&
            msg.senderName.trim().toLowerCase() === activeChatPartner.name.trim().toLowerCase());

        const isToMe =
          msg.recipientId === currentUser.id ||
          (!msg.recipientId && msg.recipientRole === userRole);

        if (isFromPartner && isToMe && msg.isRead === false) {
          hasUpdates = true;
          return { ...msg, isRead: true };
        }
        return msg;
      });

      return hasUpdates ? updated : prev;
    });
  }, [activeChatPartner, currentUser, userRole]);

  // Direct Message Sending
  const handleSendMessage = (text: string, partner: ChatContact) => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const timestamp = `${hours}:${minutes}`;

    const senderId = currentUser?.id || 'guest-user';
    const senderName = currentUser?.name || (userRole === 'admin' ? 'VeggieConnect Seller' : 'Local User');

    const newMsg: DirectMessage = {
      id: `msg-${Date.now()}`,
      senderId,
      senderName,
      senderRole: userRole,
      recipientId: partner.id,
      recipientName: partner.name,
      recipientRole: partner.role,
      text,
      timestamp,
      isRead: false,
      produceName: partner.produceContext,
      orderId: partner.orderId,
      farmerId: userRole === 'farmer' ? senderId : partner.id,
      farmerName: userRole === 'farmer' ? senderName : partner.name,
      buyerId: userRole === 'buyer' ? senderId : partner.id,
      buyerName: userRole === 'buyer' ? senderName : partner.name,
    };

    setMessages((prev) => [...prev, newMsg]);

    fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMsg),
    }).catch((e) => console.log('Message sync notice:', e));
  };

  // Central guard: ensure direct chat connects to Seller (Admin)
  const openDirectChatWith = (contact: ChatContact) => {
    // Guard against self-chat
    const isSelf = Boolean(
      currentUser &&
        (contact.id === currentUser.id ||
          contact.id === 'me' ||
          (contact.role === currentUser.role &&
            currentUser.name &&
            contact.name.trim().toLowerCase() === currentUser.name.trim().toLowerCase()))
    );

    if (isSelf) {
      showToast('Direct chat with yourself is disabled.');
      return;
    }

    setActiveChatPartner(contact);
    setIsChatBoxOpen(true);
    setIsChatMinimized(false);
    setActiveTab('messages');
    setSelectedProduce(null);
    setSelectedFarmId(null);
    showToast(`Chat with ${contact.name}`);
  };

  const handleStartDirectChat = (produceOrFarmer: ProduceItem | FarmerProfile) => {
    // Questions about produce go directly to VeggieConnect Seller
    const produceName = 'pricePerUnit' in produceOrFarmer ? produceOrFarmer.name : undefined;
    const contact: ChatContact = {
      ...SELLER_CONTACT,
      produceContext: produceName ? `${produceName} (Store Stock)` : undefined,
    };
    openDirectChatWith(contact);
  };

  // Chat from Orders view: Connects with Seller (Admin)
  const handleChatFromOrder = (order: Order) => {
    const contact: ChatContact = {
      ...SELLER_CONTACT,
      produceContext: `Order #${order.id}`,
      orderId: order.id,
    };
    openDirectChatWith(contact);
  };

  // Chat from Farmer Dashboard or Orders View — farmer chats with buyer (admin/supermarket)
  const handleChatCustomerFromFarmer = (order: Order) => {
    const contact: ChatContact = {
      ...SELLER_CONTACT,
      produceContext: `Procurement Order #${order.id}`,
      orderId: order.id,
    };
    openDirectChatWith(contact);
  };

  const handleLoginSuccess = (user: UserProfile) => {
    // Reuse the last saved GPS pin when the login response carries none
    // (legacy backend rows without latitude/longitude) so a re-login never
    // rewrites the account's profile location with a geocoded placeholder.
    let loggedInUser = user;
    if (!loggedInUser.latitude || !loggedInUser.longitude) {
      const known = [...registeredUsers, ...readCachedUsers()].find(
        (k) => k && k.id === user.id
      );
      if (known && typeof known.latitude === 'number' && typeof known.longitude === 'number') {
        loggedInUser = { ...user, latitude: known.latitude, longitude: known.longitude };
      } else {
        const c = resolveCoordinates(user.location, user.latitude, user.longitude);
        loggedInUser = { ...user, latitude: c.lat, longitude: c.lng };
      }
    }
    setCurrentUser(loggedInUser);
    setUserRole(loggedInUser.role);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(loggedInUser));
    localStorage.setItem(STORAGE_KEYS.ROLE, loggedInUser.role);

    // Update registered users registry
    setRegisteredUsers((prev) => {
      const filtered = prev.filter((u) => u.id !== loggedInUser.id);
      const updated = [...filtered, loggedInUser];
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updated));
      return updated;
    });

    if (loggedInUser.role === 'farmer') {
      setActiveTab('farmer-portal');
    } else if (loggedInUser.role === 'admin') {
      setActiveTab('admin');
      setIsAdminRoute(true);
    } else {
      setActiveTab('market');
    }
    showToast(`Welcome back, ${loggedInUser.name}!`);
  };

  // Admin user management handlers
  const handleUpdateUserFromAdmin = (updatedUser: UserProfile) => {
    setRegisteredUsers((prev) =>
      prev.map((u) => (u.id === updatedUser.id ? updatedUser : u))
    );
    if (currentUser && currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
    fetch(`/api/users/${updatedUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedUser),
    }).catch((err) => console.log('Admin update user sync notice:', err));
    showToast(`Updated profile for ${updatedUser.name}`);
  };

  const handleDeleteUserFromAdmin = (userId: string) => {
    const userToDelete = registeredUsers.find((u) => u.id === userId);

    // 1. Remove user from registered users
    const updatedUsers = registeredUsers.filter((u) => u.id !== userId);
    setRegisteredUsers(updatedUsers);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));

    // 2. Cascade delete all produce items belonging to this farmer
    setProduceList((prev) => {
      const remaining = prev.filter((p) => {
        if (p.farmerId === userId) return false;
        if (userToDelete?.farmName && p.farmName && p.farmName.trim().toLowerCase() === userToDelete.farmName.trim().toLowerCase()) return false;
        if (userToDelete?.name && p.farmerName && p.farmerName.trim().toLowerCase() === userToDelete.name.trim().toLowerCase()) return false;
        return true;
      });
      localStorage.setItem(STORAGE_KEYS.PRODUCE, JSON.stringify(remaining));
      return remaining;
    });

    // 3. Cascade remove from cart if any buyer had added these items
    setCart((prev) => {
      const remainingCart = prev.filter((item) => {
        if (item.produce.farmerId === userId) return false;
        if (userToDelete?.farmName && item.produce.farmName && item.produce.farmName.trim().toLowerCase() === userToDelete.farmName.trim().toLowerCase()) return false;
        if (userToDelete?.name && item.produce.farmerName && item.produce.farmerName.trim().toLowerCase() === userToDelete.name.trim().toLowerCase()) return false;
        return true;
      });
      localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(remainingCart));
      return remainingCart;
    });

    // 4. Send delete request to backend (cascading cleanup on server & db)
    fetch(`/api/users/${userId}`, {
      method: 'DELETE',
    }).catch((err) => console.log('Admin delete user sync notice:', err));

    showToast(`Removed ${userToDelete?.name || 'User'} and all associated produce listings.`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsChatBoxOpen(false);
    setIsChatMinimized(false);
    localStorage.removeItem(STORAGE_KEYS.USER);
    showToast('Logged out. Switched to login screen.');
  };

  // IF AT /system ROUTE: Render public Project Guide page (no login needed)
  if (isSystemRoute) {
    return <SystemGuidePage />;
  }

  // IF AT /admin ROUTE: Render Standalone Admin App
  if (isAdminRoute) {
    return (
      <div className="min-h-screen bg-neutral-100 flex flex-col">
        <AdminApp
          currentUser={currentUser}
          registeredUsers={registeredUsers}
          produceList={dynamicProduceList}
          orders={orders}
          transportJobs={transportJobs}
          messages={messages}
          onSendMessage={handleSendMessage}
          onUpdateUser={handleUpdateUserFromAdmin}
          onDeleteUser={handleDeleteUserFromAdmin}
          onUpdateProduce={handleEditProduce}
          onDeleteProduce={handleDeleteProduce}
          onBuyFarmerProduct={handleBuyFarmerProduct}
          onPutInSupermarketStock={handlePutInSupermarketStock}
          onUpdateOrderStatus={handleUpdateOrderStatus}
          onUpdateTransportJobStatus={handleUpdateTransportJobStatus}
          onAcceptTransportJob={handleAcceptTransportJob}
          onAdminLogin={(admin) => {
            handleLoginSuccess(admin);
          }}
          onAdminLogout={() => {
            handleLogout();
            handleNavigateToMain();
          }}
          onSwitchToMarketApp={handleNavigateToMain}
          onOpenMarketAppNewTab={handleOpenMarketAppNewTab}
          adminPath={adminPath}
        />
      </div>
    );
  }

  // IF NOT LOGGED IN IN COMMUNITY APP: Open directly in Login/Register Form
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-neutral-100 flex flex-col">
        <MobileFrame
          activeTab="login"
          setActiveTab={() => {}}
          userRole="buyer"
          cartCount={0}
          ordersCount={0}
          unreadMessagesCount={0}
          isLoggedIn={false}
        >
          {toastMessage && (
            <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white font-bold px-4 py-2 rounded-full text-xs shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3 duration-200">
              <CheckCircle className="w-4 h-4 text-emerald-200" />
              <span>{toastMessage}</span>
            </div>
          )}
          <LoginRegisterView
            onLoginSuccess={handleLoginSuccess}
          />
        </MobileFrame>
      </div>
    );
  }

  // Active (in-progress) orders for notification badge: Completed or cancelled orders never notify!
  const activeOrdersCount = orders.filter((o) => {
    if (o.status === 'completed' || o.status === 'cancelled') return false;

    if (userRole === 'farmer') {
      return (
        o.farmerId === currentUser?.id ||
        (o.farmName && currentUser?.farmName && o.farmName.trim().toLowerCase() === currentUser.farmName.trim().toLowerCase())
      );
    }
    // Buyer
    return (
      o.buyerId === currentUser?.id ||
      (o.buyerName && currentUser?.name && o.buyerName.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
    );
  }).length;

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col">
      <MobileFrame
        activeTab={activeTab}
        setActiveTab={handleSelectTab}
        userRole={userRole}
        cartCount={cartCount}
        ordersCount={activeOrdersCount}
        unreadMessagesCount={unreadMessagesCount}
        isLoggedIn={true}
      >
        {/* Google Maps Platform Quota Defense Top Banner */}
        {quotaExceeded && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-3.5 py-2 text-xs text-center sticky top-0 z-50 shadow-sm">
            <span>
              Google Maps Platform quota reached. If you are the app owner, visit{' '}
              <a
                href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold text-amber-950 hover:text-amber-800"
              >
                maps developer site
              </a>{' '}
              for instructions to update your account.
            </span>
          </div>
        )}

        {/* Toast Notification Pill */}
        {toastMessage && (
          <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white font-bold px-4 py-2 rounded-full text-xs shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3 duration-200">
            <CheckCircle className="w-4 h-4 text-emerald-200" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Main Header with Dumaguete, Auth, and Logout */}
        <Header
          userRole={userRole}
          activeLocation={currentLocation}
          onLocationClick={() => setShowLocationModal(true)}
          onNotificationClick={() => showToast('Fresh harvest routes active across Dumaguete & Valencia!')}
          onOpenPriceWatch={() => {
            setGlobalPriceWatchSearch('');
            setIsGlobalPriceWatchOpen(true);
          }}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {/* Views based on active tab for community roles */}
          {activeTab === 'market' && (
            <ErrorBoundary fallbackTitle="Unable to load Market view">
              <BuyerMarketView
                produceList={dynamicProduceList}
                onSelectProduce={(prod) => setSelectedProduce(prod)}
                onAddToCart={handleAddToCart}
                cartItemIds={cartItemIds}
                isBuyer={userRole === 'buyer'}
              />
            </ErrorBoundary>
          )}

          {activeTab === 'farms' && (
            <ErrorBoundary fallbackTitle="Unable to load Sourcing Hubs">
              <FarmDirectoryView
                produceList={dynamicProduceList}
                currentUser={currentUser}
                onOpenSellerChat={() => {
                  setActiveChatPartner(SELLER_CONTACT);
                  setIsChatBoxOpen(true);
                  setIsChatMinimized(false);
                }}
                onOpenDAPrices={() => setIsGlobalPriceWatchOpen(true)}
              />
            </ErrorBoundary>
          )}

          {activeTab === 'cart' && (
            <CartDrawer
              cart={cart}
              currentUser={currentUser}
              onUpdateQuantity={handleUpdateCartQuantity}
              onRemoveItem={handleRemoveFromCart}
              onClearCart={handleClearCart}
              onOrderPlaced={handleOrderPlaced}
              onClose={() => handleSelectTab('market')}
            />
          )}

          {activeTab === 'orders' && (
            <OrdersView
              orders={orders}
              userRole={userRole}
              currentUser={currentUser}
              registeredUsers={registeredUsers}
              initialFilter={ordersInitialFilter}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onChatWithParty={handleChatFromOrder}
            />
          )}

          {activeTab === 'farmer-portal' && (
            <FarmerDashboardView
              farmer={currentFarmer}
              produceList={dynamicProduceList}
              orders={orders}
              currentUser={currentUser}
              registeredUsers={registeredUsers}
              onOpenAddProduce={() => {
                setEditingProduce(null);
                setIsAddProduceOpen(true);
              }}
              onOpenEditProduce={(produce) => {
                setEditingProduce(produce);
              }}
              onOpenEditProfile={() => setShowEditProfileModal(true)}
              onNavigateToCompletedOrders={() => {
                setOrdersInitialFilter('completed');
                setActiveTab('orders');
              }}
              onUpdateProduceStock={handleUpdateProduceStock}
              onUpdateProducePrice={handleUpdateProducePrice}
              onDeleteProduce={handleDeleteProduce}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onChatWithCustomer={handleChatCustomerFromFarmer}
              onLogout={handleLogout}
            />
          )}

          {activeTab === 'messages' && (
            <DirectChatModal
              userRole={userRole}
              currentUser={currentUser}
              activePartner={activeChatPartner}
              messages={messages}
              onSendMessage={handleSendMessage}
              onSelectPartner={(partner) => {
                setActiveChatPartner(partner);
                setIsChatBoxOpen(true);
                setIsChatMinimized(false);
              }}
              availableContacts={availableContacts}
              isChatBoxOpen={isChatBoxOpen}
              setIsChatBoxOpen={setIsChatBoxOpen}
              onCloseChatBox={() => {
                setIsChatBoxOpen(false);
                setActiveChatPartner(null);
              }}
            />
          )}

          {activeTab === 'profile' && currentUser && (
            <ProfileMenuView
              currentUser={currentUser}
              onSaveProfile={handleSaveProfile}
              onLogout={handleLogout}
              onNavigateTab={(tab) => handleSelectTab(tab)}
              currentLocation={currentLocation}
              onLocationClick={() => setShowLocationModal(true)}
            />
          )}

      {/* Produce Detail Modal */}
      {selectedProduce && (
        <ProduceDetailModal
          produce={dynamicProduceList.find((p) => p.id === selectedProduce.id) || selectedProduce}
          farmer={dynamicFarmers.find((f) => f.id === selectedProduce.farmerId)}
          currentUser={currentUser}
          registeredUsers={registeredUsers}
          onClose={() => setSelectedProduce(null)}
          onAddToCart={(prod, qty) => handleAddToCart(prod, qty)}
          onDirectChat={handleStartDirectChat}
          onViewFarm={(fId) => {
            setSelectedProduce(null);
            setSelectedFarmId(fId);
          }}
          isInCart={cartItemIds.has(selectedProduce.id)}
          isBuyer={userRole === 'buyer'}
          onEditProduce={(prod) => {
            setSelectedProduce(null);
            setEditingProduce(prod);
          }}
        />
      )}

      {/* Farm Profile Modal */}
      {selectedFarmId && (
        <FarmProfileModal
          farmer={selectedFarmer}
          produceList={dynamicProduceList}
          currentUser={currentUser}
          registeredUsers={registeredUsers}
          onClose={() => setSelectedFarmId(null)}
          onSelectProduce={(prod) => setSelectedProduce(prod)}
          onAddToCart={handleAddToCart}
          onDirectChat={handleStartDirectChat}
          cartItemIds={cartItemIds}
          isBuyer={userRole === 'buyer'}
        />
      )}

      {/* Farmer Add / Edit Harvest Listing Modal */}
      {(isAddProduceOpen || editingProduce !== null) && (
        <AddProduceModal
          initialProduce={editingProduce}
          onClose={() => {
            setIsAddProduceOpen(false);
            setEditingProduce(null);
          }}
          onAddProduce={handleAddProduce}
          onEditProduce={handleEditProduce}
          farmerId={editingProduce ? editingProduce.farmerId : currentFarmer.id}
          farmerName={editingProduce ? editingProduce.farmerName : currentFarmer.name}
          farmName={editingProduce ? editingProduce.farmName : currentFarmer.farmName}
          farmerLocation={editingProduce ? editingProduce.location : currentFarmer.location}
          farmerLatitude={editingProduce ? editingProduce.latitude : currentFarmer.latitude}
          farmerLongitude={editingProduce ? editingProduce.longitude : currentFarmer.longitude}
          distanceKm={editingProduce ? editingProduce.distanceKm : currentFarmer.distanceKm}
        />
      )}

      {/* Edit User Account Profile Modal */}
      {showEditProfileModal && currentUser && (
        <EditProfileModal
          currentUser={currentUser}
          onClose={() => setShowEditProfileModal(false)}
          onSaveProfile={handleSaveProfile}
        />
      )}

      {/* Realtime Google Map Address Picker Modal */}
      {showLocationModal && (
        <AddressMapPickerModal
          onClose={() => setShowLocationModal(false)}
          initialAddress={currentUser?.location || currentLocation}
          initialLat={currentUser?.latitude}
          initialLng={currentUser?.longitude}
          title="Pin Exact House / Delivery Address"
          subtitle="Click on map or drag pin to update real-time km distance to farms"
          onConfirmLocation={(newAddress, lat, lng) => {
            setCurrentLocation(newAddress);
            if (currentUser) {
              const updated: UserProfile = {
                ...currentUser,
                location: newAddress,
                latitude: lat,
                longitude: lng,
              };
              handleSaveProfile(updated);
            }
            setShowLocationModal(false);
            showToast(`Location pinned: ${newAddress}`);
          }}
        />
      )}

      {/* Global DA Price Watch Modal (accessible from Header or anywhere in app) */}
      {isGlobalPriceWatchOpen && (
        <DAPriceWatchModal
          onClose={() => setIsGlobalPriceWatchOpen(false)}
          initialSearch={globalPriceWatchSearch}
        />
      )}

      </MobileFrame>
    </div>
  );
}
