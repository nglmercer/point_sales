import BaseApi from './commons/BaseApi';
import apiConfig from './config/apiConfig';
import { emitter } from '../Emitter';
import type { StoreName, SyncResponse } from '../idb/types';

interface SyncPostBody {
    data: any[];
    clientId?: string;
    strategy?: 'field-level-merge' | 'client-wins' | 'server-wins';
    idField?: string;
    lastVersion?: number;
}

interface SyncStats {
    total: number;
    currentVersion: number;
    byClient: Record<string, number>;
    conflicts: number;
    lastModified?: string;
}

interface ConflictLog {
    timestamp: string;
    storeName: string;
    conflicts: any[];
    resolved: boolean;
}

interface SyncVersionResponse {
    data: any[];
    count: number;
    currentVersion: number;
    hasMore: boolean;
}

class SyncController extends BaseApi {
    private dbName: string;

    constructor() {
        super(apiConfig);
        this.dbName = 'PointSales';
    }

    getSync(storeName: StoreName): Promise<SyncResponse<any>> {
        return this.get(`/api/sync/${this.dbName}/${storeName}`);
    }

    postSync(storeName: StoreName, body: SyncPostBody): Promise<SyncResponse<any>> {
        return this.post(`/api/sync/${this.dbName}/${storeName}`, body);
    }

    putSync(storeName: StoreName, id: string, data: any): Promise<SyncResponse<any>> {
        return this.put(`/api/sync/${this.dbName}/${storeName}/${id}`, data);
    }

    patchSync(storeName: StoreName, id: string, data: Partial<any>): Promise<SyncResponse<any>> {
        return this.patch(`/api/sync/${this.dbName}/${storeName}/${id}`, data);
    }

    deleteSync(storeName: StoreName, id: string): Promise<{ success: boolean; version: number }> {
        return this.delete(`/api/sync/${this.dbName}/${storeName}/${id}`);
    }

    getSyncFromVersion(storeName: StoreName, version: number): Promise<SyncVersionResponse> {
        return this.get(`/api/sync/${this.dbName}/${storeName}/from/${version}`);
    }

    getConflicts(storeName: StoreName): Promise<{ conflicts: ConflictLog[]; count: number }> {
        return this.get(`/api/sync/${this.dbName}/${storeName}/conflicts`);
    }

    getStats(storeName: StoreName): Promise<SyncStats> {
        return this.get(`/api/sync/${this.dbName}/${storeName}/stats`);
    }

    async syncLocalChanges(
        storeName: StoreName,
        localData: any[],
        clientId: string,
        lastKnownVersion: number,
        strategy: 'field-level-merge' | 'client-wins' | 'server-wins' = 'field-level-merge'
    ): Promise<SyncResponse<any>> {
        const body: SyncPostBody = {
            data: localData,
            clientId,
            strategy,
            idField: 'id',
            lastVersion: lastKnownVersion
        };

        return this.postSync(storeName, body);
    }

    async getIncrementalChanges(
        storeName: StoreName,
        lastKnownVersion: number
    ): Promise<any[]> {
        const response = await this.getSyncFromVersion(storeName, lastKnownVersion);
        
        if (response.count > 0) {
            emitter.emit('sync:changes-received', {
                storeName,
                count: response.count,
                currentVersion: response.currentVersion,
                hasMore: response.hasMore
            });
        }

        return response.data;
    }

    async checkSyncStatus(storeName: StoreName): Promise<SyncStats> {
        const stats = await this.getStats(storeName);
        
        emitter.emit('sync:status-checked', {
            storeName,
            stats
        });

        return stats;
    }

    async fullSync(storeName: StoreName): Promise<any[]> {
        const response = await this.getSync(storeName);
        
        emitter.emit('sync:full-completed', {
            storeName,
            count: response.count,
            version: response.version
        });

        return response.data;
    }

    async updateWithConflictResolution(
        storeName: StoreName,
        id: string,
        data: any,
        clientId: string
    ): Promise<SyncResponse<any>> {
        const dataWithClient = {
            ...data,
            clientId
        };

        const result = await this.putSync(storeName, id, dataWithClient);

        if (!result) {
            console.warn(`No se pudo actualizar el registro ${id} en ${storeName}`);
            return { success: false, version: 0 };
        }

        return result;
    }

    async deleteWithNotification(
        storeName: StoreName,
        id: string
    ): Promise<{ success: boolean; version: number }> {
        const result = await this.deleteSync(storeName, id);

        if (result.success) {
            emitter.emit('sync:item-deleted', {
                storeName,
                id,
                version: result.version
            });
        }

        return result;
    }
}

const syncController = new SyncController();

export { syncController, SyncController };
export type { SyncPostBody, SyncStats, ConflictLog, SyncVersionResponse };