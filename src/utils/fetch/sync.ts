import BaseApi from './commons/BaseApi';
import apiConfig from './config/apiConfig';
import { emitter } from '../Emitter';
import type { StoreName, SyncResponse } from '../idb/types';
import type { DatabaseItem } from 'idb-manager';
interface SyncPostBody {
    data: any[];
    clientId?: string;
}
export interface Product extends DatabaseItem {
  id: number;
  processedTaskIds?: number[]|string[];
  [key: string]: any;
}
export type EmitEvents = "add" | "update" | "save" | "delete" | "clear" | "export" | "import";

export declare const EMIT_EVENTS: EmitEvents[];
export interface StoreTask extends DatabaseItem {
    id: number;
    action: EmitEvents;
    storeName: StoreName;
    data?: any;
}
export interface SyncTask extends SyncResponse {
    processedTaskIds?: number[]|string[];
    failedTasks?: StoreTask[];
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
    getTasks(): Promise<SyncResponse<any>> {
        return this.get(`/api/sync/tasks`);
    }
    syncTasks(tasks: StoreTask[]): Promise<SyncTask> {
        return this.post(`/api/sync/tasks`, { tasks });
    }
}

const syncController = new SyncController();

export { syncController, SyncController };