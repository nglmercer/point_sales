// src/utils/syncManager.ts
import { SyncController } from './syncController';
import { dbManager } from './StoreManager';
import { ws } from './ws';
import type { SyncConfig, StoreName } from './types';

const STORAGE_KEYS = {
  BACKUP: 'sync_backup_',
  LAST_SYNC: 'sync_last_sync_',
  SYNC_METADATA: 'sync_metadata',
  PENDING_CHANGES: 'sync_pending_changes_',
  CHANGE_LOG: 'sync_change_log_'
} as const;

interface SyncMetadata {
  lastFullSync: string | null;
  lastIncrementalSync: string | null;
  totalSyncs: number;
  lastBackup: string | null;
  storeSyncTimestamps: Record<StoreName, string>;
}

interface PendingChange {
  id: string;
  storeName: StoreName;
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: string;
  synced: boolean;
}

interface ChangeLogEntry {
  id: string;
  storeName: StoreName;
  itemId: string | number;
  action: 'create' | 'update' | 'delete';
  timestamp: string;
  hash: string;
  synced: boolean;
}

class SyncManager {
  private controller: SyncController | null = null;
  private initialized = false;
  private autoSyncInterval: NodeJS.Timeout | null = null;
  private autoBackupInterval: NodeJS.Timeout | null = null;
  private config: SyncConfig | null = null;
  private pendingChanges: Map<string, PendingChange> = new Map();
  private changeLog: Map<string, ChangeLogEntry> = new Map();
  private wsConnected = false;

  async initialize(config: SyncConfig): Promise<SyncController> {
    if (this.controller) {
      return this.controller;
    }

    this.config = config;
    const manager = await dbManager;
    this.controller = new SyncController(config, manager);
    this.initialized = true;

    this.loadPendingChanges();
    this.loadChangeLog();
    await this.controller.checkConnection();
    this.initializeMetadata();

    // ============================================
    // CONFIGURAR WEBSOCKET
    // ============================================
    this.setupWebSocket();

    if (config.autoSync) {
      this.startAutoSync(config.syncInterval || 30000);
    }

    this.startAutoBackup(config.backupInterval || 300000);
    this.setupConnectionListeners();

    return this.controller;
  }

  /**
   * NUEVO: Configurar WebSocket para recibir notificaciones
   */
  private setupWebSocket(): void {
    console.log('🔌 Configurando WebSocket para sincronización...');

    // Conectar
    ws.on('connect', () => {
      console.log('✅ WebSocket conectado - sincronizando...');
      this.wsConnected = true;
      this.onWebSocketConnect();
    });

    ws.on('disconnect', () => {
      console.log('❌ WebSocket desconectado');
      this.wsConnected = false;
    });

    // Escuchar cambios remotos
    ws.on('stock:update', (updates: any[]) => {
      console.log('📥 Recibido stock:update desde servidor:', updates);
      this.handleRemoteStockUpdate(updates);
    });

    ws.on('stock:sync', (data: any) => {
      console.log('📥 Recibido stock:sync desde servidor:', data);
      this.handleRemoteSync(data);
    });

    ws.on('sync:change', (change: any) => {
      console.log('📥 Recibido sync:change desde servidor:', change);
      this.handleRemoteChange(change);
    });

    // Iniciar conexión
    ws.connect();
  }

  /**
   * NUEVO: Manejar conexión WebSocket
   */
  private async onWebSocketConnect(): Promise<void> {
    // Al conectar, sincronizar cambios pendientes
    await this.processPendingChanges();
    
    // Hacer sync incremental
    await this.incrementalSyncAll();
  }

  /**
   * NUEVO: Manejar actualizaciones de stock remotas
   */
  private async handleRemoteStockUpdate(updates: any[]): Promise<void> {
    console.log('🔄 Aplicando actualizaciones de stock remotas...');
    
    for (const update of updates) {
      try {
        const manager = await dbManager;
        const product = await manager.store('products').get(update.productId);
        
        if (product) {
          // Actualizar stock local SIN registrar como cambio local
          product.stock = update.stock;
          product.updated_at = update.timestamp;
          
          await manager.store('products').update(product);
          
          console.log(`✅ Stock actualizado: ${update.productId} → ${update.stock}`);
        }
      } catch (error) {
        console.error('❌ Error aplicando stock update:', error);
      }
    }
  }

  /**
   * NUEVO: Manejar sincronización remota completa
   */
  private async handleRemoteSync(data: any): Promise<void> {
    if (!data){
      console.warn('⚠️ Datos de sync remota vacíos');
      return;
    }
    const { storeName, action, item } = data;
    
    try {
      const manager = await dbManager;
      const store = manager.store(storeName);
      
      switch (action) {
        case 'create':
        case 'update':
          // Verificar si es más reciente que lo local
          const existing = await store.get(item.id);
          if (!existing || new Date(item.updated_at) > new Date(existing.updated_at as string)) {
            await store.update(item);
            console.log(`✅ Aplicado ${action} remoto: ${storeName}/${item.id}`);
          }
          break;
          
        case 'delete':
          await store.delete(item.id);
          console.log(`✅ Aplicado delete remoto: ${storeName}/${item.id}`);
          break;
      }
    } catch (error) {
      console.error('❌ Error aplicando sync remoto:', error);
    }
  }

  /**
   * NUEVO: Manejar cambio remoto individual
   */
  private async handleRemoteChange(change: any): Promise<void> {
    await this.handleRemoteSync(change);
  }

  /**
   * NUEVO: Generar hash de un item para detectar cambios
   */
  private generateHash(data: any): string {
    const normalized = this.normalizeForHash(data);
    return JSON.stringify(normalized);
  }

  private normalizeForHash(data: any): any {
    if (Array.isArray(data)) {
      return data.map(item => this.normalizeForHash(item));
    }
    
    if (data && typeof data === 'object') {
      const normalized: any = {};
      const keysToExclude = ['created_at', 'updated_at', 'synced_at', 'version', 'hash', '_source'];
      
      for (const key of Object.keys(data).sort()) {
        if (!keysToExclude.includes(key)) {
          normalized[key] = this.normalizeForHash(data[key]);
        }
      }
      return normalized;
    }
    
    return data;
  }

  /**
   * MEJORADO: Track changes con log persistente
   */
  async trackChange(
    storeName: StoreName,
    action: 'create' | 'update' | 'delete',
    data: any
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    const hash = this.generateHash(data);
    
    // Registrar en change log
    const logEntry: ChangeLogEntry = {
      id: `${storeName}_${data.id}_${Date.now()}`,
      storeName,
      itemId: data.id,
      action,
      timestamp,
      hash,
      synced: false
    };
    
    this.changeLog.set(logEntry.id, logEntry);
    this.saveChangeLog();
    
    console.log(`📝 Cambio registrado: ${action} ${storeName}/${data.id}`);
    console.log("Current sync status:", this.wsConnected);
    if (this.wsConnected) {
      // Sincronizar inmediatamente si está conectado
      try {
        await this.syncChange(storeName, action, data);
        
        // Marcar como sincronizado
        logEntry.synced = true;
        this.changeLog.set(logEntry.id, logEntry);
        this.saveChangeLog();
        
        // Notificar por WebSocket
        ws.emit('sync:change', {
          storeName,
          action,
          item: data,
          timestamp
        });
        
      } catch (error) {
        console.error('❌ Error sincronizando cambio:', error);
        this.queuePendingChange({ storeName, action, data });
      }
    } else {
      // Queue para sincronizar después
      this.queuePendingChange({ storeName, action, data });
    }
  }

  /**
   * NUEVO: Sincronizar un cambio individual
   */
  private async syncChange(
    storeName: StoreName,
    action: 'create' | 'update' | 'delete',
    data: any
  ): Promise<void> {
    const controller = this.getController();
    
    switch (action) {
      case 'create':
      case 'update':
        await controller.updateItemOnServer(storeName, data.id, data);
        break;
      case 'delete':
        await controller.deleteItemFromServer(storeName, data.id);
        break;
    }
  }

  /**
   * MEJORADO: Sincronización incremental solo con cambios
   */
  async incrementalSyncAll(): Promise<void> {
    const metadata = this.getMetadata();
    if (!metadata) return;

    const stores: StoreName[] = ['products', 'tickets', 'customers'];
    const controller = this.getController();

    console.log('🔄 Iniciando sincronización incremental...');

    for (const storeName of stores) {
      try {
        const lastSync = metadata.storeSyncTimestamps[storeName];
        
        // PULL: Obtener solo cambios desde última sincronización
        const url = `${this.config?.serverUrl}/api/sync/${this.config?.dbName}/${storeName}/since/${lastSync}`;
        const response = await fetch(url);
        
        if (response.ok) {
          const result = await response.json();
          
          if (result.data && result.data.length > 0) {
            const manager = await dbManager;
            const store = manager.store(storeName);
            
            // Aplicar cambios del servidor
            for (const item of result.data) {
              const existing = await store.get(item.id);
              
              // Solo actualizar si el servidor tiene versión más reciente
              if (!existing || new Date(item.updated_at) > new Date(existing.updated_at as string)) {
                await store.update(item);
              }
            }
            
            console.log(`✅ Synced ${result.data.length} cambios para ${storeName}`);
          } else {
            console.log(`ℹ️ No hay cambios en ${storeName} desde ${lastSync}`);
          }
        }

        // PUSH: Enviar solo cambios locales no sincronizados
        const unsyncedChanges = this.getUnsyncedChanges(storeName);
        
        if (unsyncedChanges.length > 0) {
          console.log(`📤 Enviando ${unsyncedChanges.length} cambios locales de ${storeName}...`);
          
          for (const change of unsyncedChanges) {
            await this.syncChange(storeName, change.action, change.data);
            
            // Marcar como sincronizado
            const logEntry = this.changeLog.get(change.id);
            if (logEntry) {
              logEntry.synced = true;
              this.changeLog.set(change.id, logEntry);
            }
          }
          
          this.saveChangeLog();
        }

        // Actualizar timestamp
        metadata.storeSyncTimestamps[storeName] = new Date().toISOString();
        
      } catch (error) {
        console.error(`❌ Error sincronizando ${storeName}:`, error);
      }
    }

    await this.processPendingChanges();

    this.updateMetadata({
      lastIncrementalSync: new Date().toISOString(),
      totalSyncs: metadata.totalSyncs + 1,
      storeSyncTimestamps: metadata.storeSyncTimestamps
    });

    console.log('✅ Sincronización incremental completada');
  }

  /**
   * NUEVO: Obtener cambios locales no sincronizados
   */
  private getUnsyncedChanges(storeName: StoreName): PendingChange[] {
    const changes: PendingChange[] = [];
    
    for (const [id, entry] of this.changeLog) {
      if (entry.storeName === storeName && !entry.synced) {
        const pending = this.pendingChanges.get(id);
        if (pending) {
          changes.push(pending);
        }
      }
    }
    
    return changes;
  }

  /**
   * MEJORADO: Procesar cambios pendientes
   */
  private async processPendingChanges(): Promise<void> {
    if (this.pendingChanges.size === 0) return;

    console.log(`🔄 Procesando ${this.pendingChanges.size} cambios pendientes...`);
    const controller = this.getController();
    const processed: string[] = [];

    for (const [id, change] of this.pendingChanges) {
      try {
        await this.syncChange(change.storeName, change.action, change.data);
        
        // Marcar en change log
        const logEntry = this.changeLog.get(id);
        if (logEntry) {
          logEntry.synced = true;
          this.changeLog.set(id, logEntry);
        }
        
        processed.push(id);
        
      } catch (error) {
        console.error(`❌ Error procesando cambio pendiente ${id}:`, error);
      }
    }

    processed.forEach(id => this.pendingChanges.delete(id));
    this.savePendingChanges();
    this.saveChangeLog();

    console.log(`✅ Procesados ${processed.length} cambios pendientes`);
  }

  // ============================================
  // MÉTODOS DE PERSISTENCIA
  // ============================================

  private queuePendingChange(change: Omit<PendingChange, 'id' | 'timestamp' | 'synced'>): void {
    const id = `${change.storeName}_${change.action}_${Date.now()}_${Math.random()}`;
    const timestamp = new Date().toISOString();
    
    const pendingChange: PendingChange = { 
      id, 
      timestamp, 
      synced: false,
      ...change 
    };
    
    this.pendingChanges.set(id, pendingChange);
    this.savePendingChanges();
  }

  private savePendingChanges(): void {
    const changes = Array.from(this.pendingChanges.values());
    localStorage.setItem(STORAGE_KEYS.PENDING_CHANGES + 'queue', JSON.stringify(changes));
  }

  private loadPendingChanges(): void {
    const data = localStorage.getItem(STORAGE_KEYS.PENDING_CHANGES + 'queue');
    if (data) {
      const changes: PendingChange[] = JSON.parse(data);
      changes.forEach(change => {
        this.pendingChanges.set(change.id, change);
      });
      console.log(`📋 Cargados ${changes.length} cambios pendientes`);
    }
  }

  private saveChangeLog(): void {
    const log = Array.from(this.changeLog.values());
    localStorage.setItem(STORAGE_KEYS.CHANGE_LOG + 'all', JSON.stringify(log));
  }

  private loadChangeLog(): void {
    const data = localStorage.getItem(STORAGE_KEYS.CHANGE_LOG + 'all');
    if (data) {
      const log: ChangeLogEntry[] = JSON.parse(data);
      log.forEach(entry => {
        this.changeLog.set(entry.id, entry);
      });
      console.log(`📋 Cargadas ${log.length} entradas del change log`);
    }
  }

  // ... (resto de métodos: initializeMetadata, getMetadata, updateMetadata, etc.)
  // Los métodos restantes permanecen igual

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

  private getMetadata(): SyncMetadata | null {
    const data = localStorage.getItem(STORAGE_KEYS.SYNC_METADATA);
    return data ? JSON.parse(data) : null;
  }

  private updateMetadata(updates: Partial<SyncMetadata>): void {
    const current = this.getMetadata() || this.getDefaultMetadata();
    const updated = { ...current, ...updates };
    localStorage.setItem(STORAGE_KEYS.SYNC_METADATA, JSON.stringify(updated));
  }

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

  private setupConnectionListeners(): void {
    window.addEventListener('online', async () => {
      console.log('🌐 Conexión restaurada, sincronizando...');
      await this.processPendingChanges();
      await this.incrementalSyncAll();
    });

    window.addEventListener('offline', () => {
      console.log('📴 Conexión perdida, cambios se guardarán para sincronizar después');
    });
  }

  startAutoSync(interval: number = 30000): void {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
    }

    console.log(`🔄 Auto-sync iniciado cada ${interval / 1000}s`);

    this.autoSyncInterval = setInterval(async () => {
      const status = this.getStatus();
      if (status.isConnected && !status.isPending) {
        try {
          await this.incrementalSyncAll();
        } catch (error) {
          console.error('❌ Error en auto-sync:', error);
        }
      }
    }, interval);
  }

  startAutoBackup(interval: number = 300000): void {
    if (this.autoBackupInterval) {
      clearInterval(this.autoBackupInterval);
    }

    console.log(`💾 Auto-backup iniciado cada ${interval / 1000}s`);

    this.autoBackupInterval = setInterval(async () => {
      try {
        await this.createLocalBackup();
      } catch (error) {
        console.error('❌ Error en auto-backup:', error);
      }
    }, interval);
  }

  async createLocalBackup(): Promise<void> {
    const stores: StoreName[] = ['products', 'tickets', 'customers'];
    
    for (const store of stores) {
      await this.saveBackupToLocalStorage(store);
    }

    this.updateMetadata({ lastBackup: new Date().toISOString() });
    console.log('✅ Backup local completado');
  }

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

      console.log(`✅ Backup guardado para ${storeName}: ${data.length} items`);
    } catch (error) {
      console.error(`❌ Error guardando backup para ${storeName}:`, error);
    }
  }

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

    await this.createLocalBackup();

    console.log('✅ Sincronización completa finalizada');
    return result;
  }

  async syncStore(storeName: StoreName): Promise<void> {
    const controller = this.getController();
    await controller.syncStore(storeName);
    
    const metadata = this.getMetadata();
    if (metadata) {
      metadata.storeSyncTimestamps[storeName] = new Date().toISOString();
      this.updateMetadata(metadata);
    }

    await this.saveBackupToLocalStorage(storeName);
  }

  getController(): SyncController {
    if (!this.controller) {
      throw new Error('SyncManager no inicializado. Llama a initialize() primero.');
    }
    return this.controller;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getStatus() {
    const controller = this.getController();
    const metadata = this.getMetadata();
    return {
      ...controller.getStatus(),
      metadata,
      pendingChanges: this.pendingChanges.size,
      unsyncedChanges: Array.from(this.changeLog.values()).filter(e => !e.synced).length,
      wsConnected: this.wsConnected
    };
  }

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

  clearAllBackups(): void {
    const stores: StoreName[] = ['products', 'tickets', 'customers'];
    stores.forEach(store => {
      localStorage.removeItem(`${STORAGE_KEYS.BACKUP}${store}`);
    });
    localStorage.removeItem(STORAGE_KEYS.SYNC_METADATA);
    localStorage.removeItem(STORAGE_KEYS.PENDING_CHANGES + 'queue');
    localStorage.removeItem(STORAGE_KEYS.CHANGE_LOG + 'all');
    this.pendingChanges.clear();
    this.changeLog.clear();
    console.log('🗑️ Todos los backups y metadata eliminados');
  }

  stopAll(): void {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
    }
    if (this.autoBackupInterval) {
      clearInterval(this.autoBackupInterval);
      this.autoBackupInterval = null;
    }
    console.log('⏸️ Auto-sync y auto-backup detenidos');
  }

  destroy(): void {
    this.stopAll();
    ws.disconnect();
    if (this.controller) {
      this.controller.destroy();
      this.controller = null;
      this.initialized = false;
    }
  }
}

export const syncManager = new SyncManager();
export { SyncManager };