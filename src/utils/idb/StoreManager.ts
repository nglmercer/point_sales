// src/utils/storeManager.js
import { IndexedDBManager, type DatabaseSchema, type DatabaseItem } from "idb-manager";
import { ws } from "./ws";
import { syncManager } from "./syncManager";
import { seedData } from "./samples";

// WebSocket setup
ws.on('connect', () => console.log('WebSocket connected'));
ws.on('disconnect', () => console.log('WebSocket disconnected'));
ws.on('sync', (...args) => {
  console.log('Received sync data:', args);
  // Handle incoming sync data
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

/**
 * Flag para habilitar/deshabilitar sincronización automática
 * Útil para desarrollo o para deshabilitar temporalmente
 */
let autoSyncEnabled = true;

export function setAutoSync(enabled: boolean) {
  autoSyncEnabled = enabled;
  console.log(`🔄 Auto-sync ${enabled ? 'enabled' : 'disabled'}`);
}

export function isAutoSyncEnabled(): boolean {
  return autoSyncEnabled;
}

// ============================================
// SERVICIO BASE CON SINCRONIZACIÓN
// ============================================

/**
 * Clase base para servicios con sincronización automática
 */
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
      // Verifica si syncManager está inicializado
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
// PRODUCT SERVICE (Unificado con Sync)
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
  
  /**
   * Añade un nuevo producto (con auto-sync)
   */
  async addProduct(product: Omit<Product, 'id'>): Promise<Product> {
    const manager = await this.getManager();
    const newProduct = await manager.store('products').add(product) as Product;
    
    // Sincronizar cambio
    await this.trySyncChange('create', newProduct);
    
    return newProduct;
  }

  /**
   * Guarda o actualiza un producto (con auto-sync)
   */
  async saveProduct(product: Product): Promise<Product> {
    const manager = await this.getManager();
    const existing = await this.getProductById(product.id);
    
    const savedProduct = await manager.store('products').add(product) as Product;
    
    // Sincronizar como create o update según corresponda
    await this.trySyncChange(existing ? 'update' : 'create', savedProduct);
    
    return savedProduct;
  }

  /**
   * Actualiza un producto existente (con auto-sync)
   */
  async updateProduct(product: Product): Promise<Product | null> {
    const manager = await this.getManager();
    const updated = await manager.store('products').update(product) as Product | null;
    
    if (updated) {
      await this.trySyncChange('update', updated);
    }
    
    return updated;
  }
  
  /**
   * Elimina un producto (con auto-sync)
   */
  async deleteProduct(id: number): Promise<boolean> {
    const product = await this.getProductById(id);
    const manager = await this.getManager();
    const deleted = await manager.store('products').delete(id);
    
    if (deleted && product) {
      await this.trySyncChange('delete', product);
    }
    
    return deleted;
  }

  /**
   * Actualiza el stock de un producto (con auto-sync)
   */
  async updateStock(productId: number, newStock: number): Promise<void> {
    const product = await this.getProductById(productId);
    if (product) {
      product.stock = newStock;
      await this.updateProduct(product);
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
// TICKET SERVICE (Unificado con Sync)
// ============================================

export class TicketService extends BaseService<TicketData> {
  protected storeName = 'tickets' as const;
  
  /**
   * Guarda un nuevo ticket (con auto-sync)
   */
  async saveTicket(ticket: TicketData): Promise<TicketData> {
    const manager = await this.getManager();
    const savedTicket = await manager.store('tickets').add(ticket) as TicketData;
    
    await this.trySyncChange('create', savedTicket);
    
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
  
  /**
   * Actualiza un ticket (con auto-sync)
   */
  async updateTicket(ticket: TicketData): Promise<TicketData | null> {
    const manager = await this.getManager();
    const updated = await manager.store('tickets').update(ticket) as TicketData | null;
    
    if (updated) {
      await this.trySyncChange('update', updated);
    }
    
    return updated;
  }
  
  /**
   * Elimina un ticket (con auto-sync)
   */
  async deleteTicket(ticketId: string): Promise<boolean> {
    const ticket = await this.getTicketById(ticketId);
    const manager = await this.getManager();
    const deleted = await manager.store('tickets').delete(ticketId);
    
    if (deleted && ticket) {
      await this.trySyncChange('delete', ticket);
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
// CUSTOMER SERVICE (Unificado con Sync)
// ============================================

export class CustomerService extends BaseService<CustomerData> {
  protected storeName = 'customers' as const;
  
  /**
   * Guarda un nuevo cliente (con auto-sync)
   */
  async saveCustomer(customer: CustomerData): Promise<CustomerData> {
    const manager = await this.getManager();
    const saved = await manager.store('customers').add(customer) as CustomerData;
    
    await this.trySyncChange('create', saved);
    
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
  
  /**
   * Actualiza un cliente (con auto-sync)
   */
  async updateCustomer(customer: CustomerData): Promise<CustomerData | null> {
    const manager = await this.getManager();
    const updated = await manager.store('customers').update(customer) as CustomerData | null;
    
    if (updated) {
      await this.trySyncChange('update', updated);
    }
    
    return updated;
  }
  
  /**
   * Elimina un cliente (con auto-sync)
   */
  async deleteCustomer(dni: string): Promise<boolean> {
    const customer = await this.getCustomerByDni(dni);
    const manager = await this.getManager();
    const deleted = await manager.store('customers').delete(dni);
    
    if (deleted && customer) {
      await this.trySyncChange('delete', customer);
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
// INSTANCIAS DE SERVICIOS (Solo una versión)
// ============================================

export const productService = new ProductService();
export const ticketService = new TicketService();
export const customerService = new CustomerService();

// ============================================
// INICIALIZACIÓN
// ============================================

async function initializeDatabase() {
  const manager = await dbManager;
  
  const productStore = manager.store('products');
  const ticketStore = manager.store('tickets');
  const customerStore = manager.store('customers');
  
  return {
    productStore,
    ticketStore,
    customerStore,
    manager
  };
}

async function initializeSync() {
  try {
    await syncManager.initialize({
      serverUrl: 'http://localhost:3000',
      dbName: 'PointSales',
      autoSync: true,
      syncInterval: 30000, // 30 segundos
      backupInterval: 300000 // 5 minutos
    });

    console.log('✅ SyncManager initialized');

    const status = syncManager.getStatus();
    console.log('📊 Sync Status:', status);

    await syncManager.syncAll();
    
    const backupInfo = syncManager.getBackupInfo();
    console.log('💾 Backup Info:', backupInfo);

  } catch (error) {
    console.error('❌ Failed to initialize sync:', error);
  }
}

// Inicializar sincronización
initializeSync();
export { initializeDatabase, seedData, dbManager };