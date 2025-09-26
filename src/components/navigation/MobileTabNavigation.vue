<template>
  <div class="bg-white border-b shadow-sm w-full">
    <div class="flex w-full" role="tablist" aria-label="Mobile navigation">
      <button 
        v-for="tab in tabs"
        :key="tab.id"
        class="flex-1 py-3 px-2 text-center border-b-2 transition-all duration-200 text-sm font-medium relative"
        :class="getTabClasses(tab.id)"
        :aria-selected="currentTab === tab.id"
        :aria-controls="`panel-${tab.id}`"
        role="tab"
        @click="(event) => emit('tab-click', tab.id)"
      >
        <span class="relative z-10 flex items-center justify-center gap-1">
          {{ tab.label }}
          <span 
            v-if="tab.id === 'cart' && cartItemCount > 0" 
            class="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center"
          >
            {{ cartItemCount }}
          </span>
        </span>
        <div 
          v-if="currentTab === tab.id" 
          class="absolute inset-0 bg-blue-50 rounded-t-lg"
        ></div>
      </button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  currentTab: {
    type: String,
    required: true
  },
  cartItemCount: {
    type: Number,
    default: 0
  },
  tabs: {
    type: Array,
    default: () => [
      { id: 'menu', label: 'Menu' },
      { id: 'cart', label: 'Cart' },
      { id: 'ticket', label: 'Ticket' }
    ]
  }
})

const emit = defineEmits(['tab-click'])

const getTabClasses = (tabId) => {
  const baseClasses = 'flex-1 py-3 px-4 text-center text-sm font-medium transition-all duration-200 border-b-2'
  const isActive = props.currentTab === tabId
  
  if (isActive) {
    return `${baseClasses} border-blue-500 text-blue-600 bg-blue-50`
  }
  
  return `${baseClasses} border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50`
}
</script>