<template>
  <div class="h-screen">
    <!-- Language Switcher -->
    <div class="fixed top-4 right-4 z-50">
      <div class="relative inline-block">
        <!-- Current Language Button -->
        <button 
          @click="toggleLanguageDropdown"
          class="flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 shadow-md transition-all duration-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          <span class="text-xl">{{ currentLanguage === 'es' ? '🇪🇸' : '🇺🇸' }}</span>
          <span class="font-medium text-gray-700">{{ currentLanguage === 'es' ? 'ES' : 'EN' }}</span>
          <svg 
            class="w-4 h-4 text-gray-500 transition-transform duration-200" 
            :class="{ 'rotate-180': showLanguageDropdown }"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>

        <!-- Dropdown Menu -->
        <div 
          v-show="showLanguageDropdown"
          class="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-10"
        >
          <button
            @click="selectLanguage('es')"
            class="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-blue-50 transition-colors duration-150"
            :class="{ 'bg-blue-50 border-r-2 border-blue-500': currentLanguage === 'es' }"
          >
            <span class="text-xl">🇪🇸</span>
            <div>
              <div class="font-medium text-gray-900">Español</div>
              <div class="text-sm text-gray-500">Spanish</div>
            </div>
            <svg 
              v-if="currentLanguage === 'es'" 
              class="w-5 h-5 text-blue-500 ml-auto" 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
            </svg>
          </button>
          
          <button
            @click="selectLanguage('en')"
            class="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-blue-50 transition-colors duration-150"
            :class="{ 'bg-blue-50 border-r-2 border-blue-500': currentLanguage === 'en' }"
          >
            <span class="text-xl">🇺🇸</span>
            <div>
              <div class="font-medium text-gray-900">English</div>
              <div class="text-sm text-gray-500">Inglés</div>
            </div>
            <svg 
              v-if="currentLanguage === 'en'" 
              class="w-5 h-5 text-blue-500 ml-auto" 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Overlay to close dropdown when clicking outside -->
      <div 
        v-if="showLanguageDropdown"
        @click="showLanguageDropdown = false"
        class="fixed inset-0 z-0"
      ></div>
    </div>

    <!-- Desktop Layout -->
    <DesktopLayout
      :category-nav-items="categoryNavItems"
      :search-query="searchQuery"
      :filtered-products="filteredProducts"
      :category-name="getCurrentCategoryName()"
      :cart-items="cart"
      :show-ticket-form="showTicketForm"
      :t="t"
      @category-nav-click="handleCategoryNavClick"
      @search="handleSearch"
      @add-to-cart="addToCart"
      @update-quantity="updateQuantity"
      @remove-item="removeFromCart"
      @clear-cart="clearCart"
      @process-payment="processPayment"
      @show-ticket-form="showTicketForm = true"
      @ticket-generated="handleTicketGenerated"
      @back-to-cart="showTicketForm = false"
    />

    <!-- Mobile Layout -->
    <MobileLayout
      :current-mobile-view="currentMobileView"
      :cart-item-count="cartItemCount"
      :search-query="searchQuery"
      :filtered-products="filteredProducts"
      :category-name="getCurrentCategoryName()"
      :cart-items="cart"
      :category-nav-items="categoryNavItems"
      :t="t"
      @tab-click="handleMobileTabClick"
      @search="handleSearch"
      @add-to-cart="addToCart"
      @update-quantity="updateQuantity"
      @remove-item="removeFromCart"
      @clear-cart="clearCart"
      @process-payment="processPayment"
      @ticket-generated="handleTicketGenerated"
      @category-nav-click="handleCategoryNavClick"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { changeLanguage, getCurrentLanguage } from '../utils/i18n.js'
import NavigationContainer from './NavigationContainer.vue'
import ProductCard from './ProductCard.vue'
import OrderSummary from './OrderSummary.vue'
import TicketForm from './TicketForm.vue'
import DesktopLayout from './DesktopLayout.vue'
import MobileLayout from './MobileLayout.vue'

// i18n setup
const { t } = useI18n()

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

// Categories configuration with i18n
const categories = computed(() => [
  { id: 'meals', name: t('categories.meals'), icon: 'restaurant' },
  { id: 'burgers', name: t('categories.burgers'), icon: 'lunch_dining' },
  { id: 'sandwiches', name: t('categories.sandwiches'), icon: 'fastfood' },
  { id: 'sides', name: t('categories.sides'), icon: 'fastfood' },
  { id: 'drinks', name: t('categories.drinks'), icon: 'local_drink' }
])

// Reactive state
const currentCategory = ref('burgers')
const cart = ref([])
const searchQuery = ref('')
const currentMobileView = ref('menu') // 'menu', 'cart', 'ticket'
const showTicketForm = ref(false) // For desktop ticket view
const currentLanguage = ref(getCurrentLanguage())
const showLanguageDropdown = ref(false)

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
    t(`products.${product.name}`).toLowerCase().includes(query) ||
    product.name.toLowerCase().includes(query)
  )
})

const cartItemCount = computed(() => {
  return cart.value.reduce((total, item) => total + item.quantity, 0)
})

// Category navigation items for SidebarNav
const categoryNavItems = computed(() => {
  return categories.value.map(category => ({
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
    alert(t('messages.cartEmpty'))
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
  alert(t('messages.ticketGenerated'))
}

// Language switching
const switchLanguage = (locale) => {
  changeLanguage(locale)
  currentLanguage.value = locale
}

const toggleLanguageDropdown = () => {
  showLanguageDropdown.value = !showLanguageDropdown.value
}

const selectLanguage = (locale) => {
  changeLanguage(locale)
  currentLanguage.value = locale
  showLanguageDropdown.value = false
}

// Mobile-specific methods
const selectCategoryAndShowProducts = (categoryId) => {
  currentCategory.value = categoryId
  currentMobileView.value = 'products'
  searchQuery.value = '' // Clear search when changing category
}

const getCurrentCategoryName = () => {
  const category = categories.value.find(cat => cat.id === currentCategory.value)
  return category ? category.name : t('navigation.menu')
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