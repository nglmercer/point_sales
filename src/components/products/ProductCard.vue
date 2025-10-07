<template>
  <div 
    class="rounded-lg shadow-md transition-shadow"
    :class="[
      mobile ? 'p-3' : 'p-4',
      isOutOfStock ? 'bg-gray-200 opacity-75' : 'bg-white hover:shadow-lg cursor-pointer'
    ]"
    @click="handleClick"
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

      <!-- Stock Status Badge -->
      <div 
        v-if="hasStockTracking"
        class="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-semibold"
        :class="stockBadgeClass"
      >
        {{ stockStatusText }}
      </div>
    </div>
    
    <!-- Product Info -->
    <div class="text-center">
      <div class="font-semibold mb-1" :class="mobile ? 'text-base' : 'text-lg'">${{ product.price.toFixed(2) }}</div>
      <div class="text-gray-600" :class="mobile ? 'text-xs' : 'text-sm'">{{ product.name }}</div>
      <div v-if="hasStockTracking && product.stock !== null" class="text-xs text-gray-500 mt-1">
        Stock: {{ product.stock }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'


// Or define the type inline if you don't have a shared types file:
interface Product {
  id: string | number;
  name: string;
  price: number;
  image: string;
  fallback?: string;
  stock?: number | null;
}


interface Props {
  product: Product;
  mobile?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  mobile: false
});

const emit = defineEmits<{
  (e: 'add-to-cart', id: string | number): void
}>();

const imageError = ref<boolean>(false);
const imageLoading = ref<boolean>(true);

const handleImageError = (): void => {
  imageError.value = true;
  imageLoading.value = false;
};

const handleImageLoad = (): void => {
  imageLoading.value = false;
  imageError.value = false;
};

// Stock management logic
const hasStockTracking = computed(() => {
  return props.product.stock !== undefined && props.product.stock !== null && typeof props.product.stock === 'number';
});

const isOutOfStock = computed(() => {
  return hasStockTracking.value && props.product.stock === 0;
});

const stockStatusText = computed(() => {
  if (!hasStockTracking.value) return '';
  if (props.product.stock === 0) return 'Sin Stock';
  if (props.product.stock! <= 5) return 'Bajo Stock';
  return 'En Stock';
});

const stockBadgeClass = computed(() => {
  if (!hasStockTracking.value) return '';
  if (props.product.stock === 0) return 'bg-red-500 text-white';
  if (props.product.stock! <= 5) return 'bg-yellow-500 text-white';
  return 'bg-green-500 text-white';
});

const handleClick = () => {
  if (isOutOfStock.value) {
    return; // Don't emit add-to-cart event if out of stock
  }
  emit('add-to-cart', props.product.id);
};
</script>