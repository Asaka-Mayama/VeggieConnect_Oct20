// Real-time synchronization bus between VeggieConnect Community App and VeggieConnect Admin App

type SyncEventType =
  | 'USERS_UPDATED'
  | 'PRODUCE_UPDATED'
  | 'ORDERS_UPDATED'
  | 'JOBS_UPDATED'
  | 'MESSAGES_UPDATED'
  | 'BROADCAST_ANNOUNCEMENT';

interface SyncPayload {
  type: SyncEventType;
  data?: any;
  timestamp: number;
  sourceApp: 'market' | 'admin';
}

class AppSyncBus {
  private channel: BroadcastChannel | null = null;
  private listeners: Map<SyncEventType, Set<(payload: SyncPayload) => void>> = new Map();

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('veggieconnect_live_sync_v1');
        this.channel.onmessage = (event: MessageEvent<SyncPayload>) => {
          this.notifyListeners(event.data);
        };
      } catch (e) {
        console.warn('BroadcastChannel not available, falling back to storage events', e);
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'veggieconnect_sync_event' && e.newValue) {
          try {
            const payload: SyncPayload = JSON.parse(e.newValue);
            this.notifyListeners(payload);
          } catch (err) {
            console.error('Failed to parse sync event', err);
          }
        }
      });
    }
  }

  public publish(type: SyncEventType, data?: any, sourceApp: 'market' | 'admin' = 'market') {
    const payload: SyncPayload = {
      type,
      data,
      timestamp: Date.now(),
      sourceApp,
    };

    // Broadcast via BroadcastChannel
    if (this.channel) {
      try {
        this.channel.postMessage(payload);
      } catch (e) {
        console.error('Failed to postMessage to BroadcastChannel', e);
      }
    }

    // Trigger local listeners too
    this.notifyListeners(payload);

    // Also write to localStorage to trigger cross-tab storage listeners
    try {
      localStorage.setItem('veggieconnect_sync_event', JSON.stringify(payload));
    } catch (e) {}
  }

  public subscribe(type: SyncEventType, callback: (payload: SyncPayload) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);

    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }

  private notifyListeners(payload: SyncPayload) {
    const callbacks = this.listeners.get(payload.type);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(payload);
        } catch (e) {
          console.error('Error in sync listener', e);
        }
      });
    }
  }
}

export const appSync = new AppSyncBus();
