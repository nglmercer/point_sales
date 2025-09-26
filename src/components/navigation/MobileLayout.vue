<template>
  <div class="md:hidden h-full flex flex-col">
    <!-- Mobile Header -->
    <MobileHeader 
      :cart-item-count="cartItemCount"
      :show-back-button="currentMobileView === 'cart'"
      @cart-click="$emit('tab-click', 'cart')"
      @back-click="$emit('tab-click', 'menu')"
    />

    <!-- Mobile Content -->
    <div class="flex-1 overflow-hidden w-full">
      <!-- Menu View -->
      <div 
        v-show="currentMobileView === 'menu'" 
        class="h-full overflow-y-auto w-full"
      >
        <div class="p-4 w-full">
          <!-- Search Bar -->
          <div class="mb-4 w-full">
            <SearchBar
              :model-value="searchQuery"
              placeholder="Search menu items..."
              @update:model-value="(event) => emit('search', event)"
            />
          </div>

          <!-- Product Grid -->
          <ProductGrid
            :products="filteredProducts"
            :category-name="categoryName"
            :mobile="true"
            @add-to-cart="(event) => emit('add-to-cart', event)"
          />
        </div>
      </div>

      <!-- Cart View -->
      <div 
        v-show="currentMobileView === 'cart'" 
        class="h-full"
      >
        <OrderSummary 
          :cart-items="cartItems"
          @update-quantity="(productId, quantity) => emit('update-quantity', productId, quantity)"
          @remove-item="(productId) => emit('remove-item', productId)"
          @clear-cart="() => emit('clear-cart')"
          @process-payment="() => emit('process-payment')"
          @show-ticket-form="() => emit('show-ticket-form')"
        />
      </div>
    </div>

    <!-- Mobile Bottom Category Navigation -->
    <div
      v-if="currentMobileView === 'menu'"
      class="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-20 md:hidden"
    >
      <NavigationContainer
        :items="categoryNavItems"
        direction="horizontal"
        :show-labels="true"
        :show-indicators="false"
        :show-dots="false"
        icon-size="20px"
        item-spacing="2px"
        @item-click="$emit('category-nav-click', $event)"
      >
        <template #item="{ item, index, isActive }">
          <button
            :class="[
              'flex flex-col items-center justify-center w-full h-full py-2 px-1 text-xs font-medium transition-colors duration-200 min-w-0 flex-1',
              isActive
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
            ]"
          >
            <span class="material-symbols-outlined mb-1" style="font-size: 20px;">
              {{ item.icon }}
            </span>
            <span class="text-center text-xs truncate">{{ item.label }}</span>
          </button>
        </template>
      </NavigationContainer>
    </div>
  </div>
</template>

<script setup>
import MobileHeader from './MobileHeader.vue'
import NavigationContainer from './NavigationContainer.vue'
import SearchBar from '@components/products/SearchBar.vue'
import ProductGrid from '@components/products/ProductGrid.vue'
import OrderSummary from '../OrderSummary.vue'

defineProps({
  currentMobileView: {
    type: String,
    required: true
  },
  cartItemCount: {
    type: Number,
    required: true
  },
  searchQuery: {
    type: String,
    required: true
  },
  filteredProducts: {
    type: Array,
    required: true
  },
  categoryName: {
    type: String,
    required: true
  },
  cartItems: {
    type: Array,
    required: true
  },
  categoryNavItems: {
    type: Array,
    required: true
  }
})

const emit = defineEmits([
  'tab-click',
  'search',
  'add-to-cart',
  'update-quantity',
  'remove-item',
  'clear-cart',
  'process-payment',
  'show-ticket-form',
  'category-nav-click'
])
</script>