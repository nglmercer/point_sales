// src/types/types.ts
import type { DatabaseItem } from "idb-manager";

/**
 * Product interface
 */
export interface Product extends DatabaseItem {
  id: number;
  name: string;
  price: number;
  image: string;
  fallback: string;
  category: string;
  description?: string;
}

/**
 * Cart item interface
 */
export interface CartItem extends Product {
  quantity: number;
}

/**
 * Customer data interface
 */
export interface CustomerData extends DatabaseItem {
  dni: string;
  name: string;
  phone?: string;
  address?: string;
  orderType?: 'dine-in' | 'takeout' | 'delivery' | '';
}

/**
 * Ticket data interface
 */
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

/**
 * Sync Configuration
 */
export interface SyncConfig {
  serverUrl: string;
  dbName: string;
  autoSync?: boolean;
  syncInterval?: number; // in milliseconds
}

/**
 * Sync Response from server
 */
export interface SyncResponse<T = any> {
  success: boolean;
  data?: T[];
  synced?: number;
  count?: number;
  timestamp: string;
  error?: string;
}

/**
 * Backup Response
 */
export interface BackupResponse {
  database: string;
  backup: Record<string, any[]>;
  timestamp: string;
  stores: string[];
  totalRecords: number;
}

/**
 * Store names type
 */
export type StoreName = 'products' | 'tickets' | 'customers';

/**
 * Sync Status
 */
export interface SyncStatus {
  isConnected: boolean;
  lastSync: Date | null;
  isPending: boolean;
  error: string | null;
}

/**
 * Seed Data structure
 */
export interface SeedData {
  burgers: Product[];
  sandwiches: Product[];
  sides: Product[];
  drinks: Product[];
}