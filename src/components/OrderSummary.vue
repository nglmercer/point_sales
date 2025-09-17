<template>
  <div :class="mobile ? 'h-full bg-white flex flex-col' : 'w-80 bg-white shadow-lg'">
    <div class="p-4 border-b">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold">{{ mobile ? 'Your Order' : 'New Order' }}</h2>
        <button 
          class="p-2 hover:bg-gray-100 rounded-lg transition-colors" 
          @click="$emit('clear-cart')"
          v-if="cartItems.length > 0"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </button>
      </div>
    </div>
    
    <div :class="mobile ? 'flex-1 overflow-y-auto p-4' : 'flex-1 overflow-y-auto p-4'">
      <div class="space-y-4">
        <div v-if="cartItems.length === 0" class="text-gray-500 text-center py-8">
          <div class="text-4xl mb-2">🛒</div>
          <div>No items in order</div>
          <div class="text-sm mt-1">Add items to get started</div>
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
          </div>
          
          <div class="flex items-center space-x-2">
            <button 
              class="w-8 h-8 rounded-full bg-white border flex items-center justify-center hover:bg-gray-50" 
              @click="$emit('update-quantity', item.id, item.quantity - 1)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
              </svg>
            </button>
            <span class="w-8 text-center font-medium">{{ item.quantity }}</span>
            <button 
              class="w-8 h-8 rounded-full bg-white border flex items-center justify-center hover:bg-gray-50" 
              @click="$emit('update-quantity', item.id, item.quantity + 1)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
            </button>
          </div>
          
          <button 
            class="p-2 hover:bg-gray-200 rounded-lg transition-colors" 
            @click="$emit('remove-item', item.id)"
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
          <span>Total</span>
          <span>${{ totalAmount.toFixed(2) }}</span>
        </div>
        
        <!-- Generate Ticket Button -->
        <button 
          class="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
          @click="$emit('process-payment')"
        >
          <span>Generate Ticket</span>
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

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

const imageErrors = ref(new Set())

const totalAmount = computed(() => {
  return props.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
})

const getImageError = (itemId) => {
  return imageErrors.value.has(itemId)
}

const setImageError = (itemId) => {
  imageErrors.value.add(itemId)
}

defineEmits(['update-quantity', 'remove-item', 'clear-cart', 'process-payment'])
</script>