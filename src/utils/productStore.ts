import type{ DatabaseConfig, DatabaseItem } from "idb-manager";
import { IndexedDBManager } from "idb-manager";
const dbConfig: DatabaseConfig = {
  name: 'PointSales',
  version: 1,
  store: 'products'
};
const dbManager = new IndexedDBManager(dbConfig,{autoInit:true});
const sample = { id: 1, name: "Quarter Pounder With Cheese", price: 3.99, image: "/images/quarter-pounder-cheese.svg", fallback: "🍔" }
interface Product extends DatabaseItem {
  id: number;
  name: string;
  price: number;
  image: string;
  fallback: string;
  description?: string;
}
export {
    dbManager,
    dbConfig,
    type Product
}
//dbManager.add(sample)
