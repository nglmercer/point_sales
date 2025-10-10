// src/utils/syncManager.ts
import { SyncController } from './syncController';
import { dbManager } from './StoreManager';
import type { SyncConfig, StoreName } from './types';

/**
 * LocalStorage keys for backup and sync metadata
 */
const STORAGE_KEYS = {
  BACKUP: 'sync_backup_',
  LAST_SYNC: 'sync_last_sync_',
  SYNC_METADATA: 'sync_metadata',
  PENDING_CHANGES: 'sync_pending_changes_'
} as const;

/**
 * Sync metadata stored in localStorage
 */
interface SyncMetadata {
  lastFullSync: string | null;
  lastIncrementalSync: string | null;
  totalSyncs: number;
  lastBackup: string | null;
  storeSyncTimestamps: Record<StoreName, string>;
}

/**
 * Pending changes queue for offline support
 */
interface PendingChange {
  id: string;
  storeName: StoreName;
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: string;
}

/**
 * Enhanced SyncManager with automatic sync, backup, and timestamp tracking
 */
class SyncManager {
  private controller: SyncController | null = null;
  private initialized = false;
  private autoSyncInterval: NodeJS.Timeout | null = null;
  private autoBackupInterval: NodeJS.Timeout | null = null;
  private config: SyncConfig | null = null;
  private pendingChanges: Map<string, PendingChange> = new Map();

  /**
   * Initialize the sync manager with configuration
   */
  async initialize(config: SyncConfig): Promise<SyncController> {
    if (this.controller) {
      return this.controller;
    }

    this.config = config;
    const manager = await dbManager;
    this.controller = new SyncController(config, manager);
    this.initialized = true;

    // Load pending changes from localStorage
    this.loadPendingChanges();

    // Check initial connection
    await this.controller.checkConnection();

    // Initialize metadata if not exists
    this.initializeMetadata();

    // Start auto sync if configured
    if (config.autoSync) {
      this.startAutoSync(config.syncInterval || 30000);
    }

    // Start auto backup (every 5 minutes by default)
    this.startAutoBackup(config.backupInterval || 300000);

    // Listen for online/offline events
    this.setupConnectionListeners();

    return this.controller;
  }
  /**
   * Initialize sync metadata in localStorage
   */
  private initializeMetadata(): void {
    const existing = this.getMetadata();
    if (!existing) {
      const metadata: SyncMetadata = {
        lastFullSync: null,
        lastIncrementalSync: null,
        totalSyncs: 0,
        lastBackup: null,
        storeSyncTimestamps: {
          products: new Date().toISOString(),
          tickets: new Date().toISOString(),
          customers: new Date().toISOString()
        }
      };
      localStorage.setItem(STORAGE_KEYS.SYNC_METADATA, JSON.stringify(metadata));
    }
  }

  /**
   * Get sync metadata from localStorage
   */
  private getMetadata(): SyncMetadata | null {
    const data = localStorage.getItem(STORAGE_KEYS.SYNC_METADATA);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Update sync metadata
   */
  private updateMetadata(updates: Partial<SyncMetadata>): void {
    const current = this.getMetadata() || this.getDefaultMetadata();
    const updated = { ...current, ...updates };
    localStorage.setItem(STORAGE_KEYS.SYNC_METADATA, JSON.stringify(updated));
  }

  /**
   * Get default metadata structure
   */
  private getDefaultMetadata(): SyncMetadata {
    return {
      lastFullSync: null,
      lastIncrementalSync: null,
      totalSyncs: 0,
      lastBackup: null,
      storeSyncTimestamps: {
        products: new Date().toISOString(),
        tickets: new Date().toISOString(),
        customers: new Date().toISOString()
      }
    };
  }

  /**
   * Save backup to localStorage with compression
   */
  private async saveBackupToLocalStorage(storeName: StoreName): Promise<void> {
    try {
      const manager = await dbManager;
      const data = await manager.store(storeName).getAll();
      
      const backup = {
        storeName,
        data,
        timestamp: new Date().toISOString(),
        count: data.length
      };

      localStorage.setItem(
        `${STORAGE_KEYS.BACKUP}${storeName}`,
        JSON.stringify(backup)
      );

      console.log(`✅ Backup saved for ${storeName}: ${data.length} items`);
    } catch (error) {
      console.error(`❌ Failed to save backup for ${storeName}:`, error);
    }
  }

  /**
   * Load backup from localStorage
   */
  private loadBackupFromLocalStorage(storeName: StoreName): any[] | null {
    try {
      const data = localStorage.getItem(`${STORAGE_KEYS.BACKUP}${storeName}`);
      if (!data) return null;

      const backup = JSON.parse(data);
      console.log(`📦 Loaded backup for ${storeName}: ${backup.count} items from ${backup.timestamp}`);
      return backup.data;
    } catch (error) {
      console.error(`❌ Failed to load backup for ${storeName}:`, error);
      return null;
    }
  }

  /**
   * Queue a pending change for later sync
   */
  private queuePendingChange(change: Omit<PendingChange, 'id' | 'timestamp'>): void {
    const id = `${change.storeName}_${change.action}_${Date.now()}_${Math.random()}`;
    const timestamp = new Date().toISOString();
    
    const pendingChange: PendingChange = { id, timestamp, ...change };
    this.pendingChanges.set(id, pendingChange);
    
    // Save to localStorage
    this.savePendingChanges();
  }

  /**
   * Save pending changes to localStorage
   */
  private savePendingChanges(): void {
    const changes = Array.from(this.pendingChanges.values());
    localStorage.setItem(STORAGE_KEYS.PENDING_CHANGES + 'queue', JSON.stringify(changes));
  }

  /**
   * Load pending changes from localStorage
   */
  private loadPendingChanges(): void {
    const data = localStorage.getItem(STORAGE_KEYS.PENDING_CHANGES + 'queue');
    if (data) {
      const changes: PendingChange[] = JSON.parse(data);
      changes.forEach(change => {
        this.pendingChanges.set(change.id, change);
      });
      console.log(`📋 Loaded ${changes.length} pending changes`);
    }
  }

  /**
   * Process pending changes queue
   */
  private async processPendingChanges(): Promise<void> {
    if (this.pendingChanges.size === 0) return;

    console.log(`🔄 Processing ${this.pendingChanges.size} pending changes...`);
    const controller = this.getController();
    const processed: string[] = [];

    for (const [id, change] of this.pendingChanges) {
      try {
        switch (change.action) {
          case 'create':
          case 'update':
            await controller.updateItemOnServer(change.storeName, change.data.id, change.data);
            break;
          case 'delete':
            await controller.deleteItemFromServer(change.storeName, change.data.id);
            break;
        }
        processed.push(id);
      } catch (error) {
        console.error(`❌ Failed to process pending change ${id}:`, error);
      }
    }

    // Remove processed changes
    processed.forEach(id => this.pendingChanges.delete(id));
    this.savePendingChanges();

    console.log(`✅ Processed ${processed.length} pending changes`);
  }

  /**
   * Setup online/offline connection listeners
   */
  private setupConnectionListeners(): void {
    window.addEventListener('online', async () => {
      console.log('🌐 Connection restored, syncing...');
      await this.processPendingChanges();
      await this.syncAll();
    });

    window.addEventListener('offline', () => {
      console.log('📴 Connection lost, changes will be queued');
    });
  }

  /**
   * Start automatic synchronization
   */
  startAutoSync(interval: number = 30000): void {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
    }

    console.log(`🔄 Starting auto-sync every ${interval / 1000}s`);

    this.autoSyncInterval = setInterval(async () => {
      const status = this.getStatus();
      if (status.isConnected && !status.isPending) {
        try {
          await this.incrementalSyncAll();
        } catch (error) {
          console.error('❌ Auto-sync error:', error);
        }
      }
    }, interval);
  }

  /**
   * Start automatic backup
   */
  startAutoBackup(interval: number = 300000): void {
    if (this.autoBackupInterval) {
      clearInterval(this.autoBackupInterval);
    }

    console.log(`💾 Starting auto-backup every ${interval / 1000}s`);

    this.autoBackupInterval = setInterval(async () => {
      try {
        await this.createLocalBackup();
      } catch (error) {
        console.error('❌ Auto-backup error:', error);
      }
    }, interval);
  }

  /**
   * Create local backup for all stores
   */
  async createLocalBackup(): Promise<void> {
    const stores: StoreName[] = ['products', 'tickets', 'customers'];
    
    for (const store of stores) {
      await this.saveBackupToLocalStorage(store);
    }

    this.updateMetadata({ lastBackup: new Date().toISOString() });
    console.log('✅ Local backup completed');
  }

  /**
   * Incremental sync using timestamps (only sync changes since last sync)
   */
  async incrementalSyncAll(): Promise<void> {
    const metadata = this.getMetadata();
    if (!metadata) return;

    const stores: StoreName[] = ['products', 'tickets', 'customers'];
    const controller = this.getController();

    console.log('🔄 Starting incremental sync...');

    for (const storeName of stores) {
      try {
        const lastSync = metadata.storeSyncTimestamps[storeName];
        
        // Pull changes from server since last sync
        const url = `${this.config?.serverUrl}/api/sync/${this.config?.dbName}/${storeName}/since/${lastSync}`;
        const response = await fetch(url);
        
        if (response.ok) {
          const result = await response.json();
          
          if (result.data && result.data.length > 0) {
            const manager = await dbManager;
            const store = manager.store(storeName);
            
            // Update local store with server changes
            for (const item of result.data) {
              await store.update(item);
            }
            
            console.log(`✅ Synced ${result.data.length} changes for ${storeName}`);
          }
        }

        // Update timestamp
        metadata.storeSyncTimestamps[storeName] = new Date().toISOString();
      } catch (error) {
        console.error(`❌ Failed to sync ${storeName}:`, error);
      }
    }

    // Process any pending changes
    await this.processPendingChanges();

    // Update metadata
    this.updateMetadata({
      lastIncrementalSync: new Date().toISOString(),
      totalSyncs: metadata.totalSyncs + 1,
      storeSyncTimestamps: metadata.storeSyncTimestamps
    });

    console.log('✅ Incremental sync completed');
  }

  /**
   * Full sync (pull and push all data)
   */
  async syncAll(): Promise<any> {
    const controller = this.getController();
    const result = await controller.syncAll();
    
    const metadata = this.getMetadata();
    if (metadata) {
      this.updateMetadata({
        lastFullSync: new Date().toISOString(),
        totalSyncs: metadata.totalSyncs + 1
      });
    }

    // Create backup after successful sync
    await this.createLocalBackup();

    console.log('✅ Full sync completed');
    return result;
  }

  /**
   * Sync a specific store with auto-backup
   */
  async syncStore(storeName: StoreName): Promise<void> {
    const controller = this.getController();
    await controller.syncStore(storeName);
    
    // Update timestamp for this store
    const metadata = this.getMetadata();
    if (metadata) {
      metadata.storeSyncTimestamps[storeName] = new Date().toISOString();
      this.updateMetadata(metadata);
    }

    // Backup this store
    await this.saveBackupToLocalStorage(storeName);
  }

  /**
   * Track item changes for automatic sync
   */
  async trackChange(
    storeName: StoreName,
    action: 'create' | 'update' | 'delete',
    data: any
  ): Promise<void> {
    const controller = this.getController();
    const status = controller.getStatus();

    if (status.isConnected) {
      // Sync immediately if connected
      try {
        switch (action) {
          case 'create':
          case 'update':
            await controller.updateItemOnServer(storeName, data.id, data);
            break;
          case 'delete':
            await controller.deleteItemFromServer(storeName, data.id);
            break;
        }
      } catch (error) {
        console.error('❌ Failed to sync change:', error);
        this.queuePendingChange({ storeName, action, data });
      }
    } else {
      // Queue for later if offline
      this.queuePendingChange({ storeName, action, data });
    }
  }

  /**
   * Restore from local backup
   */
  async restoreFromLocalBackup(storeName: StoreName): Promise<boolean> {
    const backupData = this.loadBackupFromLocalStorage(storeName);
    if (!backupData) {
      console.error(`❌ No backup found for ${storeName}`);
      return false;
    }

    try {
      const manager = await dbManager;
      const store = manager.store(storeName);
      
      // Clear and restore
      await store.clear();
      await store.addMany(backupData);
      
      console.log(`✅ Restored ${backupData.length} items for ${storeName}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to restore backup for ${storeName}:`, error);
      return false;
    }
  }

  /**
   * Get current controller instance
   */
  getController(): SyncController {
    if (!this.controller) {
      throw new Error('SyncManager not initialized. Call initialize() first.');
    }
    return this.controller;
  }

  /**
   * Check if sync manager is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get sync status with metadata
   */
  getStatus() {
    const controller = this.getController();
    const metadata = this.getMetadata();
    return {
      ...controller.getStatus(),
      metadata,
      pendingChanges: this.pendingChanges.size
    };
  }

  /**
   * Get backup info
   */
  getBackupInfo(): Record<StoreName, any> {
    const stores: StoreName[] = ['products', 'tickets', 'customers'];
    const info: any = {};

    stores.forEach(store => {
      const data = localStorage.getItem(`${STORAGE_KEYS.BACKUP}${store}`);
      if (data) {
        const backup = JSON.parse(data);
        info[store] = {
          timestamp: backup.timestamp,
          count: backup.count
        };
      }
    });

    return info;
  }

  /**
   * Clear all local backups and metadata
   */
  clearAllBackups(): void {
    const stores: StoreName[] = ['products', 'tickets', 'customers'];
    stores.forEach(store => {
      localStorage.removeItem(`${STORAGE_KEYS.BACKUP}${store}`);
    });
    localStorage.removeItem(STORAGE_KEYS.SYNC_METADATA);
    localStorage.removeItem(STORAGE_KEYS.PENDING_CHANGES + 'queue');
    this.pendingChanges.clear();
    console.log('🗑️ All backups and metadata cleared');
  }

  /**
   * Stop all automatic processes
   */
  stopAll(): void {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
    }
    if (this.autoBackupInterval) {
      clearInterval(this.autoBackupInterval);
      this.autoBackupInterval = null;
    }
    console.log('⏸️ Auto-sync and auto-backup stopped');
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopAll();
    if (this.controller) {
      this.controller.destroy();
      this.controller = null;
      this.initialized = false;
    }
  }
}

// Export singleton instance
export const syncManager = new SyncManager();

// Export class for custom instances if needed
export { SyncManager };