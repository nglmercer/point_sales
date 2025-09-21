<template>
  <div class="hidden md:flex h-full">
    <!-- Desktop Left Sidebar Navigation -->
    <div class="w-24 bg-white border-r shadow-sm flex flex-col">
      <!-- Logo -->
      <div class="p-4 border-b">
        <div class="text-yellow-500 text-2xl font-bold text-center">M</div>
      </div>
      
      <!-- Category Navigation -->
      <div class="flex-1 py-4">
        <NavigationContainer
          :items="categoryNavItems"
          direction="vertical"
          :show-labels="true"
          :show-indicators="false"
          :show-dots="false"
          icon-size="24px"
          item-spacing="8px"
          @item-click="(event) => emit('category-nav-click', event)"
        >
          <template #item="{ item, index, isActive }">
            <button
              :class="[
                'flex flex-col items-center justify-center w-full h-full py-3 px-2 text-xs font-medium transition-colors duration-200 rounded-lg',
                isActive
                  ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/50'
                  : 'text-gray-600 hover:text-gray-700 hover:bg-gray-50 dark:hover:text-gray-300 dark:hover:bg-gray-700'
              ]"
            >
              <span class="material-symbols-outlined mb-1" style="font-size: 24px;">
                {{ item.icon }}
              </span>
              <span class="text-center text-xs leading-tight">{{ item.label }}</span>
            </button>
          </template>
        </NavigationContainer>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col">
      <!-- Desktop Header with Search -->
      <div class="bg-white shadow-sm border-b p-4 w-full">
        <div class="flex items-center justify-between w-full">
          <div class="flex-1 w-full">
            <SearchBar
              :model-value="searchQuery"
              placeholder="Search menu items..."
              @update:model-value="(event) => emit('search', event)"
            />
          </div>
        </div>
      </div>

      <!-- Content and Sidebar Container -->
      <div class="flex-1 flex">
        <!-- Product Grid Area -->
        <div class="flex-1 overflow-y-auto w-full">
          <div class="p-6 w-full">
            <ProductGrid
              :products="filteredProducts"
              :category-name="categoryName"
              :mobile="false"
              @add-to-cart="(event) => emit('add-to-cart', event)"
            />
          </div>
        </div>

        <!-- Order Summary / Ticket Form Sidebar -->
        <div class="w-80 border-l bg-gray-50">
          <div v-if="!showTicketForm">
            <OrderSummary 
              :cart-items="cartItems"
              @update-quantity="(productId, quantity) => emit('update-quantity', productId, quantity)"
              @remove-item="(productId) => emit('remove-item', productId)"
              @clear-cart="() => emit('clear-cart')"
              @process-payment="() => emit('process-payment')"
              @show-ticket-form="() => emit('show-ticket-form')"
            />
          </div>
          <div v-else>
            <TicketForm 
              :cart-items="cartItems"
              :mobile="false"
              @ticket-generated="(event) => emit('ticket-generated', event)"
              @back-to-cart="() => emit('back-to-cart')"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import NavigationContainer from './NavigationContainer.vue'
import SearchBar from './SearchBar.vue'
import ProductGrid from './ProductGrid.vue'
import OrderSummary from './OrderSummary.vue'
import TicketForm from './TicketForm.vue'

defineProps({
  categoryNavItems: {
    type: Array,
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
  showTicketForm: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'category-nav-click',
  'search',
  'add-to-cart',
  'update-quantity',
  'remove-item',
  'clear-cart',
  'process-payment',
  'show-ticket-form',
  'ticket-generated',
  'back-to-cart'
])
</script>