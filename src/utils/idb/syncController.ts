// src/utils/syncController.ts
import type { 
  SyncConfig, 
  SyncResponse, 
  BackupResponse, 
  StoreName, 
  SyncStatus
} from './types';
import { IndexedDBManager, type DatabaseItem } from 'idb-manager';

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

      const result = await response.json();
      
      // La respuesta tiene la estructura: { data: { data: [...], created_at, updated_at }, count, timestamp }
      // Necesitamos acceder a result.data.data para obtener el array de items
      const serverData = result.data?.data || result.data;
      
      if (serverData && Array.isArray(serverData) && serverData.length > 0) {
        const store = this.manager.store(storeName);
        await store.clear();
        await store.addMany(serverData as Partial<DatabaseItem>[]);
        
        console.log(`✅ Pulled ${serverData.length} items for ${storeName}`);
      } else {
        console.log(`ℹ️ No data to pull for ${storeName}`);
      }

      this.status.lastSync = new Date();
      this.status.error = null;
      
      // Retornar en formato esperado
      return {
        success: true,
        data: serverData,
        count: Array.isArray(serverData) ? serverData.length : 0,
        timestamp: result.timestamp || new Date().toISOString()
      } as SyncResponse<T>;
      
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
      
      console.log(`✅ Pushed ${Array.isArray(dataToSync) ? dataToSync.length : 0} items for ${storeName}`);
      
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
   * IMPORTANTE: Pull primero para obtener datos del servidor,
   * luego Push para enviar cambios locales
   */
  async syncStore<T = any>(storeName: StoreName): Promise<{
    pull: SyncResponse<T>;
    push: SyncResponse<T>;
  }> {
    console.log(`🔄 Syncing store: ${storeName}`);
    
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

    console.log('🔄 Starting full sync for all stores...');

    for (const store of stores) {
      try {
        const pullResult = await this.pullFromServer(store);
        const pushResult = await this.pushToServer(store);
        results[store] = pushResult;
      } catch (error) {
        console.error(`❌ Error syncing store ${store}:`, error);
        results[store] = {
          success: false,
          error: error instanceof Error ? error.message : 'Sync failed'
        } as SyncResponse;
      }
    }

    console.log('✅ Full sync completed for all stores');
    return results as Record<StoreName, SyncResponse>;
  }

  /**
   * Update a single item on server
   * Usa PUT para actualizar/crear un item individual en el servidor
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

      const result = await response.json();
      console.log(`✅ Updated item ${id} in ${storeName} on server`);
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Update failed';
      throw new Error(`Failed to update item on server: ${errorMessage}`);
    }
  }

  /**
   * Delete an item from server
   * ⚠️ ADVERTENCIA: Este endpoint puede tener problemas en el servidor
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

      const result = await response.json();
      console.log(`✅ Deleted item ${id} from ${storeName} on server`);
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Delete failed';
      console.error(`❌ Failed to delete item from server: ${errorMessage}`);
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

      const result = await response.json();
      console.log('✅ Backup created on server');
      
      return result;
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

      const result = await response.json();
      console.log('✅ Backup restored on server');
      
      return result;
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
      console.log('⚠️ Auto-sync already running');
      return;
    }
    if (!this.config.syncInterval || this.config.syncInterval < 10000) {
      console.warn('⚠️ syncInterval too low, setting to minimum 10000ms');
      this.config.syncInterval = 10000; // Minimum 10 seconds
    }
    console.log(`🔄 Starting auto-sync every ${this.config.syncInterval / 1000}s`);

    this.syncInterval = setInterval(async () => {
      if (this.status.isConnected && !this.status.isPending) {
        try {
          await this.syncAll();
        } catch (error) {
          console.error('❌ Auto-sync error:', error);
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
      console.log('⏸️ Auto-sync stopped');
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopAutoSync();
    console.log('🧹 SyncController destroyed');
  }
}

// Export default for easier import
export default SyncController;