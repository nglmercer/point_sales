// src/utils/syncController.ts
import type { 
  SyncConfig, 
  SyncResponse, 
  BackupResponse, 
  StoreName, 
  SyncStatus
} from './types';
import { IndexedDBManager,type DatabaseItem } from 'idb-manager';

/**
 * SyncController - Manages synchronization between IndexedDB and remote server
 */
export class SyncController {
  private config: SyncConfig;
  private manager: IndexedDBManager;
  private syncInterval: NodeJS.Timeout | null = null;
  private status: SyncStatus = {
    isConnected: false,
    lastSync: null,
    isPending: false,
    error: null
  };

  constructor(config: SyncConfig, manager: IndexedDBManager) {
    this.config = {
      autoSync: false,
      syncInterval: 30000, // 30 seconds default
      ...config
    };
    this.manager = manager;

    if (this.config.autoSync) {
      this.startAutoSync();
    }
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return { ...this.status };
  }

  /**
   * Check server connectivity
   */
  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.serverUrl}/`);
      const data = await response.json();
      this.status.isConnected = data.status === 'ok';
      this.status.error = null;
      return this.status.isConnected;
    } catch (error) {
      this.status.isConnected = false;
      this.status.error = error instanceof Error ? error.message : 'Connection failed';
      return false;
    }
  }

  /**
   * Sync data from server to local IndexedDB (Pull)
   */
  async pullFromServer<T = any>(storeName: StoreName): Promise<SyncResponse<T>> {
    try {
      this.status.isPending = true;
      
      const url = `${this.config.serverUrl}/api/sync/${this.config.dbName}/${storeName}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: SyncResponse<T> = await response.json();
      
      // Update local store with server data
      if (result.data && result.data.length > 0) {
        const store = this.manager.store(storeName);
        await store.clear();
        await store.addMany(result.data as Partial<DatabaseItem>[]);
      }

      this.status.lastSync = new Date();
      this.status.error = null;
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Pull failed';
      this.status.error = errorMessage;
      throw new Error(`Failed to pull data from server: ${errorMessage}`);
    } finally {
      this.status.isPending = false;
    }
  }

  /**
   * Push data from local IndexedDB to server
   */
  async pushToServer<T = any>(storeName: StoreName, data?: T[]): Promise<SyncResponse<T>> {
    try {
      this.status.isPending = true;
      
      // If no data provided, get all from local store
      const dataToSync = data || await this.manager.store(storeName).getAll();
      
      const url = `${this.config.serverUrl}/api/sync/${this.config.dbName}/${storeName}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: dataToSync }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: SyncResponse<T> = await response.json();
      
      this.status.lastSync = new Date();
      this.status.error = null;
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Push failed';
      this.status.error = errorMessage;
      throw new Error(`Failed to push data to server: ${errorMessage}`);
    } finally {
      this.status.isPending = false;
    }
  }

  /**
   * Bi-directional sync: Pull then Push
   */
  async syncStore<T = any>(storeName: StoreName): Promise<{
    pull: SyncResponse<T>;
    push: SyncResponse<T>;
  }> {
    const pullResult = await this.pullFromServer<T>(storeName);
    const pushResult = await this.pushToServer<T>(storeName);
    
    return { pull: pullResult, push: pushResult };
  }

  /**
   * Sync all stores
   */
  async syncAll(): Promise<Record<StoreName, SyncResponse>> {
    const stores: StoreName[] = ['products', 'tickets', 'customers'];
    const results: Partial<Record<StoreName, SyncResponse>> = {};

    for (const store of stores) {
      try {
        const pullResult = await this.pullFromServer(store);
        const pushResult = await this.pushToServer(store);
        results[store] = pushResult;
      } catch (error) {
        console.error(`Error syncing store ${store}:`, error);
      }
    }

    return results as Record<StoreName, SyncResponse>;
  }

  /**
   * Update a single item on server
   */
  async updateItemOnServer<T = any>(
    storeName: StoreName, 
    id: string | number, 
    data: T
  ): Promise<SyncResponse<T>> {
    try {
      const url = `${this.config.serverUrl}/api/sync/${this.config.dbName}/${storeName}/${id}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Update failed';
      throw new Error(`Failed to update item on server: ${errorMessage}`);
    }
  }

  /**
   * Delete an item from server
   */
  async deleteItemFromServer(
    storeName: StoreName, 
    id: string | number
  ): Promise<SyncResponse> {
    try {
      const url = `${this.config.serverUrl}/api/sync/${this.config.dbName}/${storeName}/${id}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Delete failed';
      throw new Error(`Failed to delete item from server: ${errorMessage}`);
    }
  }

  /**
   * Create a backup on server
   */
  async createBackup(): Promise<BackupResponse> {
    try {
      const url = `${this.config.serverUrl}/api/backup/${this.config.dbName}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Backup failed';
      throw new Error(`Failed to create backup: ${errorMessage}`);
    }
  }

  /**
   * Restore from backup
   */
  async restoreBackup(backup: Record<string, any[]>, overwrite = false): Promise<SyncResponse> {
    try {
      const url = `${this.config.serverUrl}/api/backup/${this.config.dbName}/restore`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ backup, overwrite }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Restore failed';
      throw new Error(`Failed to restore backup: ${errorMessage}`);
    }
  }

  /**
   * Start automatic synchronization
   */
  startAutoSync(): void {
    if (this.syncInterval) {
      return; // Already running
    }

    this.syncInterval = setInterval(async () => {
      if (this.status.isConnected && !this.status.isPending) {
        try {
          await this.syncAll();
        } catch (error) {
          console.error('Auto-sync error:', error);
        }
      }
    }, this.config.syncInterval);
  }

  /**
   * Stop automatic synchronization
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopAutoSync();
  }
}

// Export default for easier import
export default SyncController;