// src/utils/storeManager.js
import { IndexedDBManager, type DatabaseSchema } from "idb-manager";
import type { DatabaseItem } from "idb-manager";
// Define the complete database schema with multiple stores
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
        { name: 'price', keyPath: 'price', unique: false }
      ]
    },
    {
      name: 'tickets',
      keyPath: 'ticketID',
      autoIncrement: false,
      indexes: [
        { name: 'customerName', keyPath: 'customerData.name', unique: false },
        { name: 'customerDni', keyPath: 'customerData.dni', unique: false },
        { name: 'date', keyPath: 'date', unique: false },
        { name: 'orderType', keyPath: 'customerData.orderType', unique: false },
        { name: 'total', keyPath: 'total', unique: false }
      ]
    },
    {
      name: 'customers',
      keyPath: 'dni',
      autoIncrement: false,
      indexes: [
        { name: 'name', keyPath: 'name', unique: false },
        { name: 'phone', keyPath: 'phone', unique: false }
      ]
    }
  ]
};

// Initialize the manager with the complete schema
const dbManager = new IndexedDBManager(pointSalesSchema,{autoInit:true});

// Product interface
export interface Product extends DatabaseItem {
  id: number;
  name: string;
  price: number;
  image: string;
  fallback: string;
  category: string;
  description?: string;
}

// Cart item interface
export interface CartItem extends Product {
  quantity: number;
}

// Customer data interface
export interface CustomerData extends DatabaseItem {
  dni: string;
  name: string;
  phone?: string;
  address?: string;
  orderType: 'dine-in' | 'takeout' | 'delivery' | '';
}

// Ticket data interface
export interface TicketData extends DatabaseItem {
  ticketID: string;
  customerData: CustomerData;
  cartItems: CartItem[];
  total: number;
  date: string;
  time: string;
  qrCodeDataURL: string;
}

// Seed data
const seedData = {
  burgers: [
    { id: 1, name: "Quarter Pounder With Cheese", price: 3.99, image: "/images/quarter-pounder-cheese.svg", fallback: "🍔", category: "burgers" },
    { id: 2, name: "Double Quarter Pounder With Cheese", price: 4.79, image: "/images/double-quarter-pounder.jpg", fallback: "🍔", category: "burgers" },
    { id: 3, name: "Quarter Pounder With Cheese Deluxe", price: 4.29, image: "/images/quarter-pounder-deluxe.jpg", fallback: "🍔", category: "burgers" },
    { id: 4, name: "Big Mac", price: 3.99, image: "/images/big-mac.jpg", fallback: "🍔", category: "burgers" },
    { id: 5, name: "McDouble", price: 1.99, image: "/images/mcdouble.jpg", fallback: "🍔", category: "burgers" },
    { id: 6, name: "Quarter Pounder With Cheese Bacon", price: 4.99, image: "/images/quarter-pounder-bacon.jpg", fallback: "🍔", category: "burgers" }
  ],
  sandwiches: [
    { id: 7, name: "Chicken Sandwich", price: 4.49, image: "/images/chicken-sandwich.jpg", fallback: "🥪", category: "sandwiches" },
    { id: 8, name: "Fish Sandwich", price: 3.79, image: "/images/fish-sandwich.jpg", fallback: "🥪", category: "sandwiches" }
  ],
  sides: [
    { id: 9, name: "Large Fries", price: 2.99, image: "/images/large-fries.svg", fallback: "🍟", category: "sides" },
    { id: 10, name: "Medium Fries", price: 2.49, image: "/images/medium-fries.jpg", fallback: "🍟", category: "sides" },
    { id: 11, name: "Small Fries", price: 1.99, image: "/images/small-fries.jpg", fallback: "🍟", category: "sides" }
  ],
  drinks: [
    { id: 12, name: "Medium Soda", price: 1.99, image: "/images/medium-soda.svg", fallback: "🥤", category: "drinks" },
    { id: 13, name: "Large Soda", price: 2.29, image: "/images/large-soda.jpg", fallback: "🥤", category: "drinks" },
    { id: 14, name: "M&Ms McFlurry", price: 3.99, image: "/images/mcflurry.jpg", fallback: "🍦", category: "drinks" }
  ]
};

/**
 * Initialize the database and seed with initial data if empty
 */
async function initializeDatabase() {
  const manager = await dbManager;
  
  // Get store proxies
  const productStore = manager.store('products');
  const ticketStore = manager.store('tickets');
  const customerStore = manager.store('customers');
  
  // Check if products store is empty and seed if necessary
  const existingProducts = await productStore.getAll();
  if (!existingProducts || existingProducts.length === 0) {
    console.log("Products store is empty, seeding with initial products.");
    const allProductsToSeed = Object.values(seedData).flat();
    await productStore.addMany(allProductsToSeed);
    console.log("Products seeded successfully.");
  } else {
    console.log("Products store already contains data, skipping seed.");
  }
  
  return manager;
}

/**
 * Product Store Operations
 */
export class ProductService {
  private manager: IndexedDBManager | null = null;
  
  async getManager() {
    if (!this.manager) {
      this.manager = await dbManager;
    }
    return this.manager;
  }
  
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
    return manager.store('products').add(product) as Promise<Product>;
  }
  async saveProduct(product: Product): Promise<Product> {
    const manager = await this.getManager();
    return manager.store('products').add(product) as Promise<Product>;
  }
  async updateProduct(product: Product): Promise<Product | null> {
    const manager = await this.getManager();
    return manager.store('products').update(product) as Promise<Product | null>;
  }
  
  async deleteProduct(id: number): Promise<boolean> {
    const manager = await this.getManager();
    return manager.store('products').delete(id);
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

/**
 * Ticket Store Operations
 */
export class TicketService {
  private manager: IndexedDBManager | null = null;
  
  async getManager() {
    if (!this.manager) {
      this.manager = await dbManager;
    }
    return this.manager;
  }
  
  async saveTicket(ticket: TicketData): Promise<TicketData> {
    const manager = await this.getManager();
    return manager.store('tickets').add(ticket) as Promise<TicketData>;
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
    const manager = await this.getManager();
    const searchResult = await manager.store('tickets').search({ 'customerData.orderType': orderType });
    return searchResult.items as TicketData[];
  }
  
  async updateTicket(ticket: TicketData): Promise<TicketData | null> {
    const manager = await this.getManager();
    return manager.store('tickets').update(ticket) as Promise<TicketData | null>;
  }
  
  async deleteTicket(ticketId: string): Promise<boolean> {
    const manager = await this.getManager();
    return manager.store('tickets').delete(ticketId);
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

/**
 * Customer Store Operations
 */
export class CustomerService {
  private manager: IndexedDBManager | null = null;
  
  async getManager() {
    if (!this.manager) {
      this.manager = await dbManager;
    }
    return this.manager;
  }
  
  async saveCustomer(customer: CustomerData): Promise<CustomerData> {
    const manager = await this.getManager();
    return manager.store('customers').add(customer) as Promise<CustomerData>;
  }
  
  async getCustomerByDni(dni: string): Promise<CustomerData | null> {
    const manager = await this.getManager();
    return manager.store('customers').get(dni) as Promise<CustomerData | null>;
  }
  
  async getAllCustomers(): Promise<CustomerData[]> {
    const manager = await this.getManager();
    return manager.store('customers').getAll() as Promise<CustomerData[]>
  }
  
  async updateCustomer(customer: CustomerData): Promise<CustomerData | null> {
    const manager = await this.getManager();
    return manager.store('customers').update(customer) as Promise<CustomerData | null>;
  }
  
  async deleteCustomer(dni: string): Promise<boolean> {
    const manager = await this.getManager();
    return manager.store('customers').delete(dni);
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

// Create service instances
export const productService = new ProductService();
export const ticketService = new TicketService();
export const customerService = new CustomerService();

// Export initialization function
export { initializeDatabase, seedData };

// Export the manager for direct access if needed
export { dbManager };