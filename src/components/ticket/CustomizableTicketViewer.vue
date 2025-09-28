<template>
  <div v-if="isVisible" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden" :class="customStyles.container">
      <!-- Header -->
      <div class="p-6 border-b" :class="[headerBgClass, customStyles.header]">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold" :class="headerTextClass">
            {{ customConfig.title || t('ticketForm.ticketViewer') }}
          </h2>
          <button 
            @click="closeViewer" 
            class="p-2 rounded-full hover:bg-white/20 transition-colors"
            :class="headerTextClass"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6 overflow-y-auto max-h-[calc(90vh-200px)]" :class="customStyles.content">
        <!-- Brand Header -->
        <div v-if="showBrandHeader" class="text-center mb-6" :class="customStyles.brandHeader">
          <div v-if="customConfig.logo" class="mb-3">
            <img :src="customConfig.logo" :alt="customConfig.brandName" class="h-16 mx-auto">
          </div>
          <div v-else-if="customConfig.brandIcon" class="text-4xl mb-2" :class="brandIconClass">
            {{ customConfig.brandIcon }}
          </div>
          <h1 class="text-xl font-bold" :class="customStyles.brandName">{{ customConfig.brandName }}</h1>
          <p v-if="customConfig.tagline" class="text-sm text-gray-600 mt-1">{{ customConfig.tagline }}</p>
        </div>

        <!-- Ticket Information -->
        <div class="space-y-4">
          <div v-for="field in visibleFields" :key="field.key" class="flex justify-between items-center py-2 border-b border-gray-100">
            <span class="font-medium text-gray-700">{{ field.label }}:</span>
            <span class="text-gray-900" :class="field.class">{{ getFieldValue(field.key) }}</span>
          </div>
        </div>

        <!-- Custom Fields -->
        <div v-if="customFields.length > 0" class="mt-4 pt-4 border-t border-gray-200">
          <div v-for="field in customFields" :key="field.key" class="flex justify-between items-center py-2">
            <span class="font-medium text-gray-700">{{ field.label }}:</span>
            <span class="text-gray-900" :class="field.class">{{ field.value }}</span>
          </div>
        </div>

        <!-- QR Code -->
        <div v-if="showQRCode && ticketData?.qrCodeDataURL" class="text-center mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 class="font-medium text-gray-800 mb-3">{{ t('ticketModal.qrCodeTitle') }}</h4>
          <div class="inline-block p-3 bg-white rounded-lg shadow-sm">
            <img :src="ticketData.qrCodeDataURL" alt="QR Code" class="w-32 h-32">
          </div>
        </div>

        <!-- Footer -->
        <div v-if="showFooter" class="text-center mt-6 pt-4 border-t border-gray-200" :class="customStyles.footer">
          <p v-if="customConfig.footerText" class="text-sm text-gray-600">{{ customConfig.footerText }}</p>
          <p v-if="customConfig.website" class="text-sm text-gray-500 mt-1">{{ customConfig.website }}</p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="p-6 border-t bg-gray-50" :class="customStyles.actions">
        <button 
          @click="closeViewer" 
          class="w-full py-3 px-4 rounded-lg font-medium transition-colors"
          :class="[primaryButtonClass, customStyles.primaryButton]"
        >
          {{ customConfig.closeButtonText || t('ticketForm.backToMenu') }}
        </button>
        
        <button 
          v-if="showPrintButton"
          @click="printTicket" 
          class="w-full mt-3 py-3 px-4 rounded-lg font-medium transition-colors border border-gray-300"
          :class="[secondaryButtonClass, customStyles.secondaryButton]"
        >
          {{ t('ticketForm.printTicket') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TicketData } from '@/utils/StoreManager.js'

// --- INTERFACES ---
interface CustomField {
  key: string
  label: string
  value: string
  class?: string
}

interface CustomConfig {
  title?: string
  brandName?: string
  brandIcon?: string
  logo?: string
  tagline?: string
  footerText?: string
  website?: string
  closeButtonText?: string
  theme?: 'default' | 'dark' | 'brand' | 'minimal'
  primaryColor?: string
  secondaryColor?: string
  textColor?: string
  showQRCode?: boolean
  showPrintButton?: boolean
  showBrandHeader?: boolean
  showFooter?: boolean
  customFields?: CustomField[]
  visibleFields?: string[]
}

interface FieldConfig {
  key: string
  label: string
  required?: boolean
  class?: string
}

// --- PROPS & EMITS ---
const props = withDefaults(defineProps<{
  isVisible: boolean
  ticketData?: TicketData | null
  config?: CustomConfig
  queryParams?: Record<string, string>
}>(), {
  isVisible: false,
  ticketData: null,
  config: () => ({}),
  queryParams: () => ({})
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'print', ticketData: TicketData | null): void
}>()

// --- COMPOSITION API ---
const { t } = useI18n()

// --- STATE ---
const urlParams = ref<Record<string, string>>({})
const mergedConfig = ref<CustomConfig>({})

// --- CONSTANTS ---
const DEFAULT_FIELDS: FieldConfig[] = [
  { key: 'ticketID', label: 'ticketForm.ticketID', required: true },
  { key: 'date', label: 'ticketForm.date', required: true },
  { key: 'time', label: 'ticketForm.time', required: true },
  { key: 'customer', label: 'ticketForm.customer', required: false },
  { key: 'total', label: 'ticketForm.totalAmount', required: true, class: 'font-semibold text-green-600' }
]

// --- COMPUTED PROPERTIES ---
const customConfig = computed(() => ({
  title: mergedConfig.value.title,
  brandName: mergedConfig.value.brandName || 'McDonald\'s',
  brandIcon: mergedConfig.value.brandIcon || 'M',
  logo: mergedConfig.value.logo,
  tagline: mergedConfig.value.tagline || t('ticketForm.thankYou'),
  footerText: mergedConfig.value.footerText || t('ticketForm.success'),
  website: mergedConfig.value.website || 'www.mcdonalds.com',
  closeButtonText: mergedConfig.value.closeButtonText,
  theme: mergedConfig.value.theme || 'default',
  primaryColor: mergedConfig.value.primaryColor,
  secondaryColor: mergedConfig.value.secondaryColor,
  textColor: mergedConfig.value.textColor,
  showQRCode: mergedConfig.value.showQRCode !== false,
  showPrintButton: mergedConfig.value.showPrintButton !== false,
  showBrandHeader: mergedConfig.value.showBrandHeader !== false,
  showFooter: mergedConfig.value.showFooter !== false,
  customFields: mergedConfig.value.customFields || [],
  visibleFields: mergedConfig.value.visibleFields || ['ticketID', 'date', 'time', 'customer', 'total']
}))

const customStyles = computed(() => ({
  container: getThemeClasses('container'),
  header: getThemeClasses('header'),
  content: getThemeClasses('content'),
  brandHeader: getThemeClasses('brandHeader'),
  brandName: getThemeClasses('brandName'),
  footer: getThemeClasses('footer'),
  actions: getThemeClasses('actions'),
  primaryButton: getThemeClasses('primaryButton'),
  secondaryButton: getThemeClasses('secondaryButton')
}))

const headerBgClass = computed(() => {
  switch (customConfig.value.theme) {
    case 'dark': return 'bg-gray-800 text-white'
    case 'brand': return customConfig.value.primaryColor ? '' : 'bg-blue-600 text-white'
    case 'minimal': return 'bg-white text-gray-900 border-b-2'
    default: return 'bg-blue-600 text-white'
  }
})

const headerTextClass = computed(() => {
  if (customConfig.value.theme === 'minimal') return 'text-gray-900'
  if (customConfig.value.theme === 'dark') return 'text-white'
  return 'text-white'
})

const brandIconClass = computed(() => {
  switch (customConfig.value.theme) {
    case 'dark': return 'text-yellow-400'
    case 'brand': return customConfig.value.primaryColor ? '' : 'text-yellow-500'
    default: return 'text-yellow-500'
  }
})

const primaryButtonClass = computed(() => {
  switch (customConfig.value.theme) {
    case 'dark': return 'bg-gray-800 hover:bg-gray-700 text-white'
    case 'brand': return customConfig.value.primaryColor ? 'text-white hover:opacity-90' : 'bg-blue-600 hover:bg-blue-700 text-white'
    case 'minimal': return 'bg-gray-900 hover:bg-gray-800 text-white'
    default: return 'bg-blue-600 hover:bg-blue-700 text-white'
  }
})

const secondaryButtonClass = computed(() => {
  switch (customConfig.value.theme) {
    case 'dark': return 'bg-gray-200 hover:bg-gray-300 text-gray-900'
    case 'brand': return 'bg-white hover:bg-gray-50 text-gray-700'
    case 'minimal': return 'bg-white hover:bg-gray-50 text-gray-700'
    default: return 'bg-white hover:bg-gray-50 text-gray-700'
  }
})

const visibleFields = computed(() => {
  const fields = customConfig.value.visibleFields || []
  return DEFAULT_FIELDS.filter(field => 
    fields.includes(field.key) && 
    (field.required || hasFieldData(field.key))
  ).map(field => ({
    ...field,
    label: t(field.label)
  }))
})

const customFields = computed(() => customConfig.value.customFields || [])
const showQRCode = computed(() => customConfig.value.showQRCode)
const showPrintButton = computed(() => customConfig.value.showPrintButton)
const showBrandHeader = computed(() => customConfig.value.showBrandHeader)
const showFooter = computed(() => customConfig.value.showFooter)

// --- METHODS ---
const parseURLParams = () => {
  const params = new URLSearchParams(window.location.search)
  const result: Record<string, string> = {}
  
  for (const [key, value] of params.entries()) {
    result[key] = value
  }
  
  return result
}

const mergeConfigFromURL = () => {
  const params = parseURLParams()
  urlParams.value = params
  
  // Merge URL params with props config
  mergedConfig.value = {
    ...props.config,
    ...Object.fromEntries(
      Object.entries(params).filter(([key]) => !['ticket', 'date', 'time', 'customer', 'total'].includes(key))
    )
  }
  
  // Handle boolean values from URL
  if (params.showQRCode !== undefined) mergedConfig.value.showQRCode = params.showQRCode === 'true'
  if (params.showPrintButton !== undefined) mergedConfig.value.showPrintButton = params.showPrintButton === 'true'
  if (params.showBrandHeader !== undefined) mergedConfig.value.showBrandHeader = params.showBrandHeader === 'true'
  if (params.showFooter !== undefined) mergedConfig.value.showFooter = params.showFooter === 'true'
  
  // Handle array values
  if (params.visibleFields) {
    mergedConfig.value.visibleFields = params.visibleFields.split(',')
  }
  
  // Handle custom fields
  if (params.customFields) {
    try {
      mergedConfig.value.customFields = JSON.parse(params.customFields)
    } catch (e) {
      console.warn('Invalid customFields JSON in URL')
    }
  }
}

const getFieldValue = (key: string): string => {
  const data = props.ticketData
  const params = { ...urlParams.value, ...props.queryParams }
  
  switch (key) {
    case 'ticketID': return params.ticket || data?.ticketID || 'N/A'
    case 'date': return params.date || data?.date || new Date().toLocaleDateString()
    case 'time': return params.time || data?.time || new Date().toLocaleTimeString()
    case 'customer': return params.customer || data?.customerData?.name || 'N/A'
    case 'total': 
      const total = params.total || data?.total || 0
      return `$${Number(total).toFixed(2)}`
    default: return 'N/A'
  }
}

const hasFieldData = (key: string): boolean => {
  return getFieldValue(key) !== 'N/A'
}

const getThemeClasses = (element: string): string => {
  const theme = customConfig.value.theme
  const classes: Record<string, Record<string, string>> = {
    default: {
      container: '',
      header: '',
      content: '',
      brandHeader: '',
      brandName: '',
      footer: '',
      actions: '',
      primaryButton: '',
      secondaryButton: ''
    },
    dark: {
      container: 'bg-gray-900 text-white',
      header: 'bg-gray-800',
      content: 'bg-gray-800',
      brandHeader: 'text-white',
      brandName: 'text-white',
      footer: 'text-gray-300',
      actions: 'bg-gray-800',
      primaryButton: '',
      secondaryButton: ''
    },
    minimal: {
      container: 'bg-white border border-gray-200',
      header: 'bg-white border-b-2 border-gray-900',
      content: '',
      brandHeader: '',
      brandName: 'text-gray-900',
      footer: '',
      actions: 'bg-gray-50',
      primaryButton: '',
      secondaryButton: ''
    },
    brand: {
      container: '',
      header: '',
      content: '',
      brandHeader: '',
      brandName: '',
      footer: '',
      actions: '',
      primaryButton: '',
      secondaryButton: ''
    }
  }
  
  return classes[theme]?.[element] || ''
}

const closeViewer = () => {
  emit('close')
}

const printTicket = () => {
  emit('print', props.ticketData)
  
  // Auto-print implementation
  const printWindow = window.open('', '_blank', 'width=800,height=600')
  if (printWindow) {
    const content = document.querySelector('.bg-white.rounded-lg.shadow-2xl')?.outerHTML || ''
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ticket - ${getFieldValue('ticketID')}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .hidden { display: none; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          ${content}
          <script>
            window.onload = () => { window.print(); window.close(); };
          <\/script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }
}

// --- LIFECYCLE ---
onMounted(() => {
  mergeConfigFromURL()
})

watch(() => props.config, () => {
  mergeConfigFromURL()
}, { deep: true })

watch(() => props.queryParams, () => {
  mergeConfigFromURL()
}, { deep: true })
</script>

<style scoped>
/* Custom color overrides */
.brand-theme {
  --primary-color: v-bind('customConfig.primaryColor');
  --secondary-color: v-bind('customConfig.secondaryColor');
  --text-color: v-bind('customConfig.textColor');
}

/* Print styles */
@media print {
  .fixed {
    position: static !important;
    background: white !important;
  }
  
  .bg-black\/50 {
    background: transparent !important;
  }
  
  .backdrop-blur-sm {
    backdrop-filter: none !important;
  }
  
  .shadow-2xl {
    box-shadow: none !important;
  }
}
</style>