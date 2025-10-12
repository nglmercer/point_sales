// src/services/SyncManager.ts
import { taskManager } from './StoreManager';
import { syncController,type StoreTask } from '../fetch/sync'; // Tu controlador de API existen
import { emitter } from '../Emitter';

class SyncManager {
    private isSyncing = false;
    private isInitialized = false;

    initialize() {
        if (this.isInitialized) return;

        window.addEventListener('online', () => this.processQueue());
        emitter.on('sync:request', () => this.processQueue());

        this.isInitialized = true;
        console.log('🔄 SyncManager Initialized');
        
        // Attempt to process any leftover tasks from a previous session.
        setTimeout(() => this.processQueue(), 2000); 
    }

    public async processQueue() {
        if (this.isSyncing || !navigator.onLine) {
            console.log(`Sync skipped. Syncing: ${this.isSyncing}, Online: ${navigator.onLine}`);
            return;
        }

        this.isSyncing = true;
        
        try {
            const taskStore = taskManager.store('sync_tasks');
            const pendingTasks = await taskStore.getAll() as StoreTask[];

            if (!Array.isArray(pendingTasks) || pendingTasks.length === 0) {
                console.log('✅ Sync queue is empty.');
                return;
            }

            console.log(`🔄 Attempting to sync ${pendingTasks.length} tasks...`);
            
            const response = await syncController.syncTasks(pendingTasks);

            if (response.success && response.processedTaskIds && response.processedTaskIds.length > 0) {
                // IMPORTANT: Clear successfully processed tasks from the local queue.
                await taskStore.deleteMany(response.processedTaskIds);
                console.log(`✅ Successfully synced and cleared ${response.processedTaskIds.length} tasks.`);
                
                if (response.failedTasks && response.failedTasks.length > 0) {
                    console.warn('⚠️ Some tasks failed to sync on the server:', response.failedTasks);
                    // Consider adding logic here to handle failed tasks (e.g., notify user, retry).
                }
            } else {
                console.warn('⚠️ Sync request to server failed or no tasks were processed.', response);
            }

        } catch (error) {
            console.error('❌ Sync process failed:', error);
        } finally {
            this.isSyncing = false;
        }
    }
}

export const syncManager = new SyncManager();
