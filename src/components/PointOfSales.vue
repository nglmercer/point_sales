<template>
  <div class="max-h-dvh">
    <!-- Notification Component -->
    <NotificationComponent />
    <!-- Ticket Viewer (when accessed via QR code) -->
    <div v-if="showTicketViewer" class="fixed inset-0 bg-white/95 backdrop-blur-md z-50 overflow-y-auto">
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
        <div class="bg-white/90 backdrop-blur-sm border-2 border-dashed border-gray-300 p-6 rounded-lg shadow-lg">
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

    <!-- Mobile Ticket Form (Full Screen) -->
    <div v-if="showMobileTicketForm" class="fixed inset-0 bg-gray-50 z-30 md:hidden">
      <TicketForm
        :cart-items="cart"
        :mobile="true"
        @ticket-generated="handleTicketGenerated"
        @back-to-cart="closeMobileTicketForm"
        ref="mobileTicketFormRef"
      />
    </div>

    <!-- Desktop Ticket Form (Modal) -->
    <div v-if="showDesktopTicketForm" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 hidden md:flex items-center justify-center">
      <div class="bg-white/95 backdrop-blur-md rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden border border-gray-200">
        <TicketForm
          :cart-items="cart"
          :mobile="false"
          @ticket-generated="handleTicketGenerated"
          @back-to-cart="closeDesktopTicketForm"
          ref="desktopTicketFormRef"
        />
      </div>
    </div>

    <!-- Desktop Layout -->
    <DesktopLayout
      v-if="!showMobileTicketForm && !showDesktopTicketForm"
      :category-nav-items="categoryNavItems"
      :search-query="searchQuery"
      :filtered-products="filteredProducts"
      :category-name="getCurrentCategoryName()"
      :cart-items="cart"
      :show-ticket-form="false"
      :t="t"
      @category-nav-click="handleCategoryNavClick"
      @search="handleSearch"
      @add-to-cart="addToCart"
      @update-quantity="updateQuantity"
      @remove-item="removeFromCart"
      @clear-cart="clearCart"
      @process-payment="processPayment"
      @show-ticket-form="() => {}"
      @ticket-generated="handleTicketGenerated"
      @back-to-cart="() => {}"
    />

    <!-- Mobile Layout -->
    <MobileLayout
      v-if="!showMobileTicketForm && !showDesktopTicketForm"
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
    <dlg-cont class="productsModal" :visible="showProductsModal">
      <MainForm
        :form-id="'productsForm'"
        :title="t('ticketForm.products')"
        :description="t('ticketForm.productsDescription')"
        :darkmode="true"
        ref="mainFormRef"
      />
    </dlg-cont>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { changeLanguage, getCurrentLanguage } from '../utils/i18n.js'
import NavigationContainer from './navigation/NavigationContainer.vue'
import ProductCard from './products/ProductCard.vue'
import OrderSummary from './OrderSummary.vue'
import TicketForm from './ticket/TicketForm.vue'
import DesktopLayout from './navigation/DesktopLayout.vue'
import MobileLayout from './navigation/MobileLayout.vue'
import NotificationComponent from './NotificationComponent.vue'
import LanguageSwitcher from './navigation/LanguageSwitcher.vue'
import TicketOptionsModal from './ticket/TicketOptionsModal.vue'
import { emitter } from '../utils/Emitter'
import MainForm from './Forms/MainForm.vue'
import '@litcomponents/dialog.js'
import '@litcomponents/CInput.js'
// i18n setup
const { t } = useI18n()
const showProductsModal = ref(false)
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
const currentMobileView = ref('menu') // 'menu', 'cart'
const showMobileTicketForm = ref(false) // For mobile full-screen ticket form
const showDesktopTicketForm = ref(false) // For desktop modal ticket form
const currentLanguage = ref(getCurrentLanguage())
const showLanguageDropdown = ref(false)
const showTicketModal = ref(false)
const currentTicketData = ref(null)
const showTicketViewer = ref(false)
const mobileTicketFormRef = ref(null)
const desktopTicketFormRef = ref(null)
const urlTicketData = ref({
  ticket: '',
  date: '',
  time: '',
  customer: '',
  total: ''
})

// Viewport tracking for modal management
const isDesktop = ref(window.innerWidth >= 768)
const resizeListener = ref(null)



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
    // En desktop, ahora mostramos el modal del formulario primero
    showDesktopTicketForm.value = true
    // Reset form data when opening
    if (desktopTicketFormRef.value) {
      desktopTicketFormRef.value.resetForm()
    }
  } else { // Mobile
    // For mobile, show full-screen ticket form
    showMobileTicketForm.value = true
    // Reset form data when opening
    if (mobileTicketFormRef.value) {
      mobileTicketFormRef.value.resetForm()
    }
  }
}


const closeMobileTicketForm = () => {
  showMobileTicketForm.value = false
  // Reset form when closing
  if (mobileTicketFormRef.value) {
    mobileTicketFormRef.value.resetForm()
  }
}

const closeDesktopTicketForm = () => {
  showDesktopTicketForm.value = false
}



const handleTicketGenerated = (ticketData) => {
  // Handle successful ticket generation
  console.log('Ticket generated:', ticketData)
  
  // Store ticket data for the modal FIRST
  currentTicketData.value = {
    ...ticketData,
    cartItems: ticketData.cartItems || [...cart.value], // Use provided cart items or current cart
    customerData: ticketData.customerData
  }
  
  // Show the ticket options modal BEFORE clearing data
  showTicketModal.value = true
  
  // Close mobile ticket form if open
  if (showMobileTicketForm.value) {
    showMobileTicketForm.value = false
  }
  
  // Close desktop ticket form if open
  if (showDesktopTicketForm.value) {
    showDesktopTicketForm.value = false
  }
  
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

// Function to close all modals
const closeAllModals = () => {
  showMobileTicketForm.value = false
  showDesktopTicketForm.value = false
  showTicketModal.value = false
  // Reset form data when closing
  if (mobileTicketFormRef.value) {
    mobileTicketFormRef.value.resetForm()
  }
  if (desktopTicketFormRef.value) {
    desktopTicketFormRef.value.resetForm()
  }
}

// Handle viewport changes
const handleViewportChange = () => {
  const newIsDesktop = window.innerWidth >= 768
  
  // If viewport changed and any modal is open, close all modals
  if (newIsDesktop !== isDesktop.value) {
    if (showMobileTicketForm.value || showDesktopTicketForm.value || showTicketModal.value) {
      closeAllModals()
    }
    isDesktop.value = newIsDesktop
  }
}

// Check for ticket parameters on mount
onMounted(() => {
  parseTicketFromURL()
  showProductsModal.value = true
  // Add resize listener to handle viewport changes
  resizeListener.value = handleViewportChange
  window.addEventListener('resize', resizeListener.value)
})

// Cleanup on unmount
onUnmounted(() => {
  if (resizeListener.value) {
    window.removeEventListener('resize', resizeListener.value)
  }
})



</script>