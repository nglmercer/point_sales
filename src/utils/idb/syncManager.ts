// src/utils/syncManager.ts
import { SyncController } from './syncController';
import { dbManager } from './StoreManager';
import type { SyncConfig, StoreName } from './types';

/**
 * Singleton SyncManager for easier access throughout the application
 */
class SyncManager {
  private controller: SyncController | null = null;
  private initialized = false;

  /**
   * Initialize the sync manager with configuration
   */
  async initialize(config: SyncConfig): Promise<SyncController> {
    if (this.controller) {
      return this.controller;
    }

    const manager = await dbManager;
    this.controller = new SyncController(config, manager);
    this.initialized = true;

    // Check initial connection
    await this.controller.checkConnection();

    return this.controller;
  }

  /**
   * Get the current controller instance
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
   * Quick sync a specific store
   */
  async syncStore(storeName: StoreName) {
    const controller = this.getController();
    return controller.syncStore(storeName);
  }

  /**
   * Quick sync all stores
   */
  async syncAll() {
    const controller = this.getController();
    return controller.syncAll();
  }

  /**
   * Pull data from server
   */
  async pull(storeName: StoreName) {
    const controller = this.getController();
    return controller.pullFromServer(storeName);
  }

  /**
   * Push data to server
   */
  async push(storeName: StoreName, data?: any[]) {
    const controller = this.getController();
    return controller.pushToServer(storeName, data);
  }

  /**
   * Get sync status
   */
  getStatus() {
    const controller = this.getController();
    return controller.getStatus();
  }

  /**
   * Create backup
   */
  async createBackup() {
    const controller = this.getController();
    return controller.createBackup();
  }

  /**
   * Restore from backup
   */
  async restoreBackup(backup: Record<string, any[]>, overwrite = false) {
    const controller = this.getController();
    return controller.restoreBackup(backup, overwrite);
  }

  /**
   * Start auto sync
   */
  startAutoSync() {
    const controller = this.getController();
    controller.startAutoSync();
  }

  /**
   * Stop auto sync
   */
  stopAutoSync() {
    const controller = this.getController();
    controller.stopAutoSync();
  }

  /**
   * Clean up resources
   */
  destroy() {
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