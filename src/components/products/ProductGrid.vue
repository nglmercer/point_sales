    
<template>
  <div class="w-full">
    <!-- Category Header -->
    <div class="mb-4 w-full">
      <h2 class="text-xl font-semibold">{{ categoryName }}</h2>
      <p class="text-sm text-gray-600 mt-1">{{ products.length }} items available</p>
    </div>

    <!-- Products Grid -->
    <div 
      :class="[
        'w-full grid gap-4',
        mobile ? 'grid-cols-2' : 'grid-cols-3 gap-6'
      ]"
    >
      <ProductCard 
        v-for="product in products" 
        :key="product.id"
        :product="product"
        :mobile="mobile"
        @add-to-cart="$emit('add-to-cart', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import ProductCard from './ProductCard.vue'


// Or define the type inline if you don't have a shared types file:
interface Product {
  id: string | number;
  name: string;
  price: number;
  image: string;
  fallback?: string;
}


interface Props {
  products: Product[];
  categoryName: string;
  mobile?: boolean;
}

withDefaults(defineProps<Props>(), {
  mobile: false
});

defineEmits<{
  (e: 'add-to-cart', id: string | number): void
}>();
</script>

  