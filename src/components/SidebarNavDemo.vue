<template>
  <div class="p-6 bg-gray-50 min-h-screen">
    <h1 class="text-3xl font-bold text-gray-800 mb-8">SidebarNav Component Demo</h1>
    
    <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
      
      <!-- Basic Vertical Sidebar -->
      <div class="bg-white rounded-lg shadow-lg overflow-hidden">
        <h2 class="text-lg font-semibold p-4 bg-gray-100 border-b">Basic Vertical</h2>
        <div class="h-96">
          <SidebarNav
            :items="basicItems"
            variant="vertical"
            size="md"
            @item-click="handleItemClick"
          >
            <template #header>
              <div class="flex items-center space-x-2">
                <span class="material-symbols-outlined text-blue-600 text-2xl">dashboard</span>
                <span class="font-bold text-gray-800">Dashboard</span>
              </div>
            </template>
          </SidebarNav>
        </div>
      </div>

      <!-- Horizontal Sidebar -->
      <div class="bg-white rounded-lg shadow-lg overflow-hidden">
        <h2 class="text-lg font-semibold p-4 bg-gray-100 border-b">Horizontal Layout</h2>
        <div class="p-4">
          <SidebarNav
            :items="basicItems"
            variant="horizontal"
            size="md"
            @item-click="handleItemClick"
          />
        </div>
      </div>

      <!-- Dark Theme with Badges -->
      <div class="bg-white rounded-lg shadow-lg overflow-hidden">
        <h2 class="text-lg font-semibold p-4 bg-gray-100 border-b">Dark Theme with Badges</h2>
        <div class="h-96">
          <SidebarNav
            :items="badgeItems"
            variant="vertical"
            size="md"
            theme="dark"
            @item-click="handleItemClick"
          >
            <template #header>
              <div class="text-center">
                <span class="material-symbols-outlined text-yellow-400 text-3xl">store</span>
                <div class="text-white font-bold mt-2">Store</div>
              </div>
            </template>
          </SidebarNav>
        </div>
      </div>

      <!-- Compact Mode -->
      <div class="bg-white rounded-lg shadow-lg overflow-hidden">
        <h2 class="text-lg font-semibold p-4 bg-gray-100 border-b">Compact Mode</h2>
        <div class="h-96">
          <SidebarNav
            :items="basicItems"
            variant="vertical"
            size="md"
            compact
            @item-click="handleItemClick"
          />
        </div>
      </div>

      <!-- Custom Indicators -->
      <div class="bg-white rounded-lg shadow-lg overflow-hidden">
        <h2 class="text-lg font-semibold p-4 bg-gray-100 border-b">Custom Indicators</h2>
        <div class="h-96">
          <SidebarNav
            :items="indicatorItems"
            variant="vertical"
            size="md"
            @item-click="handleItemClick"
          >
            <!-- Custom indicator slots -->
            <template #indicator-notifications>
              <div class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            </template>
            
            <template #indicator-messages>
              <span class="material-symbols-outlined text-green-500 text-sm">check_circle</span>
            </template>

            <template #badge-orders="{ item }">
              <div class="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                {{ item.badge }}
              </div>
            </template>
          </SidebarNav>
        </div>
      </div>

      <!-- Large Size with Footer -->
      <div class="bg-white rounded-lg shadow-lg overflow-hidden">
        <h2 class="text-lg font-semibold p-4 bg-gray-100 border-b">Large Size with Footer</h2>
        <div class="h-96">
          <SidebarNav
            :items="basicItems"
            variant="vertical"
            size="lg"
            rounded
            @item-click="handleItemClick"
          >
            <template #header>
              <div class="text-center">
                <span class="material-symbols-outlined text-blue-600 text-4xl">account_circle</span>
                <div class="font-bold text-gray-800 mt-2">John Doe</div>
                <div class="text-sm text-gray-500">Administrator</div>
              </div>
            </template>

            <template #footer>
              <div class="flex items-center justify-center space-x-2 text-gray-500">
                <span class="material-symbols-outlined">logout</span>
                <span class="text-sm">Sign Out</span>
              </div>
            </template>
          </SidebarNav>
        </div>
      </div>

    </div>

    <!-- Event Log -->
    <div class="mt-8 bg-white rounded-lg shadow-lg p-6">
      <h2 class="text-lg font-semibold mb-4">Event Log</h2>
      <div class="bg-gray-100 rounded p-4 h-32 overflow-y-auto">
        <div v-for="(event, index) in eventLog" :key="index" class="text-sm text-gray-700 mb-1">
          {{ event }}
        </div>
        <div v-if="eventLog.length === 0" class="text-gray-500 text-sm">
          Click on any navigation item to see events...
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import SidebarNav from './SidebarNav.vue'

const eventLog = ref([])

// Basic navigation items
const basicItems = ref([
  { id: 'home', icon: 'home', label: 'Home', active: true },
  { id: 'analytics', icon: 'analytics', label: 'Analytics' },
  { id: 'users', icon: 'group', label: 'Users' },
  { id: 'settings', icon: 'settings', label: 'Settings' },
  { id: 'help', icon: 'help', label: 'Help', disabled: true }
])

// Items with badges
const badgeItems = ref([
  { id: 'dashboard', icon: 'dashboard', label: 'Dashboard', active: true },
  { id: 'orders', icon: 'shopping_cart', label: 'Orders', badge: '12', badgeType: 'primary' },
  { id: 'products', icon: 'inventory', label: 'Products', badge: '5', badgeType: 'warning' },
  { id: 'customers', icon: 'people', label: 'Customers', badge: '99+', badgeType: 'success' },
  { id: 'reports', icon: 'assessment', label: 'Reports' }
])

// Items with custom indicators
const indicatorItems = ref([
  { id: 'inbox', icon: 'inbox', label: 'Inbox' },
  { id: 'notifications', icon: 'notifications', label: 'Notifications' },
  { id: 'messages', icon: 'message', label: 'Messages' },
  { id: 'orders', icon: 'receipt', label: 'Orders', badge: '8' },
  { id: 'calendar', icon: 'calendar_today', label: 'Calendar' }
])

// Handle item clicks
const handleItemClick = (item, index) => {
  // Update active state
  basicItems.value.forEach(i => i.active = false)
  badgeItems.value.forEach(i => i.active = false)
  indicatorItems.value.forEach(i => i.active = false)
  
  // Find and activate the clicked item
  const allItems = [...basicItems.value, ...badgeItems.value, ...indicatorItems.value]
  const clickedItem = allItems.find(i => i.id === item.id)
  if (clickedItem) {
    clickedItem.active = true
  }
  
  // Log the event
  const timestamp = new Date().toLocaleTimeString()
  eventLog.value.unshift(`[${timestamp}] Clicked: ${item.label} (${item.id})`)
  
  // Keep only last 10 events
  if (eventLog.value.length > 10) {
    eventLog.value = eventLog.value.slice(0, 10)
  }
}
</script>

<style scoped>
/* Additional demo styles */
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: .5;
  }
}
</style>