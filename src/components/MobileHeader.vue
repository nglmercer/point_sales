<template>
  <div class="bg-white shadow-sm border-b p-4 w-full">
    <div class="flex items-center justify-between w-full">
      <div class="text-yellow-500 text-2xl font-bold">M</div>
      <div class="flex items-center space-x-4">
        <!-- Cart Icon with Badge -->
        <button 
          class="relative p-2"
          @click="$emit('cart-click')"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5-6M20 13v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6m16 0V9a2 2 0 00-2-2H6a2 2 0 00-2 2v4.01"></path>
          </svg>
          <span 
            v-if="cartItemCount > 0" 
            class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
          >
            {{ cartItemCount }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  cartItemCount: {
    type: Number,
    default: 0
  }
})

defineEmits(['cart-click'])
</script>