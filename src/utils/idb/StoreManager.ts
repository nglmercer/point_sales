// src/utils/storeManager.ts
import { IndexedDBManager, type DatabaseSchema, type DatabaseItem } from "idb-manager";
import { ws } from "./ws";
import { syncManager } from "./syncManager";
import { emitter } from "../Emitter";
import { seedData } from "./samples";
import { syncController } from "../fetch/sync";
const filterByValidValues = (array: any[], minValidValues: number) => {
  return array.filter(item => {
    const values = Object.values(item);

    const validValuesCount = values.filter(v => v != null).length;

    return validValuesCount >= minValidValues;
  });
};
ws.on('sync:change', async (data) => {
  try {
    await updateDB(data);
  } catch (error) {
    // 5. Manejo de errores en caso de que falle una operación
    console.error('Error procesando el evento sync:change:', {
      error,
      data
    });
  }
});
export async function updateDB(data:any) {
    if (!data || typeof data.action !== 'string' || typeof data.storeName !== 'string' || !data.data) {
      console.warn('Evento sync:change recibido con datos inválidos:', data);
      return false;
    }
    const { dbManager } = await initializeDatabase();
    
    const store = dbManager.store(data.storeName);
    const updateData = await syncController.getSync(data.storeName);

    const filteredData = filterByValidValues(updateData.data, 3);
    store.clear();
    store.addMany(filteredData);
    emitter.emit('sync:change', data);
    return true;
}
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
const taskSchema: DatabaseSchema = {
  name: 'sync_tasks',
  version: 1,
  stores: [
    {
      name: 'sync_tasks',
      keyPath: 'id',
      autoIncrement: false,
      indexes: [
        { name: 'timestamp', keyPath: 'timestamp', unique: false }
      ]
    }
  ]
};
// Initialize database manager
const dbManager = new IndexedDBManager(pointSalesSchema, { autoInit: true });
const taskManager = new IndexedDBManager(taskSchema, { autoInit: true });
const allEvents = ['add', 'update', 'delete', 'clear', 'import'];
let debounceTimer: NodeJS.Timeout;
let pendingEvents: any[] = [];

allEvents.forEach(event => {
  dbManager.on(event, (data) => {
    pendingEvents.push({ action: event, data });
    
    clearTimeout(debounceTimer);
    
    debounceTimer = setTimeout(() => {
      emitter.emit('sync:change', pendingEvents);
      pendingEvents = [];
    }, 300);
  });
});
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

let autoSyncEnabled = true;

export function setAutoSync(enabled: boolean) {
  autoSyncEnabled = enabled;
  console.log(`🔄 Auto-sync ${enabled ? 'enabled' : 'disabled'}`);
}

export function isAutoSyncEnabled(): boolean {
  return autoSyncEnabled;
}



abstract class BaseService<T extends DatabaseItem> {
  protected manager: IndexedDBManager | null = null;
  
  async getManager() {
    if (!this.manager) {
      this.manager = dbManager;
    }
    return this.manager;
  }

  /**
   * Intenta sincronizar un cambio, pero no falla si no puede
   */
  protected async trySyncChange(
    action: 'create' | 'update' | 'delete',
    data: T,
    storeName: 'products' | 'tickets' | 'customers'
  ): Promise<void> {
    if (!autoSyncEnabled) {
      console.log(`⏸️ Auto-sync disabled, skipping sync for ${storeName}`);
      return;
    }
    if (!storeName) {
      console.error(`❌ No store name provided for ${action} on ${storeName}`);
      return;
    }
    try {
      const taskStore = taskManager.store('sync_tasks');
      await taskStore.add({ action, data,storeName });
      await syncManager.processQueue();
    } catch (error) {
      console.error(`❌ Failed to sync ${action} on ${storeName}:`, error);
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
    
    await this.trySyncChange('create', newProduct,'products');
    
    emitter.emit('products:created', newProduct);
    return newProduct;
  }

  async saveProduct(product: Product): Promise<Product> {
    const manager = await this.getManager();
    const existing = await this.getProductById(product.id);
    
    const savedProduct = await manager.store('products').add(product) as Product;
    
    await this.trySyncChange(existing ? 'update' : 'create', savedProduct,'products');
    
    emitter.emit('products:saved', savedProduct);
    return savedProduct;
  }

  async updateProduct(product: Product): Promise<Product | null> {
    const manager = await this.getManager();
    const updated = await manager.store('products').update(product) as Product | null;
    
    if (updated) {
      await this.trySyncChange('update', updated,'products');
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
      await this.trySyncChange('delete', product,'products');
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


}

// ============================================
// TICKET SERVICE
// ============================================

export class TicketService extends BaseService<TicketData> {
  protected storeName = 'tickets' as const;
  
  async saveTicket(ticket: TicketData): Promise<TicketData> {
    const manager = await this.getManager();
    const savedTicket = await manager.store('tickets').add(ticket) as TicketData;
    
    await this.trySyncChange('create', savedTicket,'tickets');
    
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
      await this.trySyncChange('update', updated,'tickets');
      emitter.emit('tickets:updated', updated);
    }
    
    return updated;
  }
  
  async deleteTicket(ticketId: string): Promise<boolean> {
    const ticket = await this.getTicketById(ticketId);
    const manager = await this.getManager();
    const deleted = await manager.store('tickets').delete(ticketId);
    
    if (deleted && ticket) {
      await this.trySyncChange('delete', ticket,'tickets');
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


}

// ============================================
// CUSTOMER SERVICE
// ============================================

export class CustomerService extends BaseService<CustomerData> {
  protected storeName = 'customers' as const;
  
  async saveCustomer(customer: CustomerData): Promise<CustomerData> {
    const manager = await this.getManager();
    const saved = await manager.store('customers').add(customer) as CustomerData;
    
    await this.trySyncChange('create', saved,'customers');
    
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
      await this.trySyncChange('update', updated,'customers');
      emitter.emit('customers:updated', updated);
    }
    
    return updated;
  }
  
  async deleteCustomer(dni: string): Promise<boolean> {
    const customer = await this.getCustomerByDni(dni);
    const manager = await this.getManager();
    const deleted = await manager.store('customers').delete(dni);
    
    if (deleted && customer) {
      await this.trySyncChange('delete', customer,'customers');
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


}

// ============================================
// INSTANCIAS DE SERVICIOS
// ============================================

export const productService = new ProductService();
export const ticketService = new TicketService();
export const customerService = new CustomerService();

async function initializeDatabase() {
  const productStore = dbManager.store('products');
  const ticketStore = dbManager.store('tickets');
  const customerStore = dbManager.store('customers');
  const taskStore = taskManager.store('sync_tasks');
  dbManager.openDatabase();
  syncProducts();
  console.log('✅ Database and sync initialized');
  
  return {
    productStore,
    ticketStore,
    customerStore,
    taskStore,
    dbManager,
    taskManager
  };
}
async function syncProducts(){
  const updateData = await syncController.getSync('products');
  if (updateData && Array.isArray(updateData.data)){
    syncManager.initialize();
    const filteredData = filterByValidValues(updateData.data, 3);
    dbManager.store('products').clear();
    dbManager.store('products').addMany(filteredData);
    console.log('Products updated from sync');
  }
}
export { initializeDatabase, seedData, dbManager,taskManager,syncProducts }