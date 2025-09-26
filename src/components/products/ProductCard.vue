<template>
  <div 
    class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
    :class="mobile ? 'p-3' : 'p-4'"
    @click="$emit('add-to-cart', product.id)"
  >
    <!-- Image Container -->
    <div class="relative overflow-hidden rounded-lg mb-3" :class="mobile ? 'h-24' : 'h-32'">
      <img 
        v-if="!imageError"
        :src="product.image" 
        :alt="product.name"
        class="w-full h-full object-cover"
        @error="handleImageError"
        @load="handleImageLoad"
      />
      <div 
        v-else
        class="w-full h-full flex items-center justify-center bg-gray-100"
        :class="mobile ? 'text-4xl' : 'text-6xl'"
      >
        {{ product.fallback || '🍽️' }}
      </div>
      
      <!-- Loading placeholder -->
      <div 
        v-if="imageLoading && !imageError"
        class="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center"
      >
        <div class="text-gray-400" :class="mobile ? 'text-2xl' : 'text-4xl'">
          {{ product.fallback || '🍽️' }}
        </div>
      </div>
    </div>
    
    <!-- Product Info -->
    <div class="text-center">
      <div class="font-semibold mb-1" :class="mobile ? 'text-base' : 'text-lg'">${{ product.price.toFixed(2) }}</div>
      <div class="text-gray-600" :class="mobile ? 'text-xs' : 'text-sm'">{{ product.name }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  product: {
    type: Object,
    required: true
  },
  mobile: {
    type: Boolean,
    default: false
  }
})

const imageError = ref(false)
const imageLoading = ref(true)

const handleImageError = () => {
  imageError.value = true
  imageLoading.value = false
}

const handleImageLoad = () => {
  imageLoading.value = false
  imageError.value = false
}

defineEmits(['add-to-cart'])
</script>