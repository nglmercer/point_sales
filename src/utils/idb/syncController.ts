// src/utils/syncController.ts
import type { 
  SyncConfig, 
  SyncResponse, 
  BackupResponse, 
  StoreName, 
  SyncStatus
} from './types';
import { IndexedDBManager, type DatabaseItem } from 'idb-manager';

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
      syncInterval: 30000,
      ...config
    };
    this.manager = manager;

    if (this.config.autoSync) {
      this.startAutoSync();
    }
  }

  getStatus(): SyncStatus {
    return { ...this.status };
  }

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
   * 🔥 CORREGIDO: Pull con validación de datos nulos
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
      const serverData = result.data?.data || result.data;
      
      // 🔥 VALIDACIÓN: Verificar que serverData existe y es array válido
      if (!serverData || !Array.isArray(serverData)) {
        console.warn(`⚠️ Servidor retornó datos inválidos para ${storeName}`);
        return {
          success: true,
          data: [] as any,
          count: 0,
          timestamp: new Date().toISOString()
        } as SyncResponse<T>;
      }

      // 🔥 VALIDACIÓN: Filtrar items nulos o inválidos
      const validServerData = serverData.filter(item => {
        if (!item || typeof item !== 'object') {
          console.warn('⚠️ Item inválido filtrado:', item);
          return false;
        }
        if (!item.id) {
          console.warn('⚠️ Item sin ID filtrado:', item);
          return false;
        }
        return true;
      });

      if (validServerData.length === 0) {
        console.log(`ℹ️ No hay datos válidos en el servidor para ${storeName}`);
        return {
          success: true,
          data: [] as any,
          count: 0,
          timestamp: new Date().toISOString()
        } as SyncResponse<T>;
      }

      const store = this.manager.store(storeName);
      const localData = await store.getAll();
      const localMap = new Map(localData.map(item => [item.id, item]));
      
      let updated = 0;
      let created = 0;
      
      for (const serverItem of validServerData) {
        const localItem = localMap.get(serverItem.id);
        
        if (!localItem) {
          // Nuevo item del servidor
          await store.add(serverItem);
          created++;
        } else {
          // Comparar timestamps
          const serverTimestamp = serverItem.updated_at || serverItem.created_at || 0;
          const localTimestamp = localItem.updated_at || localItem.created_at || 0;
          const serverTime = new Date(serverTimestamp);
          const localTime = new Date(String(localTimestamp));

          if (serverTime > localTime) {
            await store.update(serverItem);
            updated++;
          }
        }
      }
      
      console.log(`✅ Pull completado para ${storeName}: ${created} nuevos, ${updated} actualizados`);
      
      this.status.lastSync = new Date();
      this.status.error = null;
      
      return {
        success: true,
        data: validServerData,
        count: validServerData.length,
        timestamp: result.timestamp || new Date().toISOString(),
        stats: { created, updated }
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
   * 🔥 MEJORADO: Push con clientId para evitar echo
   */
  async pushToServer<T = any>(storeName: StoreName, data?: T[]): Promise<SyncResponse<T>> {
    try {
      this.status.isPending = true;
      
      const dataToSync = data || await this.manager.store(storeName).getAll();
      
      if (!dataToSync || dataToSync.length === 0) {
        console.log(`ℹ️ No hay datos locales para enviar en ${storeName}`);
        return {
          success: true,
          data: [] as any,
          count: 0,
          timestamp: new Date().toISOString()
        } as SyncResponse<T>;
      }
      
      const url = `${this.config.serverUrl}/api/sync/${this.config.dbName}/${storeName}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          data: dataToSync,
          clientId: this.getClientId(),
          strategy: 'field-level-merge'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: SyncResponse<T> = await response.json();
      
      this.status.lastSync = new Date();
      this.status.error = null;
      
      console.log(`✅ Push completado para ${storeName}: ${dataToSync.length} items enviados`);
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Push failed';
      this.status.error = errorMessage;
      throw new Error(`Failed to push data to server: ${errorMessage}`);
    } finally {
      this.status.isPending = false;
    }
  }

  async syncStore<T = any>(storeName: StoreName): Promise<{
    pull: SyncResponse<T>;
    push: SyncResponse<T>;
  }> {
    console.log(`🔄 Sincronizando store: ${storeName}`);
    
    const pullResult = await this.pullFromServer<T>(storeName);
    const pushResult = await this.pushToServer<T>(storeName);
    
    if (pushResult.conflicts && pushResult.conflicts > 0) {
      console.log(`⚠️ Detectados ${pushResult.conflicts} conflictos, haciendo pull final...`);
      await this.pullFromServer<T>(storeName);
    }
    
    return { pull: pullResult, push: pushResult };
  }

  async syncAll(): Promise<Record<StoreName, SyncResponse>> {
    const stores: StoreName[] = ['products', 'tickets', 'customers'];
    const results: Partial<Record<StoreName, SyncResponse>> = {};

    console.log('🔄 Iniciando sincronización completa...');

    for (const store of stores) {
      try {
        const { push } = await this.syncStore(store);
        results[store] = push;
      } catch (error) {
        console.error(`❌ Error sincronizando ${store}:`, error);
        results[store] = {
          success: false,
          error: error instanceof Error ? error.message : 'Sync failed'
        } as SyncResponse;
      }
    }

    console.log('✅ Sincronización completa finalizada');
    return results as Record<StoreName, SyncResponse>;
  }

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
        body: JSON.stringify({
          ...data,
          clientId: this.getClientId()
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ Item actualizado en servidor: ${storeName}/${id}`);
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Update failed';
      throw new Error(`Failed to update item on server: ${errorMessage}`);
    }
  }

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
      console.log(`✅ Item eliminado del servidor: ${storeName}/${id}`);
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Delete failed';
      throw new Error(`Failed to delete item from server: ${errorMessage}`);
    }
  }

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
      console.log('✅ Backup creado en servidor');
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Backup failed';
      throw new Error(`Failed to create backup: ${errorMessage}`);
    }
  }

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
      console.log('✅ Backup restaurado en servidor');
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Restore failed';
      throw new Error(`Failed to restore backup: ${errorMessage}`);
    }
  }

  private getClientId(): string {
    let clientId = localStorage.getItem('sync_client_id');
    if (!clientId) {
      clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('sync_client_id', clientId);
    }
    return clientId;
  }

  startAutoSync(): void {
    if (this.syncInterval) {
      console.log('⚠️ Auto-sync ya está activo');
      return;
    }
    
    if (!this.config.syncInterval || this.config.syncInterval < 10000) {
      console.warn('⚠️ syncInterval muy bajo, ajustando a 10000ms');
      this.config.syncInterval = 10000;
    }
    
    console.log(`🔄 Auto-sync iniciado cada ${this.config.syncInterval / 1000}s`);

    this.syncInterval = setInterval(async () => {
      if (this.status.isConnected && !this.status.isPending) {
        try {
          await this.syncAll();
        } catch (error) {
          console.error('❌ Error en auto-sync:', error);
        }
      }
    }, this.config.syncInterval);
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('⏸️ Auto-sync detenido');
    }
  }

  destroy(): void {
    this.stopAutoSync();
    console.log('🧹 SyncController destruido');
  }
}

export default SyncController;