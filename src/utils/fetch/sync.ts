import BaseApi from './commons/BaseApi';
import type { FetchOptions } from './commons/httpservice';
import apiConfig from './config/apiConfig';
import { emitter } from '../Emitter';
import type { StoreName, SyncResponse } from '../idb/types';

interface SyncPostBody {
    data: any[];
    clientId?: string;
    strategy?: 'field-level-merge' | 'client-wins' | 'server-wins';
    idField?: string;
}

interface SyncStats {
    total: number;
    updatedLast24h: number;
    updatedLast7d: number;
    version: number;
    byClient: Record<string, number>;
    conflicts: number;
    oldestRecord?: string;
    newestRecord?: string;
    timestamp: string;
}

interface ConflictLog {
    timestamp: string;
    storeName: string;
    conflicts: any[];
    resolved: boolean;
}

interface SyncChangesSinceResponse {
    data: any[];
    count: number;
    timestamp: string;
}

class SyncController extends BaseApi {
    private dbName: string;

    constructor() {
        super(apiConfig);
        this.dbName = 'PointSales';
    }

    // ============================================
    // GET - Obtener todos los registros de un store
    // ============================================
    /**
     * Obtiene todos los registros de un store específico
     * @param storeName - Nombre del store (products, sales, customers, etc.)
     * @returns Promise con los datos del store
     */
    getSync(storeName: StoreName): Promise<SyncResponse<any>> {
        return this.get(`/api/sync/${this.dbName}/${storeName}`);
    }

    // ============================================
    // POST - Sincronizar múltiples registros (bulk sync)
    // ============================================
    /**
     * Sincroniza múltiples registros en bulk con el servidor
     * @param storeName - Nombre del store
     * @param body - Datos a sincronizar con estrategia de merge
     * @returns Promise con resultado de la sincronización
     */
    postSync(storeName: StoreName, body: SyncPostBody): Promise<SyncResponse<any>> {
        return this.post(`/api/sync/${this.dbName}/${storeName}`, body);
    }

    // ============================================
    // PUT - Actualizar o crear un registro individual
    // ============================================
    /**
     * Actualiza o crea un registro individual por ID
     * @param storeName - Nombre del store
     * @param id - ID del registro
     * @param data - Datos del registro (incluye clientId opcional)
     * @returns Promise con el resultado de la operación
     */
    putSync(storeName: StoreName, id: string, data: any): Promise<SyncResponse<any>> {
        return this.put(`/api/sync/${this.dbName}/${storeName}/${id}`, data);
    }

    // ============================================
    // PATCH - Actualizar parcialmente un registro
    // ============================================
    /**
     * Actualiza parcialmente un registro existente
     * @param storeName - Nombre del store
     * @param id - ID del registro
     * @param data - Campos parciales a actualizar
     * @returns Promise con el resultado de la operación
     */
    patchSync(storeName: StoreName, id: string, data: Partial<any>): Promise<SyncResponse<any>> {
        return this.patch(`/api/sync/${this.dbName}/${storeName}/${id}`, data);
    }

    // ============================================
    // DELETE - Eliminar un registro
    // ============================================
    /**
     * Elimina un registro específico del store
     * @param storeName - Nombre del store
     * @param id - ID del registro a eliminar
     * @returns Promise con el resultado de la eliminación
     */
    deleteSync(storeName: StoreName, id: string): Promise<{ success: boolean; timestamp: string }> {
        return this.delete(`/api/sync/${this.dbName}/${storeName}/${id}`);
    }

    // ============================================
    // GET - Obtener cambios desde un timestamp
    // ============================================
    /**
     * Obtiene todos los registros modificados desde un timestamp específico
     * @param storeName - Nombre del store
     * @param timestamp - Timestamp ISO desde el cual obtener cambios
     * @returns Promise con los cambios desde ese momento
     */
    getSyncSince(storeName: StoreName, timestamp: string): Promise<SyncChangesSinceResponse> {
        return this.get(`/api/sync/${this.dbName}/${storeName}/since/${timestamp}`);
    }

    // ============================================
    // GET - Obtener logs de conflictos
    // ============================================
    /**
     * Obtiene el historial de conflictos de sincronización de un store
     * @param storeName - Nombre del store
     * @returns Promise con los logs de conflictos
     */
    getConflicts(storeName: StoreName): Promise<{ conflicts: ConflictLog[]; count: number; timestamp: string }> {
        return this.get(`/api/sync/${this.dbName}/${storeName}/conflicts`);
    }

    // ============================================
    // GET - Obtener estadísticas de un store
    // ============================================
    /**
     * Obtiene estadísticas y métricas de un store
     * @param storeName - Nombre del store
     * @returns Promise con las estadísticas del store
     */
    getStats(storeName: StoreName): Promise<SyncStats> {
        return this.get(`/api/sync/${this.dbName}/${storeName}/stats`);
    }

    // ============================================
    // MÉTODOS DE AYUDA Y UTILIDAD
    // ============================================

    /**
     * Sincroniza cambios locales con el servidor usando estrategia inteligente
     * @param storeName - Nombre del store
     * @param localData - Datos locales a sincronizar
     * @param clientId - ID del cliente que realiza la sincronización
     * @param strategy - Estrategia de resolución de conflictos
     * @returns Promise con resultado detallado de la sincronización
     */
    async syncLocalChanges(
        storeName: StoreName,
        localData: any[],
        clientId: string,
        strategy: 'field-level-merge' | 'client-wins' | 'server-wins' = 'field-level-merge'
    ): Promise<SyncResponse<any>> {
        const body: SyncPostBody = {
            data: localData,
            clientId,
            strategy,
            idField: 'id'
        };

        const result = await this.postSync(storeName, body);
        return result;
    }

    /**
     * Obtiene cambios incrementales desde la última sincronización
     * @param storeName - Nombre del store
     * @param lastSyncTimestamp - Timestamp de la última sincronización
     * @returns Promise con los cambios incrementales
     */
    async getIncrementalChanges(
        storeName: StoreName,
        lastSyncTimestamp: string
    ): Promise<any[]> {
        const response = await this.getSyncSince(storeName, lastSyncTimestamp);
        
        if (response.count > 0) {
            emitter.emit('sync:changes-received', {
                storeName,
                count: response.count,
                timestamp: response.timestamp
            });
        }

        return response.data;
    }

    /**
     * Verifica el estado de sincronización de un store
     * @param storeName - Nombre del store
     * @returns Promise con el estado y estadísticas
     */
    async checkSyncStatus(storeName: StoreName): Promise<SyncStats> {
        const stats = await this.getStats(storeName);
        
        emitter.emit('sync:status-checked', {
            storeName,
            stats
        });

        return stats;
    }

    /**
     * Realiza una sincronización completa (full sync)
     * Útil para resolver conflictos o restaurar estado
     * @param storeName - Nombre del store
     * @returns Promise con todos los datos del servidor
     */
    async fullSync(storeName: StoreName): Promise<any[]> {
        const response = await this.getSync(storeName);
        
        emitter.emit('sync:full-completed', {
            storeName,
            count: response.count,
            timestamp: response.timestamp
        });

        return response.data;
    }

    /**
     * Actualiza un registro con manejo automático de conflictos
     * @param storeName - Nombre del store
     * @param id - ID del registro
     * @param data - Datos a actualizar
     * @param clientId - ID del cliente
     * @returns Promise con el resultado de la actualización
     */
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
            return { success: false, timestamp: '' };
        }

        return result;
    }

    /**
     * Elimina un registro y notifica a través del emitter
     * @param storeName - Nombre del store
     * @param id - ID del registro a eliminar
     * @returns Promise con el resultado de la eliminación
     */
    async deleteWithNotification(
        storeName: StoreName,
        id: string
    ): Promise<{ success: boolean; timestamp: string }> {
        const result = await this.deleteSync(storeName, id);

        if (result.success) {
            emitter.emit('sync:item-deleted', {
                storeName,
                id,
                timestamp: result.timestamp
            });
        }

        return result;
    }
}

const syncController = new SyncController();

// ============================================
// FUNCIONES DE PRUEBA
// ============================================

async function testSync() {
    try {
        console.log('🧪 Iniciando pruebas de SyncController...\n');

        // Test 1: GET - Obtener todos los productos
        console.log('📥 Test 1: GET todos los productos');
        const allProducts = await syncController.getSync('products');
        console.log(`✅ Productos obtenidos: ${allProducts.count}`);

/*         // Test 2: GET Stats
        console.log('\n📊 Test 2: Obtener estadísticas');
        const stats = await syncController.getStats('products');
        console.log(`✅ Total: ${stats.total}, Última 24h: ${stats.updatedLast24h}`);

        // Test 3: POST - Sincronizar datos
        console.log('\n📤 Test 3: Sincronizar productos en bulk');
        const syncResult = await syncController.syncLocalChanges(
            'products',
            [
                { id: 'test-1', name: 'Producto Test 1', price: 100, stock: 50 },
                { id: 'test-2', name: 'Producto Test 2', price: 200, stock: 30 }
            ],
            'test-client-001'
        );
        console.log(`✅ Sincronizados: ${syncResult.synced}, Conflictos: ${syncResult.conflicts}`);

        // Test 4: PUT - Actualizar un producto
        console.log('\n✏️ Test 4: Actualizar producto individual');
        const updateResult = await syncController.updateWithConflictResolution(
            'products',
            'test-1',
            { name: 'Producto Test 1 Actualizado', price: 150 },
            'test-client-001'
        );
        console.log(`✅ Actualizado: ${updateResult.action}, Conflicto: ${updateResult.hadConflict}`);

        // Test 5: PATCH - Actualización parcial
        console.log('\n🔧 Test 5: Actualización parcial');
        const patchResult = await syncController.patchSync(
            'products',
            'test-1',
            { stock: 45 }
        );
        console.log(`✅ Parcheado: ${patchResult.action}`);

        // Test 6: GET Since - Cambios desde timestamp
        console.log('\n⏰ Test 6: Obtener cambios desde hace 1 hora');
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const changes = await syncController.getIncrementalChanges('products', oneHourAgo);
        console.log(`✅ Cambios encontrados: ${changes.length}`);

        // Test 7: GET Conflicts
        console.log('\n⚠️ Test 7: Obtener logs de conflictos');
        const conflicts = await syncController.getConflicts('products');
        console.log(`✅ Conflictos registrados: ${conflicts.count}`);

        // Test 8: DELETE
        console.log('\n🗑️ Test 8: Eliminar producto');
        const deleteResult = await syncController.deleteWithNotification('products', 'test-2');
        console.log(`✅ Eliminado: ${deleteResult.success}`);

        console.log('\n✅ Todas las pruebas completadas exitosamente!'); */
    } catch (error) {
        console.error('❌ Error en las pruebas:', error);
    }
}

// Ejecutar pruebas si se desea
// testSync();

export { syncController, SyncController };
export type { SyncPostBody, SyncStats, ConflictLog, SyncChangesSinceResponse };