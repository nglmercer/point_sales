import { syncController } from '../fetch/sync';
import { emitter } from '../Emitter';
import type { StoreName } from '../idb/types';

interface SyncChange {
  storeName: StoreName;
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: string;
  synced: boolean;
  retries: number;
  localVersion: number;
}

interface SyncQueueItem extends SyncChange {
  id: string;
}

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  storeVersions: Record<StoreName, number>;
  pendingChanges: number;
  syncInProgress: Set<string>;
}

interface SyncStats {
  totalSynced: number;
  totalFailed: number;
  lastSyncTime: string | null;
  pendingChanges: number;
}

class SyncManager {
  private syncQueue: Map<string, SyncQueueItem> = new Map();
  private state: SyncState = {
    isOnline: navigator.onLine,
    isSyncing: false,
    storeVersions: {} as Record<StoreName, number>,
    pendingChanges: 0,
    syncInProgress: new Set()
  };
  private syncStats: SyncStats = {
    totalSynced: 0,
    totalFailed: 0,
    lastSyncTime: null,
    pendingChanges: 0
  };
  private initialized = false;
  private syncIntervalId: number | null = null;
  private readonly SYNC_INTERVAL = 30000;
  private readonly MAX_RETRIES = 3;
  private readonly CLIENT_ID = this.generateClientId();

  constructor() {
    this.setupEventListeners();
    this.loadPersistedQueue();
  }

  private generateClientId(): string {
    const stored = localStorage.getItem('sync_client_id');
    if (stored) return stored;
    
    const newId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('sync_client_id', newId);
    return newId;
  }

  async initialize() {
    if (this.initialized) {
      console.log('⚠️ SyncManager already initialized');
      return;
    }

    console.log('🔄 Initializing SyncManager...');
    
    this.loadStoreVersions();
    this.startAutoSync();
    
    if (this.state.isOnline) {
      await this.performFullSync();
    }
    
    this.initialized = true;
    console.log('✅ SyncManager initialized');
    
    emitter.emit('sync:initialized', {
      clientId: this.CLIENT_ID,
      isOnline: this.state.isOnline
    });
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  private setupEventListeners() {
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  private handleOnline() {
    console.log('🌐 Connection restored');
    this.state.isOnline = true;
    emitter.emit('sync:online', this.state);
    
    this.syncPendingChanges();
  }

  private handleOffline() {
    console.log('📴 Connection lost');
    this.state.isOnline = false;
    emitter.emit('sync:offline', this.state);
  }

  async trackChange(
    storeName: StoreName,
    action: 'create' | 'update' | 'delete',
    data: any
  ): Promise<void> {
    const changeId = `${storeName}-${action}-${data.id}-${Date.now()}`;
    
    const change: SyncQueueItem = {
      id: changeId,
      storeName,
      action,
      data: {
        ...data,
        clientId: this.CLIENT_ID
      },
      timestamp: new Date().toISOString(),
      synced: false,
      retries: 0,
      localVersion: this.state.storeVersions[storeName] || 0
    };

    this.syncQueue.set(changeId, change);
    this.state.pendingChanges = this.syncQueue.size;
    this.syncStats.pendingChanges = this.syncQueue.size;

    this.persistQueue();

    console.log(`📝 Change tracked: ${storeName}.${action} (${changeId})`);

    if (this.state.isOnline && !this.state.isSyncing) {
      await this.syncPendingChanges();
    }

    emitter.emit('sync:change-tracked', {
      changeId,
      storeName,
      action,
      pendingChanges: this.state.pendingChanges
    });
  }

  async syncPendingChanges(): Promise<void> {
    if (this.state.isSyncing || !this.state.isOnline || this.syncQueue.size === 0) {
      return;
    }

    this.state.isSyncing = true;
    console.log(`🔄 Syncing ${this.syncQueue.size} pending changes...`);
    
    try {
      const changes = Array.from(this.syncQueue.values());
      const changesByStore = this.groupChangesByStore(changes);

      for (const [storeName, storeChanges] of Object.entries(changesByStore)) {
        await this.syncStoreChanges(storeName as StoreName, storeChanges);
      }
      
      if (this.syncQueue.size === 0) {
        console.log('✅ All changes synced successfully');
        emitter.emit('sync:all-synced', this.state);
      }
    } catch(error) {
        console.error('❌ An unexpected error occurred during syncPendingChanges:', error);
    } finally {
      this.state.isSyncing = false;
    }
  }



  private groupChangesByStore(changes: SyncQueueItem[]): Record<string, SyncQueueItem[]> {
    return changes.reduce((acc, change) => {
      if (!acc[change.storeName]) {
        acc[change.storeName] = [];
      }
      acc[change.storeName].push(change);
      return acc;
    }, {} as Record<string, SyncQueueItem[]>);
  }


  private async syncStoreChanges(
    storeName: StoreName,
    changes: SyncQueueItem[]
  ): Promise<void> {
    const creates = changes.filter(c => c.action === 'create');
    const updates = changes.filter(c => c.action === 'update');
    const deletes = changes.filter(c => c.action === 'delete');

    try {
      // Sincronizar creaciones y actualizaciones en bloque
      if (creates.length > 0 || updates.length > 0) {
        const dataToSync = [...creates, ...updates].map(c => c.data);
        const currentVersion = this.state.storeVersions[storeName] || 0;
        
        try {
          const result = await syncController.syncLocalChanges(
            storeName,
            dataToSync,
            this.CLIENT_ID,
            currentVersion,
            'field-level-merge'
          );

          console.log(`✅ Bulk sync for ${storeName}:`, result);

          if (result.version && result.version > currentVersion) {
            this.state.storeVersions[storeName] = result.version;
            this.saveStoreVersion(storeName);
          }

          // Si la sincronización fue exitosa, limpiamos los cambios de la cola
          [...creates, ...updates].forEach(change => {
            this.syncQueue.delete(change.id);
            this.syncStats.totalSynced++;
          });

        } catch (error: any) {
          // Capturamos el error específico de la API, que puede ser un 409 Conflict
          if (error.response?.data?.needsFullSync) {
            console.warn(`⚠️ Version conflict for ${storeName}. Server demands full sync.`);
            
            // El servidor rechazó nuestros cambios. Están obsoletos.
            // Limpiamos los cambios que intentamos enviar.
            [...creates, ...updates].forEach(change => {
              this.syncQueue.delete(change.id);
            });
            this.syncStats.totalFailed += (creates.length + updates.length);
            
            // Forzamos la resincronización desde el servidor
            this.resetStoreVersion(storeName);
            await this.syncStoreFromServer(storeName);
            
            // Salimos de esta función para no procesar borrados, ya que el estado es inconsistente
            return; 
          } else {
            // Fue otro tipo de error, lo manejamos como antes
            console.error(`❌ Error syncing bulk changes for ${storeName}:`, error);
            for (const change of [...creates, ...updates]) {
              await this.handleSyncError(change, error);
            }
          }
        }
      }

      // Sincronizar borrados individualmente
      for (const deleteChange of deletes) {
        try {
          const result = await syncController.deleteSync(storeName, deleteChange.data.id);
          
          if (result.version > (this.state.storeVersions[storeName] || 0) ) {
            this.state.storeVersions[storeName] = result.version;
            this.saveStoreVersion(storeName);
          }
          
          this.syncQueue.delete(deleteChange.id);
          this.syncStats.totalSynced++;
          console.log(`✅ Delete synced: ${storeName}.${deleteChange.data.id}`);
        } catch (error) {
          await this.handleSyncError(deleteChange, error);
        }
      }

    } finally {
      // Este bloque finally no es estrictamente necesario aquí si el estado se maneja en el llamador
      // pero es una buena práctica
      this.state.pendingChanges = this.syncQueue.size;
      this.syncStats.pendingChanges = this.syncQueue.size;
      this.syncStats.lastSyncTime = new Date().toISOString();
      this.persistQueue();
    }
  }

  private async handleSyncError(change: SyncQueueItem, error: any): Promise<void> {
    change.retries++;

    if (change.retries >= this.MAX_RETRIES) {
      console.error(`❌ Max retries reached for ${change.id}, removing from queue`);
      this.syncQueue.delete(change.id);
      this.syncStats.totalFailed++;
      
      emitter.emit('sync:change-failed', {
        change,
        error: error.message
      });
    } else {
      console.warn(`⚠️ Retry ${change.retries}/${this.MAX_RETRIES} for ${change.id}`);
      this.syncQueue.set(change.id, change);
    }
  }

  async performFullSync(): Promise<void> {
    if (this.state.isSyncing || !this.state.isOnline) {
      console.log('⏸️ Cannot perform full sync: already syncing or offline');
      return;
    }

    this.state.isSyncing = true;
    console.log('🔄 Starting full sync...');

    try {
      const stores: StoreName[] = ['products', 'tickets', 'customers'];

      for (const storeName of stores) {
        await this.syncStoreFromServer(storeName);
      }

      console.log('✅ Full sync completed');
      emitter.emit('sync:full-completed', {
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Full sync failed:', error);
      emitter.emit('sync:full-failed', { error });
    } finally {
      this.state.isSyncing = false; // Aseguramos que el estado se restablezca
    }
  }

  async syncStoreFromServer(storeName: StoreName): Promise<void> {
    try {
      const currentVersion = this.state.storeVersions[storeName] || 0;

      let serverData: any[];
      let serverVersion: number;

      if (currentVersion > 0) {
        console.log(`📥 Incremental sync for ${storeName} from version ${currentVersion}`);
        const response = await syncController.getSyncFromVersion(storeName, currentVersion);
        serverData = response.data;
        serverVersion = response.currentVersion;
        
        // ✅ VALIDA VERSIÓN DEL SERVIDOR
        if (!serverVersion || serverVersion < currentVersion) {
          console.warn(`⚠️ Server version (${serverVersion}) < local (${currentVersion}), using local`);
          serverVersion = currentVersion;
        }
        
        console.log(`📥 Server version: ${serverVersion}, changes: ${serverData.length}`);
      } else {
        console.log(`📥 Full sync for ${storeName} (first time)`);
        const response = await syncController.getSync(storeName);
        serverData = response.data;
        serverVersion = response.version || 0;
      }

      if (serverVersion > currentVersion) {
        this.state.storeVersions[storeName] = serverVersion;
        this.saveStoreVersion(storeName);
        console.log(`✅ Updated ${storeName} version: ${currentVersion} → ${serverVersion}`);
      }

      if (serverData && serverData.length > 0) {
        console.log(`📥 Emitting ${serverData.length} items for ${storeName}`);
        emitter.emit('sync:server-data-received', {
          storeName,
          count: serverData.length,
          data: serverData,
          version: serverVersion
        });
      } else {
        console.log(`📥 No data to sync for ${storeName}`);
      }

    } catch (error) {
      console.error(`❌ Error syncing ${storeName} from server:`, error);
      throw error;
    }
  }

  startAutoSync() {
    if (this.syncIntervalId) {
      console.log('⚠️ Auto-sync already running');
      return;
    }

    console.log(`🔄 Starting auto-sync (interval: ${this.SYNC_INTERVAL}ms)`);
    
    this.syncIntervalId = window.setInterval(() => {
      if (this.state.isOnline && !this.state.isSyncing) {
        this.syncPendingChanges();
        
        const now = Date.now();
        const lastSync = this.syncStats.lastSyncTime 
          ? new Date(this.syncStats.lastSyncTime).getTime() 
          : 0;
        
        if (now - lastSync > 5 * 60 * 1000) {
          this.performFullSync();
        }
      }
    }, this.SYNC_INTERVAL);
  }

  stopAutoSync() {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
      console.log('⏸️ Auto-sync stopped');
    }
  }

  private persistQueue() {
    try {
      const queueData = Array.from(this.syncQueue.entries());
      localStorage.setItem('sync_queue', JSON.stringify(queueData));
    } catch (error) {
      console.error('❌ Error persisting queue:', error);
    }
  }

  private loadPersistedQueue() {
    try {
      const stored = localStorage.getItem('sync_queue');
      if (stored) {
        const queueData = JSON.parse(stored);
        this.syncQueue = new Map(queueData);
        this.state.pendingChanges = this.syncQueue.size;
        console.log(`📦 Loaded ${this.syncQueue.size} pending changes from storage`);
      }
    } catch (error) {
      console.error('❌ Error loading persisted queue:', error);
    }
  }

  private saveStoreVersion(storeName: StoreName) {
    try {
      localStorage.setItem(
        `sync_version_${storeName}`,
        this.state.storeVersions[storeName].toString()
      );
    } catch (error) {
      console.error('❌ Error saving store version:', error);
    }
  }

  private loadStoreVersions() {
      const stores: StoreName[] = ['products', 'tickets', 'customers'];
      stores.forEach(storeName => {
          const version = localStorage.getItem(`sync_version_${storeName}`);
          if (version) {
              this.state.storeVersions[storeName] = parseInt(version, 10);
              console.log(`📌 Loaded ${storeName} version: ${this.state.storeVersions[storeName]}`);
          } else {
              this.state.storeVersions[storeName] = 0;
          }
      });
  }

  getState(): SyncState {
    return { ...this.state };
  }

  getStats(): SyncStats {
    return { ...this.syncStats };
  }

  getPendingChanges(): SyncQueueItem[] {
    return Array.from(this.syncQueue.values());
  }

  clearQueue() {
    this.syncQueue.clear();
    this.state.pendingChanges = 0;
    this.syncStats.pendingChanges = 0;
    this.persistQueue();
    console.log('🗑️ Sync queue cleared');
  }

  async forceSyncStore(storeName: StoreName): Promise<void> {
    console.log(`🔄 Force syncing ${storeName}...`);
    await this.syncStoreFromServer(storeName);
  }

  async forceSyncAll(): Promise<void> {
    console.log('🔄 Force syncing all stores...');
    await this.performFullSync();
  }

  getStoreVersion(storeName: StoreName): number {
    return this.state.storeVersions[storeName] || 0;
  }

  resetStoreVersion(storeName: StoreName) {
    this.state.storeVersions[storeName] = 0;
    this.saveStoreVersion(storeName);
    console.log(`🔄 Reset ${storeName} version to 0`);
  }
}

export const syncManager = new SyncManager();

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      syncManager.initialize();
    });
  } else {
    syncManager.initialize();
  }
}