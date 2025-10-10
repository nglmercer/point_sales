const seedData = {
  burgers: [
    { id: 1, name: "Quarter Pounder With Cheese", price: 3.99, image: "/images/quarter-pounder-cheese.svg", fallback: "🍔", category: "burgers", stock: 15 },
    { id: 2, name: "Double Quarter Pounder With Cheese", price: 4.79, image: "/images/double-quarter-pounder.jpg", fallback: "🍔", category: "burgers", stock: 8 },
    { id: 3, name: "Quarter Pounder With Cheese Deluxe", price: 4.29, image: "/images/quarter-pounder-deluxe.jpg", fallback: "🍔", category: "burgers", stock: 0 }, // Out of stock
    { id: 4, name: "Big Mac", price: 3.99, image: "/images/big-mac.jpg", fallback: "🍔", category: "burgers", stock: 20 },
    { id: 5, name: "McDouble", price: 1.99, image: "/images/mcdouble.jpg", fallback: "🍔", category: "burgers" }, // No stock tracking
    { id: 6, name: "Quarter Pounder With Cheese Bacon", price: 4.99, image: "/images/quarter-pounder-bacon.jpg", fallback: "🍔", category: "burgers", stock: 5 }
  ],
  sandwiches: [
    { id: 7, name: "Chicken Sandwich", price: 4.49, image: "/images/chicken-sandwich.jpg", fallback: "🥪", category: "sandwiches", stock: 12 },
    { id: 8, name: "Fish Sandwich", price: 3.79, image: "/images/fish-sandwich.jpg", fallback: "🥪", category: "sandwiches", stock: 3 }
  ],
  sides: [
    { id: 9, name: "Large Fries", price: 2.99, image: "/images/large-fries.svg", fallback: "🍟", category: "sides", stock: 25 },
    { id: 10, name: "Medium Fries", price: 2.49, image: "/images/medium-fries.jpg", fallback: "🍟", category: "sides", stock: 18 },
    { id: 11, name: "Small Fries", price: 1.99, image: "/images/small-fries.jpg", fallback: "🍟", category: "sides" } // No stock tracking
  ],
  drinks: [
    { id: 12, name: "Medium Soda", price: 1.99, image: "/images/medium-soda.svg", fallback: "🥤", category: "drinks", stock: 50 },
    { id: 13, name: "Large Soda", price: 2.29, image: "/images/large-soda.jpg", fallback: "🥤", category: "drinks", stock: 30 },
    { id: 14, name: "M&Ms McFlurry", price: 3.99, image: "/images/mcflurry.jpg", fallback: "🍦", category: "drinks", stock: 0 } // Out of stock
  ]
};
export { seedData };