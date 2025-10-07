<!-- ======================================================= -->
<!-- FILE 1: Main Application View (e.g., App.vue)           -->
<!-- ======================================================= -->
<template>
  <div class="max-h-dvh h-full">
    <!-- Notification Component -->
    <NotificationComponent />
    <!-- Ticket Viewer (when accessed via QR code) -->
    <SimpleTicketViewer
      :is-visible="showTicketViewer"
      :ticket-info="urlTicketData"
      @close="closeTicketViewer"
      @print="handlePrintTicket"
    />

    <!-- Ticket Options Modal -->
    <TicketOptionsModal 
      :is-visible="showTicketModal"
      :ticket-data="currentTicketData"
      @close="closeTicketModal"
      @view-ticket="(payload) => handleViewTicket(payload as TicketData)"
      @continue-shopping="handleContinueShopping"
    />

    <!-- Mobile Ticket Form (Full Screen) -->
    <div v-if="showMobileTicketForm" class="fixed inset-0 bg-gray-50 z-30 md:hidden">
      <TicketForm
        :cart-items="cart"
        :mobile="true"
        @ticket-generated="(payload) => handleTicketGenerated(payload as TicketData)"
        @back-to-cart="closeMobileTicketForm"
        ref="mobileTicketFormRef"
      />
    </div>

    <!-- Desktop Ticket Form (Modal) -->
    <dlg-cont :visible="showDesktopTicketForm">
      <div
        class="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl 
              w-full mx-4 overflow-hidden border border-gray-200
              min-h-[60dvh] max-h-[92dvh] 
              sm:max-w-lg md:max-w-2xl lg:max-w-3xl 
              sm:min-h-[65dvh] md:min-h-[70dvh] lg:min-h-[75dvh]"
      >
        <TicketForm
          :cart-items="cart"
          :mobile="false"
          @ticket-generated="(payload) => handleTicketGenerated(payload as TicketData)"
          @back-to-cart="closeDesktopTicketForm"
          ref="desktopTicketFormRef"
        />
      </div>
    </dlg-cont>

    <!-- Desktop Layout -->
    <DesktopLayout
      v-if="!showMobileTicketForm"
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
                        
  </div>
</template>

<script setup lang="ts">
import { ref,toRaw, computed, onMounted, onUnmounted } from 'vue'
import { prepareForIndexedDB, cleanReactiveObject, serializeTicketData } from '@/utils/vueUtils'
import { useI18n } from 'vue-i18n'
import { getCurrentLanguage } from '../utils/i18n.js'
import TicketForm from './ticket/TicketForm.vue'
import DesktopLayout from './navigation/DesktopLayout.vue'
import MobileLayout from './navigation/MobileLayout.vue'
import NotificationComponent from './NotificationComponent.vue'
import TicketOptionsModal from './ticket/TicketOptionsModal.vue'
import SimpleTicketViewer from './ticket/SimpleTicketViewer.vue'
import MainForm from './Forms/MainForm.vue'
import '@litcomponents/dialog.js'
import '@litcomponents/CInput.js'
import { productService, seedData,initializeDatabase,ticketService } from '@/utils/idb/StoreManager.js'
import type{ CartItem,CustomerData,TicketData,Product as DBProduct, } from '@/utils/idb/StoreManager.js'

// --- Type Definitions ---
interface Category {
  id: string;
  name: string;
  icon: string;
}
interface NavItem {
  id: string;
  icon: string;
  label: string;
  active: boolean;
}

// i18n setup
const { t } = useI18n()

// Categories configuration with i18n
const categories = computed<Category[]>(() => [
  { id: 'meals', name: t('categories.meals'), icon: 'restaurant' },
  { id: 'burgers', name: t('categories.burgers'), icon: 'lunch_dining' },
  { id: 'sandwiches', name: t('categories.sandwiches'), icon: 'fastfood' },
  { id: 'sides', name: t('categories.sides'), icon: 'fastfood' },
  { id: 'drinks', name: t('categories.drinks'), icon: 'local_drink' }
])

// Reactive state
const currentCategory = ref<string>('burgers')
const cart = ref<CartItem[]>([])
const searchQuery = ref<string>('')
const currentMobileView = ref<'menu' | 'cart'>('menu')
const showMobileTicketForm = ref<boolean>(false)
const showDesktopTicketForm = ref<boolean>(false)
const showTicketModal = ref<boolean>(false)
const currentTicketData = ref<TicketData | null>(null)
const showTicketViewer = ref<boolean>(false)
const mobileTicketFormRef = ref<InstanceType<typeof TicketForm> | null>(null)
const desktopTicketFormRef = ref<InstanceType<typeof TicketForm> | null>(null)
const urlTicketData = ref({
  ticket: '',
  date: '',
  time: '',
  customer: '',
  total: ''
})

// Viewport tracking for modal management
const isDesktop = ref<boolean>(window.innerWidth >= 768)
const resizeListener = ref<(() => void) | null>(null)
const allProducts = ref<DBProduct[]>([])
const productsByCategory = ref<Record<string, DBProduct[]>>({})

// Computed properties
const currentProducts = computed<DBProduct[]>(() => {
  return productsByCategory.value[currentCategory.value] || []
})
const loadProductsFromDB = async () => {
  try {
    const products = await productService.getAllProducts() as DBProduct[];
    allProducts.value = products;

    // Agrupar productos por categoría
    productsByCategory.value = products.reduce((acc, product) => {
      const category = product.category || 'uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(product);
      return acc;
    }, {} as Record<string, DBProduct[]>);
    
    console.log('Products loaded from IndexedDB.');

  } catch (error) {
    console.error("Failed to load products from IndexedDB:", error);
    // Opcional: manejar el error, por ejemplo, mostrando una notificación al usuario
  }
};
const handleDatabaseUpdate = (data: any) => {
  console.log(`Database event triggered:`, data);
  loadProductsFromDB();
};
const filteredProducts = computed<DBProduct[]>(() => {
  if (!searchQuery.value) {
    return currentProducts.value
  }
  
  const query = searchQuery.value.toLowerCase()
  return currentProducts.value.filter(product => 
    t(`products.${product.name}`).toLowerCase().includes(query) ||
    product.name.toLowerCase().includes(query)
  )
})

const cartItemCount = computed<number>(() => {
  let count = 0
  for (const item of cart.value) {
    count += item.quantity || 0
  }
  return count
})

// Category navigation items for SidebarNav
const categoryNavItems = computed<NavItem[]>(() => {
  return categories.value.map(category => ({
    id: category.id,
    icon: category.icon,
    label: category.name,
    active: currentCategory.value === category.id
  }))
})

// Methods
const handleCategoryChange = (categoryId: string) => {
  currentCategory.value = categoryId
  searchQuery.value = '' // Clear search when changing category
}

const handleCategoryNavClick = (item: { id: string }) => {
  handleCategoryChange(item.id)
}

const handleSearch = (query: string) => {
  searchQuery.value = query
}

const addToCart = (productId: string) => {
  const product = allProducts.value.find(p => String(p.id) === String(productId))
  if (!product) return

  // Check stock availability if stock tracking is enabled
  const hasStockTracking = product.stock !== undefined && product.stock !== null && typeof product.stock === 'number'
  
  if (hasStockTracking) {
    const existingItem = cart.value.find(item => String(item.id) === String(productId))
    const currentQuantity = existingItem ? existingItem.quantity : 0
    const requestedQuantity = currentQuantity + 1
    
    if (requestedQuantity > product.stock!) {
      alert(`No hay suficiente stock disponible. Stock actual: ${product.stock}`)
      return
    }
  }

  const existingItem = cart.value.find(item => String(item.id) === String(productId))
  if (existingItem) {
    existingItem.quantity += 1
  } else {
    cart.value.push({ ...product, quantity: 1 })
  }
}

const updateQuantity = (productId: string, newQuantity: number) => {
  const item = cart.value.find(item => String(item.id) === String(productId))
  if (item) {
    if (newQuantity <= 0) {
      removeFromCart(productId)
    } else {
      // Check stock availability if stock tracking is enabled
      const product = allProducts.value.find(p => String(p.id) === String(productId))
      if (product) {
        const hasStockTracking = product.stock !== undefined && product.stock !== null && typeof product.stock === 'number'
        
        if (hasStockTracking && newQuantity > product.stock!) {
          alert(`No hay suficiente stock disponible. Stock actual: ${product.stock}`)
          return
        }
      }
      item.quantity = newQuantity
    }
  }
}

const removeFromCart = (productId: string) => {
  const itemIndex = cart.value.findIndex(item => String(item.id) === String(productId))
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
  
  if (window.innerWidth >= 768) {
    showDesktopTicketForm.value = true
    if (desktopTicketFormRef.value) {
      desktopTicketFormRef.value.resetForm()
    }
  } else {
    showMobileTicketForm.value = true
    if (mobileTicketFormRef.value) {
      mobileTicketFormRef.value.resetForm()
    }
  }
}

const closeMobileTicketForm = () => {
  showMobileTicketForm.value = false
  if (mobileTicketFormRef.value) {
    mobileTicketFormRef.value.resetForm()
  }
}

const closeDesktopTicketForm = () => {
  showDesktopTicketForm.value = false
}

const handleTicketGenerated = async (ticketData: TicketData) => {
  // Convert reactive objects to plain objects using toRaw
  const cleanTicketData = serializeTicketData({
    ...ticketData,
    cartItems: ticketData.cartItems || cart.value,
    customerData: ticketData.customerData
  })
  
  currentTicketData.value = {
    ...cleanTicketData,
    cartItems: cleanTicketData.cartItems,
    customerData: cleanTicketData.customerData
  }
  
  const { qrCodeDataURL, ...dataToSave } = cleanTicketData
  console.log('Ticket generated:', dataToSave, { ...dataToSave, id: dataToSave.ticketID })
  
  try {
    const result = await ticketService.saveTicket({ 
      ...dataToSave, 
      id: dataToSave.ticketID,
      cartItems:cleanTicketData.cartItems
    });
    
    if (result) {
      console.log('Ticket saved successfully:', result);
    } else {
      console.error('Failed to save ticket');
    }
  } catch (error) {
    console.error('Error saving ticket:', error);
  }

  showTicketModal.value = true
  
  if (showMobileTicketForm.value) {
    showMobileTicketForm.value = false
  }
  
  if (showDesktopTicketForm.value) {
    showDesktopTicketForm.value = false
  }
  
  if (window.innerWidth < 768) {
    handleMobileTabClick('menu')
  }
  
  clearCart()
}

const closeTicketModal = () => {
  showTicketModal.value = false
  currentTicketData.value = null
}

const handleViewTicket = (ticketData: TicketData) => {
  console.log('View ticket:', ticketData)
  closeTicketModal()
}

const handleContinueShopping = () => {
  closeTicketModal()
  if (window.innerWidth < 768) {
    handleMobileTabClick('menu')
  }
}

const getCurrentCategoryName = (): string => {
  const category = categories.value.find(cat => cat.id === currentCategory.value)
  return category ? category.name : t('navigation.menu')
}

const handleMobileTabClick = (tabName: 'menu' | 'cart') => {
  if (currentMobileView.value === tabName) {
    return
  }
  
  switch (tabName) {
    case 'menu':
      currentMobileView.value = 'menu'
      if (!currentCategory.value) {
        currentCategory.value = 'burgers'
      }
      break
      
    case 'cart':
      currentMobileView.value = 'cart'
      break
  }
}

const parseTicketFromURL = (): boolean => {
  const urlParams = new URLSearchParams(window.location.search)
  const ticket = urlParams.get('ticket')
  
  if (ticket) {
    // Extract customer data from URL parameters
    const customerData = {
      name: urlParams.get('customer') || urlParams.get('name') || '',
      email: urlParams.get('email') || '',
      phone: urlParams.get('phone') || '',
      address: urlParams.get('address') || ''
    }
    
    // Build complete ticket info object
    urlTicketData.value = {
      ticket: ticket,
      date: urlParams.get('date') || new Date().toLocaleDateString(),
      time: urlParams.get('time') || new Date().toLocaleTimeString(),
      customer: customerData.name || urlParams.get('customer') || '',
      total: urlParams.get('total') || '0.00',
    }
    showTicketViewer.value = true
    return true
  }
  return false
}

const closeTicketViewer = () => {
  showTicketViewer.value = false
  const url = new URL(window.location.toString())
  url.search = ''
  window.history.replaceState({}, '', url)
}

const handlePrintTicket = () => {
  window.print()
}

const closeAllModals = () => {
  showMobileTicketForm.value = false
  showDesktopTicketForm.value = false
  showTicketModal.value = false
  if (mobileTicketFormRef.value) {
    mobileTicketFormRef.value.resetForm()
  }
  if (desktopTicketFormRef.value) {
    desktopTicketFormRef.value.resetForm()
  }
}

const handleViewportChange = () => {
  const newIsDesktop = window.innerWidth >= 768
  
  if (newIsDesktop !== isDesktop.value) {
    if (showMobileTicketForm.value || showDesktopTicketForm.value || showTicketModal.value) {
      closeAllModals()
    }
    isDesktop.value = newIsDesktop
  }
}

onMounted(async () => {
  await initializeDatabase();
  await loadProductsFromDB();
  const initalData = await productService.getAllProducts()
  handleDatabaseUpdate(initalData);
  const manager = await productService.getManager();
  manager.on('add', handleDatabaseUpdate);
  manager.on('update', handleDatabaseUpdate);
  manager.on('delete', handleDatabaseUpdate);
  manager.on('clear', handleDatabaseUpdate); // También es bueno escuchar el evento de limpiar
  // Populate products
  productsByCategory.value = seedData;
  allProducts.value = Object.values(seedData).flat();

  parseTicketFromURL()
  resizeListener.value = handleViewportChange
  window.addEventListener('resize', resizeListener.value)
})

onUnmounted(async () => {
  const manager = await productService.getManager();
  manager.off('add', handleDatabaseUpdate);
  manager.off('update', handleDatabaseUpdate);
  manager.off('delete', handleDatabaseUpdate);
  manager.off('clear', handleDatabaseUpdate);
  
  if (resizeListener.value) {
    window.removeEventListener('resize', resizeListener.value)
  }
})
</script>
