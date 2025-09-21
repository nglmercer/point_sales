<template>
  <div v-if="isVisible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto mx-2 sm:mx-0">
      <!-- Header -->
      <div class="p-4 sm:p-6 border-b bg-green-600 text-white rounded-t-lg">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold flex items-center gap-2">
            <span class="material-symbols-outlined">check_circle</span>
            {{ t('ticketModal.ticketGenerated') }}
          </h2>
          <button 
            @click="closeModal"
            class="text-white hover:text-gray-200 transition-colors"
          >
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="p-4 sm:p-6">
        <!-- Success Message -->
        <div class="text-center mb-6">
          <div class="text-green-500 text-6xl mb-4">
            <span class="material-symbols-outlined" style="font-size: 4rem;">receipt_long</span>
          </div>
          <h3 class="text-lg font-semibold text-gray-800 mb-2">
            {{ t('ticketModal.successTitle') }}
          </h3>
          <p class="text-gray-600">
            {{ t('ticketModal.successMessage') }}
          </p>
        </div>

        <!-- Ticket Info -->
        <div v-if="ticketData" class="bg-gray-50 rounded-lg p-4 mb-6">
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="font-medium text-gray-700">{{ t('ticketModal.ticketNumber') }}:</span>
              <div class="font-mono text-blue-600">{{ ticketData.ticketNumber || 'N/A' }}</div>
            </div>
            <div>
              <span class="font-medium text-gray-700">{{ t('ticketModal.total') }}:</span>
              <div class="font-semibold text-green-600">${{ (ticketData.total || 0).toFixed(2) }}</div>
            </div>
            <div>
              <span class="font-medium text-gray-700">{{ t('ticketModal.date') }}:</span>
              <div>{{ ticketData.date || 'N/A' }}</div>
            </div>
            <div>
              <span class="font-medium text-gray-700">{{ t('ticketModal.time') }}:</span>
              <div>{{ ticketData.time || 'N/A' }}</div>
            </div>
          </div>
          
          <!-- Customer Info if available -->
          <div v-if="ticketData.customerData" class="mt-4 pt-4 border-t border-gray-200">
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="font-medium text-gray-700">{{ t('ticketModal.customer') }}:</span>
                <div>{{ ticketData.customerData.name || 'N/A' }}</div>
              </div>
              <div v-if="ticketData.customerData.email">
                <span class="font-medium text-gray-700">{{ t('ticketModal.email') }}:</span>
                <div>{{ ticketData.customerData.email }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- QR Code Section -->
        <div v-if="qrCodeDataURL" class="text-center mb-6 p-4 bg-blue-50 rounded-lg">
          <h4 class="font-medium text-gray-800 mb-3">{{ t('ticketModal.qrCodeTitle') }}</h4>
          <div class="inline-block p-3 sm:p-4 bg-white rounded-lg shadow-sm">
            <img :src="qrCodeDataURL" alt="QR Code" class="mx-auto w-32 h-32 sm:w-36 sm:h-36">
          </div>
          <p class="text-sm text-gray-600 mt-2">{{ t('ticketModal.qrCodeDescription') }}</p>
        </div>

        <!-- Action Options -->
        <div class="space-y-3">
          <h4 class="font-medium text-gray-800 mb-3">{{ t('ticketModal.chooseAction') }}</h4>
          
          <!-- View Full Ticket -->
          <button 
            @click="viewFullTicket"
            class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-3"
          >
            <span class="material-symbols-outlined">visibility</span>
            {{ t('ticketModal.viewFullTicket') }}
          </button>

          <!-- Print Ticket -->
          <button 
            @click="printTicket"
            class="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-3"
          >
            <span class="material-symbols-outlined">print</span>
            {{ t('ticketModal.printTicket') }}
          </button>

          <!-- Download PDF -->
          <button 
            @click="downloadPDF"
            class="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-3"
          >
            <span class="material-symbols-outlined">download</span>
            {{ t('ticketModal.downloadPDF') }}
          </button>

          <!-- Download Text -->
          <button 
            @click="downloadText"
            class="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-3"
          >
            <span class="material-symbols-outlined">text_snippet</span>
            {{ t('ticketModal.downloadText') }}
          </button>

          <!-- Email Ticket -->
          <button 
            @click="emailTicket"
            class="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-3"
          >
            <span class="material-symbols-outlined">email</span>
            {{ t('ticketModal.emailTicket') }}
          </button>
        </div>

        <!-- Continue Shopping -->
        <div class="mt-6 pt-4 border-t">
          <button 
            @click="continueShopping"
            class="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-3"
          >
            <span class="material-symbols-outlined">shopping_cart</span>
            {{ t('ticketModal.continueShopping') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import QRCode from 'qrcode'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { emitter } from '../utils/Emitter'

const { t } = useI18n()

const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  },
  ticketData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'view-ticket', 'continue-shopping'])

// Reactive data
const qrCodeDataURL = ref('')

// Use QR Code from ticket data or generate new one if not available
watch(() => props.ticketData, async (newTicketData) => {
  if (newTicketData) {
    // Use existing QR code if available, otherwise generate new one
    if (newTicketData.qrCodeDataURL) {
      qrCodeDataURL.value = newTicketData.qrCodeDataURL
    } else {
      await generateQRCode()
    }
  }
}, { immediate: true })

// Generate QR Code with ticket data
const generateQRCode = async () => {
  if (!props.ticketData) return
  
  try {
    // Create optimized URL with essential ticket information
    const baseUrl = window.location.origin + window.location.pathname
    const ticketParams = new URLSearchParams({
      ticket: props.ticketData.ticketNumber || '',
      date: props.ticketData.date || '',
      time: props.ticketData.time || '',
      customer: props.ticketData.customer || '',
      total: props.ticketData.total?.toString() || '0'
    })
    
    const ticketUrl = `${baseUrl}?${ticketParams.toString()}`
    
    qrCodeDataURL.value = await QRCode.toDataURL(ticketUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
  } catch (error) {
    console.error('Error generating QR code:', error)
  }
}

// Modal actions
const closeModal = () => {
  emit('close')
}

const continueShopping = () => {
  emit('continue-shopping')
  closeModal()
}

const viewFullTicket = () => {
  emit('view-ticket', props.ticketData)
  closeModal()
}

const printTicket = () => {
  if (!props.ticketData) return
  
  const printWindow = window.open('', '_blank')
  const ticketHTML = generateTicketHTML()
  
  printWindow.document.write(ticketHTML)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
  printWindow.close()
  
  // Show success notification
  emitter.emit('notification:show', {
    type: 'success',
    title: t('ticketModal.printSuccess'),
    message: '',
    autoClose: true,
    duration: 3000
  })
}

const downloadPDF = async () => {
  if (!props.ticketData) return
  
  try {
    // Create a temporary element with the ticket content
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = generateTicketHTML()
    tempDiv.style.position = 'absolute'
    tempDiv.style.left = '-9999px'
    document.body.appendChild(tempDiv)
    
    const canvas = await html2canvas(tempDiv.querySelector('body'), {
      scale: 2,
      useCORS: true,
      allowTaint: true
    })
    
    document.body.removeChild(tempDiv)
    
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    
    const imgWidth = 210
    const pageHeight = 295
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
    pdf.save(`ticket-${props.ticketData.ticketNumber}.pdf`)
    
    // Show success notification
    emitter.emit('notification:show', {
      type: 'success',
      title: t('ticketModal.downloadSuccess'),
      message: '',
      autoClose: true,
      duration: 3000
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    emitter.emit('notification:show', {
      type: 'error',
      title: t('ticketModal.downloadError'),
      message: '',
      autoClose: true,
      duration: 3000
    })
  }
}

const downloadText = () => {
  if (!props.ticketData) return
  
  const ticketContent = `
MCDONALD'S RECEIPT
==================
Ticket #: ${props.ticketData.ticketNumber}
Date: ${props.ticketData.date}
Time: ${props.ticketData.time}
Customer: ${props.ticketData.customerData.name}

ORDER DETAILS
=============
${props.ticketData.cartItems.map(item => `${item.name} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}`).join('\n')}

Total Amount: $${props.ticketData.total.toFixed(2)}

Thank you for choosing McDonald's!
Please keep this receipt for your records.
  `.trim()

  const blob = new Blob([ticketContent], { type: 'text/plain' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `McDonald_Receipt_${props.ticketData.ticketNumber}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
  
  // Show success notification
  emitter.emit('notification:show', {
    type: 'success',
    title: t('ticketModal.downloadSuccess'),
    message: '',
    autoClose: true,
    duration: 3000
  })
}

const emailTicket = () => {
  if (!props.ticketData) return
  
  const subject = `McDonald's Receipt - ${props.ticketData.ticketNumber}`
  const body = `
Hello ${props.ticketData.customerData.name},

Thank you for your order at McDonald's!

Ticket Number: ${props.ticketData.ticketNumber}
Date: ${props.ticketData.date}
Time: ${props.ticketData.time}
Total: $${props.ticketData.total.toFixed(2)}

Order Details:
${props.ticketData.cartItems.map(item => `${item.name} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}`).join('\n')}

We hope to see you again soon!

Best regards,
McDonald's Team
  `
  
  const mailtoLink = `mailto:${props.ticketData.customerData.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  window.open(mailtoLink)
}

// Generate complete HTML page for ticket
const generateTicketHTML = () => {
  if (!props.ticketData) return ''
  
  const itemsHTML = props.ticketData.cartItems.map(item => `
    <tr>
      <td>${item.name}</td>
      <td>${item.quantity}</td>
      <td>$${item.price.toFixed(2)}</td>
      <td>$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('')
  
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Ticket ${props.ticketData.ticketNumber}</title>
      <style>
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
        body {
          font-family: 'Courier New', monospace;
          max-width: 300px;
          margin: 0 auto;
          padding: 20px;
          background: white;
        }
        .header {
          text-align: center;
          border-bottom: 2px dashed #333;
          padding-bottom: 10px;
          margin-bottom: 15px;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #FFC72C;
          margin-bottom: 5px;
        }
        .ticket-info {
          margin-bottom: 15px;
          font-size: 12px;
        }
        .customer-info {
          margin-bottom: 15px;
          border-bottom: 1px dashed #333;
          padding-bottom: 10px;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
        }
        .items-table th,
        .items-table td {
          text-align: left;
          padding: 5px 2px;
          font-size: 12px;
        }
        .items-table th {
          border-bottom: 1px solid #333;
        }
        .total-section {
          border-top: 2px solid #333;
          padding-top: 10px;
          text-align: right;
          font-weight: bold;
          font-size: 16px;
        }
        .qr-section {
          text-align: center;
          margin-top: 15px;
          border-top: 1px dashed #333;
          padding-top: 15px;
        }
        .footer {
          text-align: center;
          margin-top: 15px;
          font-size: 10px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">McDonald's</div>
        <div>¡Gracias por su compra!</div>
      </div>
      
      <div class="ticket-info">
        <div><strong>Ticket:</strong> ${props.ticketData.ticketNumber}</div>
        <div><strong>Fecha:</strong> ${props.ticketData.date}</div>
        <div><strong>Hora:</strong> ${props.ticketData.time}</div>
        <div><strong>Cliente:</strong> ${props.ticketData.customerData.name}</div>
      </div>
      
      <table class="items-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Cant.</th>
            <th>Precio</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>
      
      <div class="total-section">
         Total: $${props.ticketData.total.toFixed(2)}
       </div>
      
      ${qrCodeDataURL.value ? `
        <div class="qr-section">
          <div>Código QR del ticket:</div>
          <img src="${qrCodeDataURL.value}" alt="QR Code" style="margin-top: 10px;">
        </div>
      ` : ''}
      
      <div class="footer">
        <div>¡Esperamos verte pronto!</div>
        <div>www.mcdonalds.com</div>
      </div>
    </body>
    </html>
  `
}
</script>