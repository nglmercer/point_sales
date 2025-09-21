<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 transform translate-y-2 scale-95"
      enter-to-class="opacity-100 transform translate-y-0 scale-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 transform translate-y-0 scale-100"
      leave-to-class="opacity-0 transform translate-y-2 scale-95"
    >
      <div
        v-if="notification.show"
        class="fixed top-4 left-1/2 transform -translate-x-1/2 z-[60] max-w-md w-full mx-4"
      >
        <div
          :class="[
            'rounded-lg shadow-lg border-l-4 p-4 flex items-start gap-3',
            {
              'bg-green-50 border-green-400': notification.type === 'success',
              'bg-red-50 border-red-400': notification.type === 'error',
              'bg-blue-50 border-blue-400': notification.type === 'info',
              'bg-yellow-50 border-yellow-400': notification.type === 'warning'
            }
          ]"
        >
          <!-- Icon using Material Symbols -->
          <div class="flex-shrink-0">
            <span
              :class="[
                'material-symbols-outlined text-2xl',
                {
                  'text-green-600': notification.type === 'success',
                  'text-red-600': notification.type === 'error',
                  'text-blue-600': notification.type === 'info',
                  'text-yellow-600': notification.type === 'warning'
                }
              ]"
            >
              {{ getIcon(notification.type) }}
            </span>
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <h3
              v-if="notification.title"
              :class="[
                'text-sm font-semibold',
                {
                  'text-green-800': notification.type === 'success',
                  'text-red-800': notification.type === 'error',
                  'text-blue-800': notification.type === 'info',
                  'text-yellow-800': notification.type === 'warning'
                }
              ]"
            >
              {{ notification.title }}
            </h3>
            <p
              :class="[
                'text-sm',
                {
                  'text-green-700': notification.type === 'success',
                  'text-red-700': notification.type === 'error',
                  'text-blue-700': notification.type === 'info',
                  'text-yellow-700': notification.type === 'warning'
                },
                notification.title ? 'mt-1' : ''
              ]"
            >
              {{ notification.message }}
            </p>
          </div>

          <!-- Close Button with Material Symbol -->
          <button
            @click="closeNotification"
            :class="[
              'flex-shrink-0 rounded-md p-1.5 inline-flex focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors',
              {
                'text-green-500 hover:bg-green-100 focus:ring-green-600': notification.type === 'success',
                'text-red-500 hover:bg-red-100 focus:ring-red-600': notification.type === 'error',
                'text-blue-500 hover:bg-blue-100 focus:ring-blue-600': notification.type === 'info',
                'text-yellow-500 hover:bg-yellow-100 focus:ring-yellow-600': notification.type === 'warning'
              }
            ]"
          >
            <span class="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { emitter } from '../utils/Emitter.ts'

// Notification state
const notification = ref({
  show: false,
  type: 'success', // 'success', 'error', 'info', 'warning'
  title: '',
  message: '',
  autoClose: true,
  duration: 5000
})

// Auto-dismiss timer reference
const notificationTimer = ref(null)

// Material Symbols icon mapping
const getIcon = (type) => {
  const icons = {
    success: 'check_circle',
    error: 'error',
    info: 'info',
    warning: 'warning'
  }
  return icons[type] || 'info'
}

// Show notification function
const showNotification = (data) => {
  // Clear any existing timer
  if (notificationTimer.value) {
    clearTimeout(notificationTimer.value)
  }
  
  notification.value = {
    show: true,
    type: data.type || 'success',
    title: data.title || '',
    message: data.message || '',
    autoClose: data.autoClose !== false,
    duration: data.duration || 5000
  }
  
  // Auto-dismiss if enabled
  if (notification.value.autoClose) {
    notificationTimer.value = setTimeout(() => {
      closeNotification()
    }, notification.value.duration)
  }
}

// Close notification function
const closeNotification = () => {
  notification.value.show = false
  
  // Clear the timer if it exists
  if (notificationTimer.value) {
    clearTimeout(notificationTimer.value)
    notificationTimer.value = null
  }
  
  // Emit close event
  emitter.emit('notification:closed', { timestamp: Date.now() })
}

// Emitter event listeners
let unsubscribeShow, unsubscribeHide

onMounted(() => {
  // Listen for show notification events
  unsubscribeShow = emitter.on('notification:show', showNotification)
  
  // Listen for hide notification events
  unsubscribeHide = emitter.on('notification:hide', closeNotification)
})

onUnmounted(() => {
  // Clean up event listeners
  if (unsubscribeShow) unsubscribeShow()
  if (unsubscribeHide) unsubscribeHide()
  
  // Clear any pending timer
  if (notificationTimer.value) {
    clearTimeout(notificationTimer.value)
  }
})
</script>