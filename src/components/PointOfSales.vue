<template>
  <div class="h-screen">
    <!-- Notification Component -->
    <NotificationComponent />

    <!-- Language Switcher Component -->
    <LanguageSwitcher />

    <!-- Ticket Viewer (when accessed via QR code) -->
    <div v-if="showTicketViewer" class="fixed inset-0 bg-white z-50 overflow-y-auto">
      <div class="max-w-md mx-auto p-4">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6 p-4 bg-blue-600 text-white rounded-lg">
          <h1 class="text-xl font-bold">{{ t('ticketForm.ticketViewer') }}</h1>
          <button @click="closeTicketViewer" class="text-white hover:text-gray-200">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Ticket Content -->
        <div class="bg-white border-2 border-dashed border-gray-300 p-6 rounded-lg">
          <!-- Restaurant Header -->
          <div class="text-center border-b pb-4 mb-4">
            <div class="text-yellow-500 text-4xl font-bold mb-2">M</div>
            <h1 class="text-xl font-bold">McDonald's</h1>
            <p class="text-sm text-gray-600">{{ t('ticketForm.thankYou') }}</p>
          </div>

          <!-- Ticket Info from URL -->
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="font-medium">{{ t('ticketForm.ticketNumber') }}</span>
              <span>{{ urlTicketData.ticket }}</span>
            </div>
            <div class="flex justify-between">
              <span class="font-medium">{{ t('ticketForm.date') }}</span>
              <span>{{ urlTicketData.date }}</span>
            </div>
            <div class="flex justify-between">
              <span class="font-medium">{{ t('ticketForm.time') }}</span>
              <span>{{ urlTicketData.time }}</span>
            </div>
            <div class="flex justify-between">
              <span class="font-medium">{{ t('ticketForm.customer') }}</span>
              <span>{{ urlTicketData.customer }}</span>
            </div>
            <div class="flex justify-between">
              <span class="font-medium">{{ t('ticketForm.totalAmount') }}</span>
              <span>${{ urlTicketData.total }}</span>
            </div>
          </div>

          <!-- Footer -->
          <div class="text-center mt-6 text-sm text-gray-600">
            <p>{{ t('ticketForm.success') }}</p>
            <p>www.mcdonalds.com</p>
          </div>
        </div>

        <!-- Action Button -->
        <div class="mt-6">
          <button 
            @click="closeTicketViewer"
            class="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
          >
            {{ t('ticketForm.backToMenu') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Ticket Options Modal -->
    <TicketOptionsModal 
      :is-visible="showTicketModal"
      :ticket-data="currentTicketData"
      @close="closeTicketModal"
      @view-ticket="handleViewTicket"
      @continue-shopping="handleContinueShopping"
    />

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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { changeLanguage, getCurrentLanguage } from '../utils/i18n.js'
import NavigationContainer from './NavigationContainer.vue'
import ProductCard from './ProductCard.vue'
import OrderSummary from './OrderSummary.vue'
import TicketForm from './TicketForm.vue'
import DesktopLayout from './DesktopLayout.vue'
import MobileLayout from './MobileLayout.vue'
import NotificationComponent from './NotificationComponent.vue'
import LanguageSwitcher from './LanguageSwitcher.vue'
import TicketOptionsModal from './TicketOptionsModal.vue'
import { emitter } from '../utils/Emitter'

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
const showTicketModal = ref(false)
const currentTicketData = ref(null)
const showTicketViewer = ref(false)
const urlTicketData = ref({
  ticket: '',
  date: '',
  time: '',
  customer: '',
  total: ''
})



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
  
  // Store ticket data for the modal FIRST
  currentTicketData.value = {
    ...ticketData,
    cartItems: [...cart.value], // Preserve cart items for the modal
    customerData: ticketData.customerData
  }
  
  // Show the ticket options modal BEFORE clearing data
  showTicketModal.value = true
  
  // Reset views
  showTicketForm.value = false
  
  // Navigate back to menu on mobile but keep the modal open
  if (window.innerWidth < 768) {
    handleMobileTabClick('menu')
  }
  
  // Clear cart AFTER showing the modal
  clearCart()
}

const closeTicketModal = () => {
  showTicketModal.value = false
  currentTicketData.value = null
}

const handleViewTicket = (ticketData) => {
  // Handle viewing the full ticket
  console.log('View ticket:', ticketData)
  closeTicketModal()
}

const handleContinueShopping = () => {
  // Handle continue shopping action
  closeTicketModal()
  // Navigate to menu view
  if (window.innerWidth < 768) {
    handleMobileTabClick('menu')
  }
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

// Parse URL parameters for ticket viewing
const parseTicketFromURL = () => {
  const urlParams = new URLSearchParams(window.location.search)
  const ticket = urlParams.get('ticket')
  
  if (ticket) {
    urlTicketData.value = {
      ticket: ticket,
      date: urlParams.get('date') || '',
      time: urlParams.get('time') || '',
      customer: urlParams.get('customer') || '',
      total: urlParams.get('total') || ''
    }
    showTicketViewer.value = true
    return true
  }
  return false
}

// Close ticket viewer and return to normal app
const closeTicketViewer = () => {
  showTicketViewer.value = false
  // Clear URL parameters
  const url = new URL(window.location)
  url.search = ''
  window.history.replaceState({}, '', url)
}

// Check for ticket parameters on mount
onMounted(() => {
  parseTicketFromURL()
})



</script>