<template>
  <div class="fixed top-4 right-4 z-50">
    <div class="relative inline-block">
      <!-- Current Language Button -->
      <button 
        @click="toggleLanguageDropdown"
        class="flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 shadow-md transition-all duration-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
      >
        <span class="text-xl">{{ currentLanguage === 'es' ? '🇪🇸' : '🇺🇸' }}</span>
        <span class="font-medium text-gray-700">{{ currentLanguage === 'es' ? 'ES' : 'EN' }}</span>
        <span 
          class="material-symbols-outlined text-gray-500 transition-transform duration-200" 
          :class="{ 'rotate-180': showLanguageDropdown }"
        >
          expand_more
        </span>
      </button>

      <!-- Dropdown Menu -->
      <div 
        v-show="showLanguageDropdown"
        class="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-10"
      >
        <button
          @click="selectLanguage('es')"
          class="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-blue-50 transition-colors duration-150"
          :class="{ 'bg-blue-50 border-r-2 border-blue-500': currentLanguage === 'es' }"
        >
          <span class="text-xl">🇪🇸</span>
          <div>
            <div class="font-medium text-gray-900">Español</div>
            <div class="text-sm text-gray-500">Spanish</div>
          </div>
          <span 
            v-if="currentLanguage === 'es'" 
            class="material-symbols-outlined text-blue-500 ml-auto text-xl"
          >
            check
          </span>
        </button>
        
        <button
          @click="selectLanguage('en')"
          class="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-blue-50 transition-colors duration-150"
          :class="{ 'bg-blue-50 border-r-2 border-blue-500': currentLanguage === 'en' }"
        >
          <span class="text-xl">🇺🇸</span>
          <div>
            <div class="font-medium text-gray-900">English</div>
            <div class="text-sm text-gray-500">Inglés</div>
          </div>
          <span 
            v-if="currentLanguage === 'en'" 
            class="material-symbols-outlined text-blue-500 ml-auto text-xl"
          >
            check
          </span>
        </button>
      </div>
    </div>

    <!-- Overlay to close dropdown when clicking outside -->
    <div 
      v-if="showLanguageDropdown"
      @click="showLanguageDropdown = false"
      class="fixed inset-0 z-0"
    ></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { changeLanguage, getCurrentLanguage } from '../utils/i18n.js'
import { emitter } from '../utils/Emitter.ts'

// Reactive state
const currentLanguage = ref(getCurrentLanguage())
const showLanguageDropdown = ref(false)

// Methods
const toggleLanguageDropdown = () => {
  showLanguageDropdown.value = !showLanguageDropdown.value
  
  // Emit dropdown toggle event
  emitter.emit('language-switcher:dropdown-toggled', {
    isOpen: showLanguageDropdown.value,
    timestamp: Date.now()
  })
}

const selectLanguage = (locale) => {
  const previousLanguage = currentLanguage.value
  
  // Change the language
  changeLanguage(locale)
  currentLanguage.value = locale
  showLanguageDropdown.value = false
  
  // Emit language change event through Emitter
  emitter.emit('language:changed', {
    from: previousLanguage,
    to: locale,
    timestamp: Date.now()
  })
  
  // Emit dropdown close event
  emitter.emit('language-switcher:dropdown-closed', {
    selectedLanguage: locale,
    timestamp: Date.now()
  })
}

// Listen for external language change events
let unsubscribeLanguageChange

onMounted(() => {
  // Listen for external language change requests
  unsubscribeLanguageChange = emitter.on('language:change-request', (data) => {
    if (data.locale && data.locale !== currentLanguage.value) {
      selectLanguage(data.locale)
    }
  })
  
  // Emit component mounted event
  emitter.emit('language-switcher:mounted', {
    currentLanguage: currentLanguage.value,
    timestamp: Date.now()
  })
})

onUnmounted(() => {
  // Clean up event listeners
  if (unsubscribeLanguageChange) {
    unsubscribeLanguageChange()
  }
  
  // Emit component unmounted event
  emitter.emit('language-switcher:unmounted', {
    timestamp: Date.now()
  })
})

// Close dropdown when clicking outside (alternative method)
const handleClickOutside = (event) => {
  if (showLanguageDropdown.value && !event.target.closest('.relative')) {
    showLanguageDropdown.value = false
    emitter.emit('language-switcher:dropdown-closed', {
      reason: 'click-outside',
      timestamp: Date.now()
    })
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>