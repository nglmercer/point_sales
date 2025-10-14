<template>
  <div v-if="isVisible" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
      <!-- Header -->
      <div v-if="showHeader" class="border-b bg-blue-600 text-white p-4 no-print">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold">{{ displayTitle }}</h2>
          <button 
            @click="closeViewer" 
            class="p-2 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6 overflow-y-auto max-h-[calc(90vh-200px)] print:overflow-visible print:max-h-none">
        <!-- Brand Header -->
        <div v-if="showBrandHeader" class="text-center mb-6"> 
          <Logo :size="brandLogoSize" :show-text="true" :subtitle="brandTagline" />
        </div>

        <!-- Ticket Information -->
        <div class="space-y-4">
          <div v-for="field in computedVisibleFields" :key="field.key" 
               class="flex justify-between items-center py-2 border-b border-gray-100">
            <span class="font-medium text-gray-700">{{ field.label }}:</span>
            <span class="text-gray-900" :class="field.class">{{ field.value }}</span>
          </div>
        </div>

        <!-- Order Items (if available) -->
        <div v-if="hasOrderItems" class="mt-6 border-t pt-4">
          <h3 class="font-medium text-gray-800 mb-3">{{ t('ticketForm.orderDetails') }}</h3>
          <div class="space-y-2">
            <div v-for="item in orderItems" :key="item.id" 
                 class="flex justify-between text-sm">
              <div>
                <span>{{ item.name }}</span>
                <span class="text-gray-600"> x{{ item.quantity }}</span>
              </div>
              <span class="font-medium">${{ (item.price * item.quantity).toFixed(2) }}</span>
            </div>
            
            <!-- Total -->
            <div class="border-t pt-2 mt-2 font-bold text-lg flex justify-between">
              <span>{{ t('ticketForm.totalAmount') }}</span>
              <span class="text-green-600">${{ orderTotal.toFixed(2) }}</span>
            </div>
          </div>
        </div>

        <!-- QR Code -->
        <div v-if="showQRCode" class="text-center mt-6 p-4 bg-gray-50 rounded-lg print:bg-white">
          <h4 class="font-medium text-gray-800 mb-3">{{ qrCodeTitle }}</h4>
          <div class="inline-block p-3 bg-white rounded-lg shadow-sm">
            <div v-if="isGeneratingQR" class="w-32 h-32 flex items-center justify-center">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
            <img v-else-if="qrCodeDataURL" :src="qrCodeDataURL" alt="QR Code" class="w-32 h-32">
            <div v-else class="w-32 h-32 flex items-center justify-center text-gray-400">
              <span class="material-symbols-outlined text-5xl">qr_code</span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div v-if="showFooter" class="text-center mt-6 pt-4 border-t border-gray-200">
          <p v-if="footerText" class="text-sm text-gray-600">{{ footerText }}</p>
          <p v-if="website" class="text-sm text-gray-500 mt-1">{{ website }}</p>
        </div>
      </div>

      <!-- Action Buttons (Hidden when printing) -->
      <div class="p-6 border-t bg-gray-50 space-y-3 no-print">
        <button 
          @click="closeViewer" 
          class="w-full py-3 px-4 rounded-lg font-medium transition-colors bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
        >
          <span class="material-symbols-outlined">arrow_back</span>
          {{ closeButtonText || t('ticketForm.backToMenu') }}
        </button>
        
        <button 
          v-if="showPrintButton"
          @click="printTicket" 
          class="w-full py-3 px-4 rounded-lg font-medium transition-colors border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 flex items-center justify-center gap-2"
        >
          <span class="material-symbols-outlined">print</span>
          {{ t('ticketForm.printTicket') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TicketData, CartItem } from '@/utils/idb/StoreManager.js'
import { qrCodeService } from '@/utils/QRCodeService.js'
import Logo from '../Logo.vue'

// --- INTERFACES ---
interface TicketField {
  key: string
  label: string
  value: string
  class?: string
}

interface TicketInfoFromURL {
  ticket?: string
  date?: string
  time?: string
  customer?: string
  customerData?: {
    name?: string
    dni?: string
    phone?: string
    address?: string
  }
  total?: string | number
  [key: string]: any
}

interface UnifiedTicketViewerProps {
  isVisible: boolean
  ticketData?: TicketData | null
  ticketInfo?: TicketInfoFromURL
  title?: string
  brandName?: string
  brandLogoSize?: 'sm' | 'md' | 'lg'
  brandTagline?: string
  footerText?: string
  website?: string
  closeButtonText?: string
  qrCodeTitle?: string
  showQRCode?: boolean
  showPrintButton?: boolean
  showBrandHeader?: boolean
  showHeader?: boolean
  showFooter?: boolean
  showOrderItems?: boolean
  visibleFields?: string[]
  fieldLabels?: Record<string, string>
}

// --- PROPS & EMITS ---
const props = withDefaults(defineProps<UnifiedTicketViewerProps>(), {
  isVisible: false,
  ticketData: null,
  ticketInfo: () => ({}),
  title: '',
  brandName: 'McDonald\'s',
  brandLogoSize: 'md',
  brandTagline: '',
  footerText: '',
  website: '',
  closeButtonText: '',
  qrCodeTitle: '',
  showQRCode: true,
  showPrintButton: true,
  showBrandHeader: true,
  showHeader: true,
  showFooter: true,
  showOrderItems: true,
  visibleFields: () => ['ticketID', 'date', 'time', 'customer', 'dni', 'phone', 'orderType', 'total'],
  fieldLabels: () => ({})
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'print', data: TicketData | TicketInfoFromURL): void
}>()

// --- COMPOSITION API ---
const { t } = useI18n()

// --- REACTIVE STATE ---
const qrCodeDataURL = ref<string>('')
const isGeneratingQR = ref<boolean>(false)

// --- COMPUTED PROPERTIES ---

const hasTicketData = computed(() => props.ticketData !== null && props.ticketData !== undefined)
const hasTicketInfo = computed(() => Object.keys(props.ticketInfo).length > 0)

const displayTitle = computed(() => {
  if (props.title) return props.title
  return hasTicketData.value || hasTicketInfo.value 
    ? t('ticketForm.yourReceipt') 
    : t('ticketForm.ticketViewer')
})

const qrCodeTitle = computed(() => {
  return props.qrCodeTitle || t('ticketModal.qrCodeTitle')
})

const getFieldValue = (key: string): string => {
  const data = props.ticketData
  const info = props.ticketInfo
  
  switch (key) {
    case 'ticketID':
      return info.ticket || data?.ticketID || 'N/A'
    
    case 'date':
      return info.date || data?.date || new Date().toLocaleDateString()
    
    case 'time':
      return info.time || data?.time || new Date().toLocaleTimeString()
    
    case 'customer':
      return info.customerData?.name || 
             info.customer || 
             data?.customerData?.name || 
             'N/A'
    
    case 'dni':
      return info.customerData?.dni || 
             data?.customerData?.dni || 
             ''
    
    case 'phone':
      return info.customerData?.phone || 
             data?.customerData?.phone || 
             ''
    
    case 'address':
      return info.customerData?.address || 
             data?.customerData?.address || 
             ''
    
    case 'orderType':
      const orderType = data?.customerData?.orderType || info.orderType
      if (!orderType) return ''
      const translations: Record<string, string> = {
        'dine-in': t('ticketForm.orderTypes.dineIn'),
        'takeout': t('ticketForm.orderTypes.takeout'),
        'delivery': t('ticketForm.orderTypes.delivery')
      }
      return translations[orderType] || orderType
    
    case 'total':
      const total = info.total || data?.total || 0
      return `$${Number(total).toFixed(2)}`
    
    default:
      return info[key] || data?.[key] || 'N/A'
  }
}

const getFieldLabel = (key: string): string => {
  if (props.fieldLabels[key]) return props.fieldLabels[key]
  
  const labelMap: Record<string, string> = {
    ticketID: 'ticketForm.ticketID',
    date: 'ticketForm.date',
    time: 'ticketForm.time',
    customer: 'ticketForm.name',
    dni: 'ticketForm.dni',
    phone: 'ticketForm.phone',
    address: 'ticketForm.address',
    orderType: 'ticketForm.orderType',
    total: 'ticketForm.totalAmount'
  }
  
  return t(labelMap[key] || key)
}

const getFieldClass = (key: string): string => {
  const classMap: Record<string, string> = {
    ticketID: 'font-mono text-sm'
  }
  return classMap[key] || ''
}

const computedVisibleFields = computed<TicketField[]>(() => {
  return props.visibleFields
    .map(key => {
      const value = getFieldValue(key)
      if (!value && key !== 'total') return null
      
      return {
        key,
        label: getFieldLabel(key),
        value,
        class: getFieldClass(key)
      } as TicketField
    })
    .filter((field): field is TicketField => field !== null)
})

const orderItems = computed<CartItem[]>(() => {
  return props.ticketData?.cartItems || []
})

const hasOrderItems = computed(() => {
  return props.showOrderItems && orderItems.value.length > 0
})

const orderTotal = computed(() => {
  return orderItems.value.reduce((sum, item) => sum + (item.price * item.quantity), 0)
})

// --- QR CODE GENERATION ---
const generateQRCode = async () => {
  if (!props.showQRCode) return
  
  isGeneratingQR.value = true
  try {
    const qrData = {
      ticket: getFieldValue('ticketID'),
      date: getFieldValue('date'),
      time: getFieldValue('time'),
      customer: getFieldValue('customer'),
      total: getFieldValue('total').replace('$', ''),
      brand: props.brandName,
      ...(props.ticketInfo || {})
    }
    
    if (hasTicketData.value && props.ticketData) {
      qrCodeDataURL.value = await qrCodeService.generateTicketQRCode(props.ticketData, {
        width: 256,
        margin: 2
      })
    } else {
      qrCodeDataURL.value = await qrCodeService.generateTicketInfoQRCode(qrData, {
        width: 256,
        margin: 2
      })
    }
  } catch (error) {
    console.error('Error generating QR code:', error)
    qrCodeDataURL.value = ''
  } finally {
    isGeneratingQR.value = false
  }
}

// --- METHODS ---
const closeViewer = () => {
  qrCodeDataURL.value = ''
  emit('close')
}

const printTicket = () => {
  const dataToEmit = hasTicketData.value ? props.ticketData! : props.ticketInfo
  emit('print', dataToEmit)
  
  window.print()
}

// --- LIFECYCLE HOOKS ---
onMounted(() => {
  if (props.isVisible) {
    generateQRCode()
  }
})

watch(() => [props.ticketData, props.ticketInfo, props.isVisible], () => {
  if (props.isVisible) {
    generateQRCode()
  }
}, { deep: true })
</script>

<style scoped>
@media print {
  .no-print {
    display: none !important;
  }
  
  .print\:overflow-visible {
    overflow: visible !important;
  }
  
  .print\:max-h-none {
    max-height: none !important;
  }
  
  .print\:bg-white {
    background-color: white !important;
  }
}
</style>