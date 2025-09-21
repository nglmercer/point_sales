<template>
  <div class="h-screen">
    <!-- Desktop Layout -->
    <div class="hidden md:flex h-full">
      <!-- Desktop Left Sidebar Navigation -->
      <div class="w-24 bg-white border-r shadow-sm flex flex-col">
        <!-- Logo -->
        <div class="p-4 border-b">
          <div class="text-yellow-500 text-2xl font-bold text-center">M</div>
        </div>
        
        <!-- Category Navigation -->
        <div class="flex-1 py-4">
          <NavigationContainer
            :items="categoryNavItems"
            direction="vertical"
            :show-labels="true"
            :show-indicators="false"
            :show-dots="false"
            icon-size="24px"
            item-spacing="8px"
            @item-click="handleCategoryNavClick"
          >
            <template #item="{ item, index, isActive }">
              <button
                :class="[
                  'flex flex-col items-center justify-center w-full h-full py-3 px-2 text-xs font-medium transition-colors duration-200 rounded-lg',
                  isActive
                    ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/50'
                    : 'text-gray-600 hover:text-gray-700 hover:bg-gray-50 dark:hover:text-gray-300 dark:hover:bg-gray-700'
                ]"
              >
                <span class="material-symbols-outlined mb-1" style="font-size: 24px;">
                  {{ item.icon }}
                </span>
                <span class="text-center text-xs leading-tight">{{ item.label }}</span>
              </button>
            </template>
          </NavigationContainer>
        </div>
      </div>

      <!-- Main Content Area -->
      <div class="flex-1 flex flex-col">
        <!-- Desktop Header with Search -->
        <div class="bg-white shadow-sm border-b p-4 w-full">
          <div class="flex items-center justify-between w-full">
            <div class="flex-1 w-full">
              <input
                type="text"
                v-model="searchQuery"
                placeholder="Search menu items..."
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                @input="handleSearch(searchQuery)"
              />
            </div>
          </div>
        </div>

        <!-- Content and Sidebar Container -->
        <div class="flex-1 flex">
          <!-- Product Grid Area -->
          <div class="flex-1 overflow-y-auto w-full">
            <div class="p-6 w-full">
              <div class="mb-4 w-full">
                <h2 class="text-xl font-semibold">{{ getCurrentCategoryName() }}</h2>
                <p class="text-sm text-gray-600 mt-1">{{ filteredProducts.length }} items available</p>
              </div>
              <div class="w-full grid grid-cols-3 gap-6">
                <ProductCard 
                  v-for="product in filteredProducts" 
                  :key="product.id"
                  :product="product"
                  @add-to-cart="addToCart"
                />
              </div>
            </div>
          </div>

          <!-- Order Summary / Ticket Form Sidebar -->
          <div class="w-80 border-l bg-gray-50">
            <div v-if="!showTicketForm">
              <OrderSummary 
                :cart-items="cart"
                @update-quantity="updateQuantity"
                @remove-item="removeFromCart"
                @clear-cart="clearCart"
                @process-payment="processPayment"
                @show-ticket-form="showTicketForm = true"
              />
            </div>
            <div v-else>
              <TicketForm 
                :cart-items="cart"
                :mobile="false"
                @ticket-generated="handleTicketGenerated"
                @back-to-cart="showTicketForm = false"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile Layout -->
    <div class="md:hidden h-full flex flex-col">
      <!-- Mobile Header -->
      <div class="bg-white shadow-sm border-b p-4 w-full">
        <div class="flex items-center justify-between w-full">
          <div class="text-yellow-500 text-2xl font-bold">M</div>
          <div class="flex items-center space-x-4">
            <!-- Cart Icon with Badge -->
            <button 
              class="relative p-2"
              @click="currentMobileView = 'cart'"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5-6M20 13v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6m16 0V9a2 2 0 00-2-2H6a2 2 0 00-2 2v4.01"></path>
              </svg>
              <span v-if="cartItemCount > 0" class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {{ cartItemCount }}
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- Mobile Navigation Tabs -->
      <div class="bg-white border-b shadow-sm w-full">
        <div class="flex w-full" role="tablist" aria-label="Mobile navigation">
          <button 
            class="flex-1 py-3 px-2 text-center border-b-2 transition-all duration-200 text-sm font-medium relative"
            :class="getMobileTabClasses('menu')"
            :aria-selected="currentMobileView === 'menu'"
            :aria-controls="'panel-menu'"
            role="tab"
            @click="handleMobileTabClick('menu')"
          >
            <span class="relative z-10">Menu</span>
            <div v-if="currentMobileView === 'menu'" class="absolute inset-0 bg-blue-50 rounded-t-lg"></div>
          </button>
          <button 
            class="flex-1 py-3 px-2 text-center border-b-2 transition-all duration-200 text-sm font-medium relative"
            :class="getMobileTabClasses('cart')"
            :aria-selected="currentMobileView === 'cart'"
            :aria-controls="'panel-cart'"
            role="tab"
            @click="handleMobileTabClick('cart')"
          >
            <span class="relative z-10 flex items-center justify-center gap-1">
              Cart
              <span v-if="cartItemCount > 0" class="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center">
                {{ cartItemCount }}
              </span>
            </span>
            <div v-if="currentMobileView === 'cart'" class="absolute inset-0 bg-blue-50 rounded-t-lg"></div>
          </button>
          <button 
            class="flex-1 py-3 px-2 text-center border-b-2 transition-all duration-200 text-sm font-medium relative"
            :class="getMobileTabClasses('ticket')"
            :aria-selected="currentMobileView === 'ticket'"
            :aria-controls="'panel-ticket'"
            role="tab"
            @click="handleMobileTabClick('ticket')"
          >
            <span class="relative z-10">Ticket</span>
            <div v-if="currentMobileView === 'ticket'" class="absolute inset-0 bg-blue-50 rounded-t-lg"></div>
          </button>
        </div>
      </div>

      <!-- Mobile Content -->
      <div class="flex-1 overflow-hidden pb-20 w-full">
        <!-- Unified Menu View -->
        <div 
          v-show="currentMobileView === 'menu'" 
          id="panel-menu"
          class="h-full overflow-y-auto w-full"
          role="tabpanel"
          aria-labelledby="tab-menu"
          :aria-hidden="currentMobileView !== 'menu'"
        >
          <div class="p-4 w-full">
            <!-- Search Bar -->
            <div class="mb-4 w-full">
              <input
                type="text"
                v-model="searchQuery"
                placeholder="Search menu items..."
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                @input="handleSearch(searchQuery)"
              />
            </div>

            <!-- Current Category Header -->
            <div class="mb-4 w-full">
              <h2 class="text-xl font-semibold">{{ getCurrentCategoryName() }}</h2>
              <p class="text-sm text-gray-600 mt-1">{{ filteredProducts.length }} items available</p>
            </div>

            <!-- Products Grid -->
            <div class="w-full grid grid-cols-2 gap-4">
              <ProductCard 
                v-for="product in filteredProducts" 
                :key="product.id"
                :product="product"
                @add-to-cart="addToCart"
                :mobile="true"
              />
            </div>
          </div>
        </div>

        <!-- Cart View -->
        <div 
          v-show="currentMobileView === 'cart'" 
          id="panel-cart"
          class="h-full"
          role="tabpanel"
          aria-labelledby="tab-cart"
          :aria-hidden="currentMobileView !== 'cart'"
        >
          <OrderSummary 
            :cart-items="cart"
            @update-quantity="updateQuantity"
            @remove-item="removeFromCart"
            @clear-cart="clearCart"
            @process-payment="processPayment"
            :mobile="true"
          />
        </div>

        <!-- Ticket View -->
        <div 
          v-show="currentMobileView === 'ticket'" 
          id="panel-ticket"
          class="h-full"
          role="tabpanel"
          aria-labelledby="tab-ticket"
          :aria-hidden="currentMobileView !== 'ticket'"
        >
          <TicketForm 
            :cart-items="cart"
            :mobile="true"
            @ticket-generated="handleTicketGenerated"
          />
        </div>
      </div>

      <!-- Mobile Bottom Category Navigation -->
      <div
        v-if="currentMobileView === 'menu'"
       class="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50 md:hidden">
        <NavigationContainer
          :items="categoryNavItems"
          direction="horizontal"
          :show-labels="true"
          :show-indicators="false"
          :show-dots="false"
          icon-size="20px"
          item-spacing="2px"
          @item-click="handleCategoryNavClick"
        >
          <template #item="{ item, index, isActive }">
            <button
              :class="[
                'flex flex-col items-center justify-center w-full h-full py-2 px-1 text-xs font-medium transition-colors duration-200 min-w-0 flex-1',
                isActive
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              ]"
            >
              <span class="material-symbols-outlined mb-1" style="font-size: 20px;">
                {{ item.icon }}
              </span>
              <span class="text-center text-xs truncate">{{ item.label }}</span>
            </button>
          </template>
        </NavigationContainer>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import NavigationContainer from './NavigationContainer.vue'
import ProductCard from './ProductCard.vue'
import OrderSummary from './OrderSummary.vue'
import TicketForm from './TicketForm.vue'

// Food data with proper image URLs and fallbacks
const foodData = {
  burgers: [
    { id: 1, name: "Quarter Pounder With Cheese", price: 3.99, image: "/images/quarter-pounder-cheese.svg", fallback: "🍔" },
    { id: 2, name: "Double Quarter Pounder With Cheese", price: 4.79, image: "/images/double-quarter-pounder.jpg", fallback: "🍔" },
    { id: 3, name: "Quarter Pounder With Cheese Deluxe", price: 4.29, image: "/images/quarter-pounder-deluxe.jpg", fallback: "🍔" },
    { id: 4, name: "Big Mac", price: 3.99, image: "/images/big-mac.jpg", fallback: "🍔" },
    { id: 5, name: "McDouble", price: 1.99, image: "/images/mcdouble.jpg", fallback: "🍔" },
    { id: 6, name: "Quarter Pounder With Cheese Bacon", price: 4.99, image: "/images/quarter-pounder-bacon.jpg", fallback: "🍔" }
  ],
  sandwiches: [
    { id: 7, name: "Chicken Sandwich", price: 4.49, image: "/images/chicken-sandwich.jpg", fallback: "🥪" },
    { id: 8, name: "Fish Sandwich", price: 3.79, image: "/images/fish-sandwich.jpg", fallback: "🥪" }
  ],
  sides: [
    { id: 9, name: "Large Fries", price: 2.99, image: "/images/large-fries.svg", fallback: "🍟" },
    { id: 10, name: "Medium Fries", price: 2.49, image: "/images/medium-fries.jpg", fallback: "🍟" },
    { id: 11, name: "Small Fries", price: 1.99, image: "/images/small-fries.jpg", fallback: "🍟" }
  ],
  drinks: [
    { id: 12, name: "Medium Soda", price: 1.99, image: "/images/medium-soda.svg", fallback: "🥤" },
    { id: 13, name: "Large Soda", price: 2.29, image: "/images/large-soda.jpg", fallback: "🥤" },
    { id: 14, name: "M&Ms McFlurry", price: 3.99, image: "/images/mcflurry.jpg", fallback: "🍦" }
  ]
}

// Categories configuration
const categories = [
  { id: 'meals', name: 'Meals', icon: 'restaurant' },
  { id: 'burgers', name: 'Burgers', icon: 'lunch_dining' },
  { id: 'sandwiches', name: 'Sandwiches', icon: 'fastfood' },
  { id: 'sides', name: 'Sides', icon: 'fastfood' },
  { id: 'drinks', name: 'Drinks', icon: 'local_drink' }
]

// Reactive state
const currentCategory = ref('burgers')
const cart = ref([])
const searchQuery = ref('')
const currentMobileView = ref('menu') // 'menu', 'cart', 'ticket'
const showTicketForm = ref(false) // For desktop ticket view

// Computed properties
const currentProducts = computed(() => {
  return foodData[currentCategory.value] || []
})

const filteredProducts = computed(() => {
  if (!searchQuery.value) {
    return currentProducts.value
  }
  
  const query = searchQuery.value.toLowerCase()
  return currentProducts.value.filter(product => 
    product.name.toLowerCase().includes(query)
  )
})

const cartItemCount = computed(() => {
  return cart.value.reduce((total, item) => total + item.quantity, 0)
})

// Category navigation items for SidebarNav
const categoryNavItems = computed(() => {
  return categories.map(category => ({
    id: category.id,
    icon: category.icon,
    label: category.name,
    active: currentCategory.value === category.id
  }))
})

// Methods
const handleCategoryChange = (categoryId) => {
  currentCategory.value = categoryId
  searchQuery.value = '' // Clear search when changing category
}

// Handler for SidebarNav category selection
const handleCategoryNavClick = (item) => {
  handleCategoryChange(item.id)
}

const handleSearch = (query) => {
  searchQuery.value = query
}

const addToCart = (productId) => {
  const product = Object.values(foodData).flat().find(p => p.id === productId)
  if (!product) return

  const existingItem = cart.value.find(item => item.id === productId)
  if (existingItem) {
    existingItem.quantity += 1
  } else {
    cart.value.push({ ...product, quantity: 1 })
  }
}

const updateQuantity = (productId, newQuantity) => {
  const item = cart.value.find(item => item.id === productId)
  if (item) {
    if (newQuantity <= 0) {
      removeFromCart(productId)
    } else {
      item.quantity = newQuantity
    }
  }
}

const removeFromCart = (productId) => {
  const itemIndex = cart.value.findIndex(item => item.id === productId)
  if (itemIndex > -1) {
    cart.value.splice(itemIndex, 1)
  }
}

const clearCart = () => {
  cart.value = []
}

const processPayment = () => {
  if (cart.value.length === 0) {
    alert('Cart is empty!')
    return
  }
  
  // Navigate to ticket generation
  if (window.innerWidth >= 768) { // Desktop
    showTicketForm.value = true
  } else { // Mobile
    // For mobile, switch to ticket view
    handleMobileTabClick('ticket')
  }
}

const handleTicketGenerated = (ticketData) => {
  // Handle successful ticket generation
  console.log('Ticket generated:', ticketData)
  
  // Clear cart after ticket generation
  clearCart()
  
  // Reset views
  showTicketForm.value = false
  
  // Navigate back to menu on mobile
  if (window.innerWidth < 768) {
    handleMobileTabClick('menu')
  }
  
  // Show success message
  alert('Ticket generated successfully!')
}

// Mobile-specific methods
const selectCategoryAndShowProducts = (categoryId) => {
  currentCategory.value = categoryId
  currentMobileView.value = 'products'
  searchQuery.value = '' // Clear search when changing category
}

const getCurrentCategoryName = () => {
  const category = categories.find(cat => cat.id === currentCategory.value)
  return category ? category.name : 'Products'
}

// Enhanced mobile tab methods
const getMobileTabClasses = (tabName) => {
  const baseClasses = 'flex-1 py-3 px-4 text-center text-sm font-medium transition-all duration-200 border-b-2'
  const isActive = currentMobileView.value === tabName
  
  if (isActive) {
    return `${baseClasses} border-blue-500 text-blue-600 bg-blue-50`
  }
  
  return `${baseClasses} border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50`
}

const handleMobileTabClick = (tabName) => {
  // Prevent unnecessary re-renders if already on the same tab
  if (currentMobileView.value === tabName) {
    return
  }
  
  // Handle special cases for tab switching
  switch (tabName) {
    case 'menu':
      currentMobileView.value = 'menu'
      // If no category is selected, default to burgers
      if (!currentCategory.value) {
        currentCategory.value = 'burgers'
      }
      break
      
    case 'cart':
      currentMobileView.value = 'cart'
      break
      
    case 'ticket':
      // Only allow ticket view if there are items in cart
      if (cart.value.length === 0) {
        // Show a brief message and redirect to cart
        currentMobileView.value = 'cart'
        // You could add a toast notification here
        return
      }
      currentMobileView.value = 'ticket'
      break
      
    default:
      currentMobileView.value = tabName
  }
}
</script>