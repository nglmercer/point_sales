<template>
  <div :class="mobile ? 'h-full bg-white flex flex-col' : 'bg-white shadow-lg'">
    <div class="p-4 border-b">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold">{{ mobile ? t('orderSummary.mobileTitle') : t('orderSummary.title') }}</h2>
        <button 
          class="p-2 hover:bg-gray-100 rounded-lg transition-colors" 
          @click="handleClearCart"
          v-if="cartItems.length > 0"
          :title="t('orderSummary.clearCart')"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </button>
      </div>
    </div>
    
    <div :class="mobile ? 'flex-1 overflow-y-auto p-4 min-h-0 max-h-[70dvh]' : 'flex-1 overflow-y-auto p-4 max-h-[70dvh]'">
      <div class="space-y-4">
        <div v-if="cartItems.length === 0" class="text-gray-500 text-center py-8">
          <div class="text-4xl mb-2">🛒</div>
          <div>{{ t('orderSummary.noItems') }}</div>
          <div class="text-sm mt-1">{{ t('orderSummary.addItemsToStart') }}</div>
        </div>
        <div 
          v-else
          v-for="item in cartItems" 
          :key="item.id"
          class="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
        >
          <!-- Product Image -->
          <div class="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
            <img 
              v-if="!getImageError(item.id)"
              :src="item.image" 
              :alt="item.name"
              class="w-full h-full object-cover"
              @error="setImageError(item.id)"
            />
            <div 
              v-else
              class="w-full h-full flex items-center justify-center text-lg"
            >
              {{ item.fallback || '🍽️' }}
            </div>
          </div>
          
          <div class="flex-1 min-w-0">
            <div class="font-medium text-sm truncate">{{ item.name }}</div>
            <div class="text-lg font-semibold">${{ item.price.toFixed(2) }}</div>
            <!-- Stock warning -->
            <div v-if="hasStockTracking(item) && getStockStatus(item) !== 'in-stock'" 
                 class="text-xs mt-1"
                 :class="getStockStatusClass(item)">
              {{ getStockStatusText(item) }}
            </div>
          </div>
          
          <div class="flex items-center space-x-2">
            <button 
              class="w-8 h-8 rounded-full bg-white border flex items-center justify-center hover:bg-gray-50" 
              @click="handleDecreaseQuantity(item)"
              :title="t('orderSummary.decreaseQuantity')"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
              </svg>
            </button>
            <span class="w-8 text-center font-medium">{{ item.quantity }}</span>
            <button 
              class="w-8 h-8 rounded-full bg-white border flex items-center justify-center hover:bg-gray-50" 
              @click="handleIncreaseQuantity(item)"
              :title="t('orderSummary.increaseQuantity')"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
            </button>
          </div>
          
          <button 
            class="p-2 hover:bg-gray-200 rounded-lg transition-colors" 
            @click="handleRemoveItem(item)"
            :title="t('orderSummary.removeItem')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
    
    <div v-if="cartItems.length > 0" class="border-t p-4 bg-white" :class="mobile ? 'mt-auto' : ''">
      <div class="space-y-4">
        <!-- Total -->
        <div class="flex items-center justify-between text-xl font-bold">
          <span>{{ t('orderSummary.total') }}</span>
          <span>${{ totalAmount.toFixed(2) }}</span>
        </div>
        
        <!-- Generate Ticket Button -->
        <button 
          class="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
          @click="handleProcessPayment"
          :disabled="isProcessing"
        >
          <span>{{ t('orderSummary.generateTicket') }}</span>
          <span class="material-symbols-outlined">receipt</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps({
  cartItems: {
    type: Array,
    required: true
  },
  mobile: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update-quantity', 'remove-item', 'clear-cart', 'process-payment'])

const imageErrors = ref(new Set())
const isProcessing = ref(false)

const totalAmount = computed(() => {
  if (!props.cartItems || props.cartItems.length === 0) {
    return 0
  }
  return props.cartItems.reduce((sum, item) => {
    const price = parseFloat(item.price) || 0
    const quantity = parseInt(item.quantity) || 0
    return sum + (price * quantity)
  }, 0)
})

const getImageError = (itemId) => {
  return imageErrors.value.has(itemId)
}

const setImageError = (itemId) => {
  imageErrors.value.add(itemId)
}

// Event handlers - properly defined methods
const handleClearCart = () => {
  emit('clear-cart')
}

const handleDecreaseQuantity = (item) => {
  emit('update-quantity', item.id, item.quantity - 1)
}

const handleIncreaseQuantity = (item) => {
  emit('update-quantity', item.id, item.quantity + 1)
}

const handleRemoveItem = (item) => {
  emit('remove-item', item.id)
}

const handleProcessPayment = () => {
  if (isProcessing.value) return
  
  isProcessing.value = true
  emit('process-payment')
  
  // Reset processing state after a short delay
  setTimeout(() => {
    isProcessing.value = false
  }, 500)
}

// Stock management functions
const hasStockTracking = (item) => {
  return item.stock !== undefined && item.stock !== null && typeof item.stock === 'number'
}

const getStockStatus = (item) => {
  if (!hasStockTracking(item)) return 'no-tracking'
  if (item.stock === 0) return 'out-of-stock'
  if (item.stock <= 5) return 'low-stock'
  return 'in-stock'
}

const getStockStatusText = (item) => {
  const status = getStockStatus(item)
  switch (status) {
    case 'out-of-stock':
      return '⚠️ Sin stock'
    case 'low-stock':
      return `⚠️ Stock bajo (${item.stock})`
    default:
      return ''
  }
}

const getStockStatusClass = (item) => {
  const status = getStockStatus(item)
  switch (status) {
    case 'out-of-stock':
      return 'text-red-600 font-medium'
    case 'low-stock':
      return 'text-yellow-600 font-medium'
    default:
      return ''
  }
}
</script>