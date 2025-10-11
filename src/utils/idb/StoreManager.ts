// src/utils/storeManager.ts
import { IndexedDBManager, type DatabaseSchema, type DatabaseItem } from "idb-manager";
import { ws } from "./ws";
import { syncController } from "../fetch/sync";
import { syncManager } from "./syncManager";
import { emitter } from "../Emitter";
import { seedData } from "./samples";
ws.on('sync:change', async (data) => {
  // 1. Validación de entrada más robusta
  if (!data || typeof data.action !== 'string' || typeof data.storeName !== 'string' || !data.data) {
    console.warn('Evento sync:change recibido con datos inválidos:', data);
    return;
  }

  try {
    // 2. Obtener el manejador de la base de datos
    const { manager } = await initializeDatabase();
    
    // 3. Seleccionar el "store" dinámicamente para evitar repetición
    const store = manager.store(data.storeName);

    if (!store) {
      console.warn(`Store no encontrado: ${data.storeName}`);
      return;
    }
    const { items,id } = data.data;
    // 4. Usar un switch mucho más limpio y directo
    switch (data.action) {
      case 'create':
        await store.addMany(items);
        break;

      case 'update':
        await store.updateMany(items);
        
        break;

      case 'delete':
        // El método delete espera el ID, que usualmente está en data.data.id
        await store.delete(id);
        break;

      default:
        console.warn(`Acción desconocida en sync:change: ${data.action}`);
        return; // Salir si la acción no es reconocida
    }

    console.log(`[sync:change] Acción '${data.action}' aplicada al store '${data.storeName}'`, data.data);

  } catch (error) {
    // 5. Manejo de errores en caso de que falle una operación
    console.error('Error procesando el evento sync:change:', {
      error,
      data
    });
  }
});
// Database Schema
const pointSalesSchema: DatabaseSchema = {
  name: 'PointSales',
  version: 2,
  stores: [
    {
      name: 'products',
      keyPath: 'id',
      autoIncrement: false,
      indexes: [
        { name: 'name', keyPath: 'name', unique: false },
        { name: 'category', keyPath: 'category', unique: false },
        { name: 'price', keyPath: 'price', unique: false },
        { name: 'stock', keyPath: 'stock', unique: false }
      ]
    },
    {
      name: 'tickets',
      keyPath: 'id',
      autoIncrement: false,
      indexes: [
        { name: 'customerName', keyPath: 'customerData.name', unique: false },
        { name: 'customerDni', keyPath: 'customerData.dni', unique: false },
        { name: 'date', keyPath: 'date', unique: false },
        { name: 'orderType', keyPath: 'customerData.orderType', unique: false },
        { name: 'total', keyPath: 'total', unique: false },
        { name: 'ticketID', keyPath: 'ticketID', unique: true }
      ]
    },
    {
      name: 'customers',
      keyPath: 'id',
      autoIncrement: false,
      indexes: [
        { name: 'name', keyPath: 'name', unique: false },
        { name: 'phone', keyPath: 'phone', unique: false },
        { name: 'dni', keyPath: 'dni', unique: true }
      ]
    }
  ]
};

// Initialize database manager
const dbManager = new IndexedDBManager(pointSalesSchema, { autoInit: true });

// ============================================
// INTERFACES
// ============================================

export interface Product extends DatabaseItem {
  id: number;
  name: string;
  price: number;
  image: string;
  fallback: string;
  category: string;
  description?: string;
  stock?: number | null;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface CustomerData extends DatabaseItem {
  dni: string;
  name: string;
  phone?: string;
  address?: string;
  orderType?: 'dine-in' | 'takeout' | 'delivery' | '';
}

export interface TicketData extends DatabaseItem {
  ticketID: string;
  customerData: CustomerData;
  cartItems: CartItem[];
  name?: string;
  total: number;
  date: string;
  time: string;
  qrCodeDataURL?: string;
}

// ============================================
// CONFIGURACIÓN DE SINCRONIZACIÓN
// ============================================

let autoSyncEnabled = true;

export function setAutoSync(enabled: boolean) {
  autoSyncEnabled = enabled;
  console.log(`🔄 Auto-sync ${enabled ? 'enabled' : 'disabled'}`);
}

export function isAutoSyncEnabled(): boolean {
  return autoSyncEnabled;
}

// ============================================
// ESCUCHAR CAMBIOS REMOTOS
// ============================================

// Configurar listeners para cambios desde el servidor
emitter.on('sync:remote-change', async (data) => {
  console.log('📥 Applying remote change:', data);
  
  try {
    const manager = await dbManager;
    
    switch (data.action) {
      case 'create':
      case 'update':
        await manager.store(data.storeName).add(data.item);
        console.log(`✅ Applied ${data.action} to ${data.storeName}`);
        break;
        
      case 'delete':
        await manager.store(data.storeName).delete(data.item.id);
        console.log(`✅ Applied delete to ${data.storeName}`);
        break;
    }
    
    // Notificar a la UI
    emitter.emit(`${data.storeName}:updated`, data.item);
    
  } catch (error) {
    console.error('❌ Error applying remote change:', error);
  }
});

emitter.on('sync:server-data-received', async (data) => {
  console.log(`📥 Applying ${data.count} items to ${data.storeName}`);
  
  try {
    const {productStore, ticketStore, customerStore} = await initializeDatabase();
    const storeSelected = data.storeName === 'products' ? productStore : data.storeName === 'tickets' ? ticketStore : customerStore;
    // Aplicar datos en batch
    await storeSelected.clear();
    await storeSelected.addMany(data.data);
    console.log(`✅ Applied ${data.count} items to ${data.storeName}`);
    emitter.emit(`${data.storeName}:bulk-updated`, data.data);
    
  } catch (error) {
    console.error('❌ Error applying server data:', error,{data});
  }
});

emitter.on('sync:stock-update', async (updates) => {
  console.log('📦 Applying stock updates:', updates);
  
  try {
    const manager = await dbManager;
    const productStore = manager.store('products');
    
    for (const update of updates) {
      const product = await productStore.get(update.productId) as Product;
      if (product) {
        product.stock = update.stock;
        await productStore.update(product);
      }
    }
    
    console.log(`✅ Applied ${updates.length} stock updates`);
    emitter.emit('products:stock-updated', updates);
    
  } catch (error) {
    console.error('❌ Error applying stock updates:', error);
  }
});

// ============================================
// SERVICIO BASE CON SINCRONIZACIÓN
// ============================================

abstract class BaseService<T extends DatabaseItem> {
  protected manager: IndexedDBManager | null = null;
  protected abstract storeName: 'products' | 'tickets' | 'customers';
  
  async getManager() {
    if (!this.manager) {
      this.manager = await dbManager;
    }
    return this.manager;
  }

  /**
   * Intenta sincronizar un cambio, pero no falla si no puede
   */
  protected async trySyncChange(
    action: 'create' | 'update' | 'delete',
    data: T
  ): Promise<void> {
    if (!autoSyncEnabled) {
      console.log(`⏸️ Auto-sync disabled, skipping sync for ${this.storeName}`);
      return;
    }

    try {
      if (syncManager.isInitialized()) {
        await syncManager.trackChange(this.storeName, action, data);
      } else {
        console.warn(`⚠️ SyncManager not initialized, change not synced`);
      }
    } catch (error) {
      console.error(`❌ Failed to sync ${action} on ${this.storeName}:`, error);
      // No lanzamos el error, permitimos que la operación local continúe
    }
  }
}

// ============================================
// PRODUCT SERVICE
// ============================================

export class ProductService extends BaseService<Product> {
  protected storeName = 'products' as const;
  
  async getAllProducts(): Promise<Product[]> {
    const manager = await this.getManager();
    return manager.store('products').getAll() as Promise<Product[]>;
  }
  
  async getProductsByCategory(category: string): Promise<Product[]> {
    const manager = await this.getManager();
    return manager.store('products').filter({ category }) as Promise<Product[]>;
  }
  
  async getProductById(id: number): Promise<Product | null> {
    const manager = await this.getManager();
    return manager.store('products').get(id) as Promise<Product | null>;
  }
  
  async addProduct(product: Omit<Product, 'id'>): Promise<Product> {
    const manager = await this.getManager();
    const newProduct = await manager.store('products').add(product) as Product;
    
    await this.trySyncChange('create', newProduct);
    
    emitter.emit('products:created', newProduct);
    return newProduct;
  }

  async saveProduct(product: Product): Promise<Product> {
    const manager = await this.getManager();
    const existing = await this.getProductById(product.id);
    
    const savedProduct = await manager.store('products').add(product) as Product;
    
    await this.trySyncChange(existing ? 'update' : 'create', savedProduct);
    
    emitter.emit('products:saved', savedProduct);
    return savedProduct;
  }

  async updateProduct(product: Product): Promise<Product | null> {
    const manager = await this.getManager();
    const updated = await manager.store('products').update(product) as Product | null;
    
    if (updated) {
      await this.trySyncChange('update', updated);
      emitter.emit('products:updated', updated);
    }
    
    return updated;
  }
  
  async deleteProduct(id: number): Promise<boolean> {
    const product = await this.getProductById(id);
    const manager = await this.getManager();
    const deleted = await manager.store('products').delete(id);
    
    console.log("Deleted product:", { deleted, product, id });
    
    if (deleted && product) {
      await this.trySyncChange('delete', product);
      emitter.emit('products:deleted', { id, product });
    }
    
    return deleted;
  }

  async updateStock(productId: number, newStock: number): Promise<void> {
    const product = await this.getProductById(productId);
    if (product) {
      product.stock = newStock;
      await this.updateProduct(product);
      emitter.emit('products:stock-changed', { productId, stock: newStock });
    }
  }
  
  async searchProducts(query: string): Promise<Product[]> {
    const manager = await this.getManager();
    const searchResult = await manager.store('products').search({ name: query });
    return searchResult.items as Product[];
  }
  
  async getProductStats() {
    const manager = await this.getManager();
    return manager.store('products').getStats();
  }

  /**
   * Sincroniza productos desde el servidor
   */
  async syncFromServer(): Promise<void> {
    await syncManager.forceSyncStore('products');
  }
}

// ============================================
// TICKET SERVICE
// ============================================

export class TicketService extends BaseService<TicketData> {
  protected storeName = 'tickets' as const;
  
  async saveTicket(ticket: TicketData): Promise<TicketData> {
    const manager = await this.getManager();
    const savedTicket = await manager.store('tickets').add(ticket) as TicketData;
    
    await this.trySyncChange('create', savedTicket);
    
    emitter.emit('tickets:created', savedTicket);
    return savedTicket;
  }
  
  async getTicketById(ticketId: string): Promise<TicketData | null> {
    const manager = await this.getManager();
    return manager.store('tickets').get(ticketId) as Promise<TicketData | null>;
  }
  
  async getAllTickets(): Promise<TicketData[]> {
    const manager = await this.getManager();
    return manager.store('tickets').getAll() as Promise<TicketData[]>;
  }
  
  async getTicketsByDate(date: string): Promise<TicketData[]> {
    const manager = await this.getManager();
    return manager.store('tickets').filter({ date }) as Promise<TicketData[]>;
  }
  
  async getTicketsByCustomerDni(dni: string): Promise<TicketData[]> {
    const manager = await this.getManager();
    const searchResult = await manager.store('tickets').search({ 'customerData.dni': dni });
    return searchResult.items as TicketData[];
  }
  
  async getTicketsByOrderType(orderType: string): Promise<TicketData[]> {
    const allTickets = await this.getAllTickets();
    return allTickets.filter(ticket => ticket.customerData?.orderType === orderType);
  }
  
  async updateTicket(ticket: TicketData): Promise<TicketData | null> {
    const manager = await this.getManager();
    const updated = await manager.store('tickets').update(ticket) as TicketData | null;
    
    if (updated) {
      await this.trySyncChange('update', updated);
      emitter.emit('tickets:updated', updated);
    }
    
    return updated;
  }
  
  async deleteTicket(ticketId: string): Promise<boolean> {
    const ticket = await this.getTicketById(ticketId);
    const manager = await this.getManager();
    const deleted = await manager.store('tickets').delete(ticketId);
    
    if (deleted && ticket) {
      await this.trySyncChange('delete', ticket);
      emitter.emit('tickets:deleted', { id: ticketId, ticket });
    }
    
    return deleted;
  }
  
  async getTicketStats() {
    const manager = await this.getManager();
    return manager.store('tickets').getStats();
  }
  
  async getTotalSales(): Promise<number> {
    const tickets = await this.getAllTickets();
    return tickets.reduce((total, ticket) => total + ticket.total, 0);
  }
  
  async getSalesByDateRange(startDate: string, endDate: string): Promise<TicketData[]> {
    const allTickets = await this.getAllTickets();
    return allTickets.filter(ticket => 
      ticket.date >= startDate && ticket.date <= endDate
    );
  }

  async syncFromServer(): Promise<void> {
    await syncManager.forceSyncStore('tickets');
  }
}

// ============================================
// CUSTOMER SERVICE
// ============================================

export class CustomerService extends BaseService<CustomerData> {
  protected storeName = 'customers' as const;
  
  async saveCustomer(customer: CustomerData): Promise<CustomerData> {
    const manager = await this.getManager();
    const saved = await manager.store('customers').add(customer) as CustomerData;
    
    await this.trySyncChange('create', saved);
    
    emitter.emit('customers:created', saved);
    return saved;
  }
  
  async getCustomerByDni(dni: string): Promise<CustomerData | null> {
    const manager = await this.getManager();
    return manager.store('customers').get(dni) as Promise<CustomerData | null>;
  }
  
  async getAllCustomers(): Promise<CustomerData[]> {
    const manager = await this.getManager();
    return manager.store('customers').getAll() as Promise<CustomerData[]>;
  }
  
  async updateCustomer(customer: CustomerData): Promise<CustomerData | null> {
    const manager = await this.getManager();
    const updated = await manager.store('customers').update(customer) as CustomerData | null;
    
    if (updated) {
      await this.trySyncChange('update', updated);
      emitter.emit('customers:updated', updated);
    }
    
    return updated;
  }
  
  async deleteCustomer(dni: string): Promise<boolean> {
    const customer = await this.getCustomerByDni(dni);
    const manager = await this.getManager();
    const deleted = await manager.store('customers').delete(dni);
    
    if (deleted && customer) {
      await this.trySyncChange('delete', customer);
      emitter.emit('customers:deleted', { dni, customer });
    }
    
    return deleted;
  }
  
  async searchCustomers(query: string): Promise<CustomerData[]> {
    const manager = await this.getManager();
    const searchResult = await manager.store('customers').search({ name: query });
    return searchResult.items as CustomerData[];
  }
  
  async getCustomerStats() {
    const manager = await this.getManager();
    return manager.store('customers').getStats();
  }

  async syncFromServer(): Promise<void> {
    await syncManager.forceSyncStore('customers');
  }
}

// ============================================
// INSTANCIAS DE SERVICIOS
// ============================================

export const productService = new ProductService();
export const ticketService = new TicketService();
export const customerService = new CustomerService();

// ============================================
// API DE SINCRONIZACIÓN GLOBAL
// ============================================

export const syncService = {
  /**
   * Obtiene el estado actual de sincronización
   */
  getState() {
    return syncManager.getState();
  },

  /**
   * Obtiene estadísticas de sincronización
   */
  getStats() {
    return syncManager.getStats();
  },

  /**
   * Obtiene cambios pendientes
   */
  getPendingChanges() {
    return syncManager.getPendingChanges();
  },

  /**
   * Fuerza sincronización de todos los stores
   */
  async syncAll() {
    await syncManager.forceSyncAll();
  },

  /**
   * Fuerza sincronización de un store específico
   */
  async syncStore(storeName: 'products' | 'tickets' | 'customers') {
    await syncManager.forceSyncStore(storeName);
  },

  /**
   * Limpia la cola de sincronización
   */
  clearQueue() {
    syncManager.clearQueue();
  },

  /**
   * Inicia sincronización automática
   */
  startAutoSync() {
    syncManager.startAutoSync();
  },

  /**
   * Detiene sincronización automática
   */
  stopAutoSync() {
    syncManager.stopAutoSync();
  },

  /**
   * Verifica si está online
   */
  isOnline() {
    return syncManager.getState().isOnline;
  },

  /**
   * Verifica si está sincronizando
   */
  isSyncing() {
    return syncManager.getState().isSyncing;
  }
};

// ============================================
// INICIALIZACIÓN
// ============================================

async function initializeDatabase() {
  const manager = await dbManager;
  
  const productStore = manager.store('products');
  const ticketStore = manager.store('tickets');
  const customerStore = manager.store('customers');
  
  // Inicializar syncManager si no está inicializado
  if (!syncManager.isInitialized()) {
    await syncManager.initialize();
  }
  
  console.log('✅ Database and sync initialized');
  
  return {
    productStore,
    ticketStore,
    customerStore,
    manager
  };
}

export { initializeDatabase, seedData, dbManager, syncManager }