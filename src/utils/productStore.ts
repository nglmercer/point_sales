// src/utils/productStore.js

import { IndexedDBManager } from "idb-manager";
import type { DatabaseConfig, DatabaseItem } from "idb-manager";

const dbConfig: DatabaseConfig = {
  name: 'PointSales',
  version: 1,
  store: 'products'
};

// Creamos la instancia. Con autoInit: true, intentará abrir la DB al instanciar.
const dbManager = new IndexedDBManager(dbConfig, { autoInit: true });

interface Product extends DatabaseItem {
  id: number;
  name: string;
  price: number;
  image: string;
  fallback: string;
  category: string;
  description?: string;
}

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
 * Ensures the database is initialized and seeds it with initial data if it's empty.
 */
async function initializeDatabase() {
  // `dbManager.init()` devuelve una promesa que se resuelve cuando la DB está lista.
  await dbManager.openDatabase();
  
  const existingItems = await dbManager.getAll();
  
  // Solo sembramos si la base de datos está vacía.
  if (!existingItems || existingItems.length === 0) {
    console.log("Database is empty, seeding with initial products.");
    const allProductsToSeed = Object.values(seedData).flat();
    await dbManager.addMany(allProductsToSeed);
    console.log("Database seeded successfully.");
  } else {
    console.log("Database already contains data, skipping seed.");
  }
}

// Ya no llamamos a seedDatabase() aquí, dejamos que el componente controle la inicialización.

export {
    dbManager,
    initializeDatabase, // <-- Exportamos la nueva función
    dbConfig,
    type Product,
    seedData
}