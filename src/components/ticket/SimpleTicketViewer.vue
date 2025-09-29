<template>
  <div v-if="isVisible" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
      <!-- Header -->
      <div class="border-b bg-blue-600 text-white">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold">{{ title }}</h2>
          <button 
            @click="closeViewer" 
            class="p-2 rounded-full hover:bg-white/20 transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
        <!-- Brand Header -->
        <div v-if="showBrandHeader" class="text-center mb-6"> 
          <Logo size="md" />
        </div>

        <!-- Ticket Information -->
        <div class="space-y-4">
          <div v-for="field in visibleFields" :key="field.key" class="flex justify-between items-center py-2 border-b border-gray-100">
            <span class="font-medium text-gray-700">{{ field.label }}:</span>
            <span class="text-gray-900" :class="field.class">{{ getFieldValue(field.key) }}</span>
          </div>
        </div>

        <!-- QR Code -->
        <div v-if="showQRCode" class="text-center mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 class="font-medium text-gray-800 mb-3">{{ t('ticketModal.qrCodeTitle') }}</h4>
          <div class="inline-block p-3 bg-white rounded-lg shadow-sm">
            <div v-if="isGeneratingQR" class="w-32 h-32 flex items-center justify-center">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
            <img v-else-if="qrCodeDataURL" :src="qrCodeDataURL" alt="QR Code" class="w-32 h-32">
            <div v-else class="w-32 h-32 flex items-center justify-center text-gray-400">
              <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path>
              </svg>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div v-if="showFooter" class="text-center mt-6 pt-4 border-t border-gray-200">
          <p v-if="footerText" class="text-sm text-gray-600">{{ footerText }}</p>
          <p v-if="website" class="text-sm text-gray-500 mt-1">{{ website }}</p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="p-6 border-t bg-gray-50">
        <button 
          @click="closeViewer" 
          class="w-full py-3 px-4 rounded-lg font-medium transition-colors bg-blue-600 hover:bg-blue-700 text-white"
        >
          {{ closeButtonText || t('ticketForm.backToMenu') }}
        </button>
        
        <button 
          v-if="showPrintButton"
          @click="printTicket" 
          class="w-full mt-3 py-3 px-4 rounded-lg font-medium transition-colors border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
        >
          {{ t('ticketForm.printTicket') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TicketData } from '@/utils/StoreManager.js'
import { qrCodeService } from '@/utils/QRCodeService.js'
import Logo from '../Logo.vue'

// --- INTERFACES ---
interface TicketField {
  key: string
  label: string
  class?: string
}

interface SimpleTicketViewerProps {
  isVisible: boolean
  ticketData?: TicketData | null
  title?: string
  brandName?: string
  brandIcon?: string
  tagline?: string
  footerText?: string
  website?: string
  closeButtonText?: string
  showQRCode?: boolean
  showPrintButton?: boolean
  showBrandHeader?: boolean
  showFooter?: boolean
  visibleFields?: string[]
  fieldLabels?: Record<string, string>
  ticketInfo?: Record<string, any>
}

// --- PROPS & EMITS ---
const props = withDefaults(defineProps<SimpleTicketViewerProps>(), {
  isVisible: false,
  ticketData: null,
  title: '',
  brandName: 'McDonald\'s',
  brandIcon: 'M',
  tagline: '',
  footerText: '',
  website: '',
  closeButtonText: '',
  showQRCode: true,
  showPrintButton: true,
  showBrandHeader: true,
  showFooter: true,
  visibleFields: () => ['ticketID', 'date', 'time', 'customer', 'total'],
  fieldLabels: () => ({}),
  ticketInfo: () => ({})
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'print', ticketData: TicketData | null): void
}>()

// --- COMPOSITION API ---
const { t } = useI18n()

// --- REACTIVE STATE ---
const qrCodeDataURL = ref<string>('')
const isGeneratingQR = ref<boolean>(false)

// --- CONSTANTS ---
const DEFAULT_FIELDS: TicketField[] = [
  { key: 'ticketID', label: 'ticketForm.ticketID', class: '' },
  { key: 'date', label: 'ticketForm.date', class: '' },
  { key: 'time', label: 'ticketForm.time', class: '' },
  { key: 'customer', label: 'ticketForm.customer', class: '' },
  { key: 'total', label: 'ticketForm.totalAmount', class: 'font-semibold text-green-600' }
]

// --- COMPUTED PROPERTIES ---
const visibleFields = computed(() => {
  return DEFAULT_FIELDS.filter(field => 
    props.visibleFields.includes(field.key)
  ).map(field => ({
    ...field,
    label: props.fieldLabels[field.key] || t(field.label)
  }))
})

// --- QR CODE GENERATION ---
const generateQRCode = async () => {
  if (!props.showQRCode) return
  
  isGeneratingQR.value = true
  try {
    // Build ticket info from current field values
    const ticketInfo = {
      ticket: getFieldValue('ticketID'),
      date: getFieldValue('date'),
      time: getFieldValue('time'),
      customer: getFieldValue('customer'),
      total: getFieldValue('total').replace('$', ''),
      brand: props.brandName
    }
    
    // Generate QR code using the service
    qrCodeDataURL.value = await qrCodeService.generateTicketInfoQRCode(ticketInfo, {
      width: 256,
      margin: 2
    })
  } catch (error) {
    console.error('Error generating QR code:', error)
    qrCodeDataURL.value = ''
  } finally {
    isGeneratingQR.value = false
  }
}

// --- METHODS ---
const getFieldValue = (key: string): string => {
  // Priority: ticketInfo (URL params) > ticketData > default values
  const data = props.ticketData
  const info = props.ticketInfo
  
  switch (key) {
    case 'ticketID': return info.ticket || data?.ticketID || 'N/A'
    case 'date': return info.date || data?.date || new Date().toLocaleDateString()
    case 'time': return info.time || data?.time || new Date().toLocaleTimeString()
    case 'customer': 
      // Handle both customerData object and direct customer field
      const customerName = info.customerData?.name || info.customer || data?.customerData?.name || 'N/A'
      return customerName
    case 'total': 
      const total = info.total || data?.total || 0
      return `$${Number(total).toFixed(2)}`
    default: return 'N/A'
  }
}

const closeViewer = () => {
  qrCodeDataURL.value = ''
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

// --- LIFECYCLE HOOKS ---
onMounted(() => {
  // Generar QR code cuando el componente se monta
  generateQRCode()
})

// Watch para regenerar QR cuando cambian los datos del ticket
watch(() => [props.ticketData, props.ticketInfo], () => {
  generateQRCode()
}, { deep: true })
</script>