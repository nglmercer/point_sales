import { type Product as DBProduct} from '@/utils/StoreManager.js'
import { type DatabaseConfig, IndexedDBManager } from 'idb-manager';
const dbConfig: DatabaseConfig = {
  name: 'PointSales',
  version: 2,
  store: 'tickets'
};

// Creamos la instancia. Con autoInit: true, intentará abrir la DB al instanciar.
const ticketDBManager = new IndexedDBManager(dbConfig, { autoInit: true });
export interface CartItem extends DBProduct {
  quantity: number;
}
export interface CustomerData {
  name: string;
  dni: string;
  phone?: string;
  address?: string;
  orderType: 'dine-in' | 'takeout' | 'delivery' | '';
}
export interface TicketData {
  ticketID: string;
  customerData: CustomerData;
  cartItems: CartItem[];
  total: number;
  date: string;
  time: string;
  qrCodeDataURL: string;
}
export { ticketDBManager }
