<template>
  <div :class="mobile ? 'w-full bg-white' : 'w-64 bg-white shadow-lg'">
    <!-- Header Section -->
    <div :class="mobile ? 'p-3 border-b' : 'p-4 border-b'">
      <!-- Back button - only show on desktop -->
      <div v-if="!mobile" class="flex items-center space-x-2">
        <button class="btn btn-ghost btn-sm">
          <span class="material-symbols-outlined text-lg">arrow_back</span>
          Back
        </button>
      </div>
      
      <!-- Search bar -->
      <div :class="mobile ? 'mt-2' : 'mt-4'">
        <div class="relative">
          <input 
            type="text" 
            placeholder="Search" 
            :class="mobile ? 'input input-bordered w-full pl-10 h-10' : 'input input-bordered w-full pl-10'"
            v-model="searchQuery"
            @input="$emit('search', searchQuery)"
          />
          <span class="material-symbols-outlined absolute left-3 top-3 text-gray-400 text-lg">search</span>
        </div>
      </div>
      
      <!-- McDonald's logo - only show on desktop -->
      <div v-if="!mobile" class="mt-4">
        <Logo size="md" :show-text="false" />
      </div>
    </div>
    
    <!-- Navigation using SidebarNav component -->
    <SidebarNav
      :items="navItems"
      :variant="mobile ? 'horizontal' : 'vertical'"
      :size="mobile ? 'sm' : 'md'"
      :compact="false"
      @item-click="handleCategoryClick"
      class="flex-1"
    >
      <!-- Custom badge slot for categories with item counts -->
      <template v-for="category in categories" :key="category.id" #[`badge-${category.id}`]="{ item }">
        <span 
          v-if="category.itemCount && category.itemCount > 0"
          class="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full"
        >
          {{ category.itemCount }}
        </span>
      </template>

      <!-- Custom indicator slot for active category -->
      <template v-for="category in categories" :key="category.id" #[`indicator-${category.id}`]="{ item }">

      </template>
    </SidebarNav>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import SidebarNav from './SidebarNav.vue'
import Logo from '../Logo.vue'

const searchQuery = ref('')

const props = defineProps({
  categories: {
    type: Array,
    required: true
  },
  activeCategory: {
    type: String,
    required: true
  },
  mobile: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['category-change', 'search'])

// Material Symbols icon mapping for categories
const iconMapping = {
  'meals': 'restaurant',
  'burgers': 'lunch_dining',
  'sandwiches': 'fastfood',
  'sides': 'local_dining',
  'drinks': 'local_cafe',
  'desserts': 'cake'
}

// Transform categories into nav items with Material Symbols
const navItems = computed(() => {
  return props.categories.map(category => ({
    id: category.id,
    icon: iconMapping[category.id.toLowerCase()] || category.icon || 'category',
    label: category.name,
    active: category.id === props.activeCategory,
    badge: category.itemCount > 0 ? category.itemCount : undefined,
    badgeType: 'error'
  }))
})

// Handle category click from SidebarNav
const handleCategoryClick = (item, index) => {
  emit('category-change', item.id)
}
</script>