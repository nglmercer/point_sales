<template>
  <div :class="mobile ? 'h-full flex flex-col bg-white' : 'max-w-md bg-white rounded-lg shadow-lg'">
    <!-- Header -->
    <div :class="mobile ? 'p-4 border-b bg-blue-600 text-white' : 'p-6 border-b'">
      <div class="flex items-center justify-between">
        <h2 :class="mobile ? 'text-lg font-semibold' : 'text-xl font-semibold text-gray-800'">
          {{ showTicket ? t('ticketForm.yourReceipt') : t('ticketForm.customerInfo') }}
        </h2>
        <!-- Cancel/Close Button -->
        <button 
          @click="handleCancel"
          :class="mobile ? 'text-white hover:text-gray-200 p-2' : 'text-gray-500 hover:text-gray-700 p-2'"
          type="button"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    </div>

    <!-- Content -->
    <div :class="mobile ? 'flex-1 overflow-y-auto' : 'max-h-96 overflow-y-auto'">
      <!-- Customer Form -->
      <div v-if="!showTicket" :class="mobile ? 'p-4' : 'p-6'">
        <form @submit.prevent="generateTicket" class="space-y-4">
          <!-- Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('ticketForm.fullNameRequired') }}
            </label>
            <input
              v-model="customerData.name"
              type="text"
              required
              :class="mobile ? 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm' : 'w-full px-3 py-2 border border-gray-300 rounded-md'"
              :placeholder="t('ticketForm.placeholders.fullName')"
            />
          </div>

          <!-- Email -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('ticketForm.emailRequired') }}
            </label>
            <input
              v-model="customerData.email"
              type="email"
              required
              :class="mobile ? 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm' : 'w-full px-3 py-2 border border-gray-300 rounded-md'"
              :placeholder="t('ticketForm.placeholders.email')"
            />
          </div>

          <!-- Phone -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('ticketForm.phoneNumber') }}
            </label>
            <input
              v-model="customerData.phone"
              type="tel"
              :class="mobile ? 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm' : 'w-full px-3 py-2 border border-gray-300 rounded-md'"
              :placeholder="t('ticketForm.placeholders.phone')"
            />
          </div>

          <!-- Address -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('ticketForm.address') }}
            </label>
            <textarea
              v-model="customerData.address"
              rows="2"
              :class="mobile ? 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm' : 'w-full px-3 py-2 border border-gray-300 rounded-md'"
              :placeholder="t('ticketForm.placeholders.address')"
            ></textarea>
          </div>

          <!-- Order Type -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('ticketForm.orderTypeRequired') }}
            </label>
            <select
              v-model="customerData.orderType"
              required
              :class="mobile ? 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm' : 'w-full px-3 py-2 border border-gray-300 rounded-md'"
            >
              <option value="">{{ t('ticketForm.selectOrderType') }}</option>
              <option value="dine-in">{{ t('ticketForm.dineIn') }}</option>
              <option value="takeout">{{ t('ticketForm.takeout') }}</option>
              <option value="delivery">{{ t('ticketForm.delivery') }}</option>
            </select>
          </div>

          <!-- Order Summary -->
          <div class="border-t pt-4">
            <h3 class="font-medium text-gray-800 mb-2">{{ t('ticketForm.orderSummary') }}</h3>
            <div class="space-y-1 text-sm">
              <div v-for="item in cartItems" :key="item.id" class="flex justify-between">
                <span>{{ item.name }} x{{ item.quantity }}</span>
                <span>${{ (item.price * item.quantity).toFixed(2) }}</span>
              </div>
              <div class="border-t pt-1 font-semibold flex justify-between">
                <span>{{ t('ticketForm.total') }}</span>
                <span>${{ total.toFixed(2) }}</span>
              </div>
            </div>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :class="mobile ? 'w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors' : 'w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors'"
          >
            {{ t('ticketForm.generateTicketButton') }}
          </button>
        </form>
      </div>

      <!-- Generated Ticket -->
      <div v-else :class="mobile ? 'p-4' : 'p-6'">
        <div ref="ticketRef" class="bg-white border-2 border-dashed border-gray-300 p-4 rounded-lg">
          <!-- Restaurant Header -->
          <div class="text-center border-b pb-4 mb-4">
            <div class="text-yellow-500 text-4xl font-bold mb-2">M</div>
            <h1 class="text-xl font-bold">McDonald's</h1>
            <p class="text-sm text-gray-600">{{ t('ticketForm.thankYou') }}</p>
          </div>

          <!-- Ticket Info -->
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="font-medium">{{ t('ticketForm.ticketNumber') }}</span>
              <span>{{ ticketNumber }}</span>
            </div>
            <div class="flex justify-between">
              <span class="font-medium">{{ t('ticketForm.date') }}</span>
              <span>{{ ticketDate }}</span>
            </div>
            <div class="flex justify-between">
              <span class="font-medium">{{ t('ticketForm.time') }}</span>
              <span>{{ ticketTime }}</span>
            </div>
            <div class="flex justify-between">
              <span class="font-medium">{{ t('ticketForm.orderType') }}:</span>
              <span class="capitalize">{{ getOrderTypeTranslation(customerData.orderType) }}</span>
            </div>
          </div>

          <!-- Customer Info -->
          <div class="border-t border-b py-4 my-4">
            <h3 class="font-medium mb-2">{{ t('ticketForm.customerInformation') }}</h3>
            <div class="space-y-1 text-sm">
              <div><span class="font-medium">{{ t('ticketForm.name') }}</span> {{ customerData.name }}</div>
              <div><span class="font-medium">{{ t('ticketForm.email') }}</span> {{ customerData.email }}</div>
              <div v-if="customerData.phone"><span class="font-medium">{{ t('ticketForm.phone') }}</span> {{ customerData.phone }}</div>
              <div v-if="customerData.address"><span class="font-medium">{{ t('ticketForm.address') }}:</span> {{ customerData.address }}</div>
            </div>
          </div>

          <!-- Order Items -->
          <div class="space-y-2">
            <h3 class="font-medium">{{ t('ticketForm.orderDetails') }}</h3>
            <div v-for="item in cartItems" :key="item.id" class="flex justify-between text-sm">
              <div>
                <span>{{ item.name }}</span>
                <span class="text-gray-600"> x{{ item.quantity }}</span>
              </div>
              <span>${{ (item.price * item.quantity).toFixed(2) }}</span>
            </div>
            
            <!-- Total -->
            <div class="border-t pt-2 font-semibold flex justify-between">
              <span>{{ t('ticketForm.totalAmount') }}</span>
              <span>${{ total.toFixed(2) }}</span>
            </div>
          </div>

          <!-- QR Code Section -->
          <div v-if="qrCodeDataURL" class="text-center mt-4 pt-4 border-t border-dashed border-gray-400">
            <p class="text-sm mb-2">{{ t('ticketForm.qrCode') }}:</p>
            <img :src="qrCodeDataURL" alt="QR Code" class="mx-auto" style="width: 150px; height: 150px;">
          </div>

          <!-- Footer -->
          <div class="text-center mt-4 text-sm text-gray-600">
            <p>{{ t('ticketForm.success') }}</p>
            <p>www.mcdonalds.com</p>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="mt-6 space-y-3">
          <!-- Back to Menu Button -->
          <button 
            @click="handleBackToMenu"
            :class="mobile ? 'w-full bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2' : 'w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2'"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            {{ mobile ? t('ticketForm.backToMenu') : t('ticketForm.close') }}
          </button>
          
          <!-- Download/Print Actions -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button 
            @click="downloadTicketPDF"
            class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            {{ t('ticketForm.downloadPDF') }}
          </button>
          
          <button 
            @click="printTicket"
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
            </svg>
            {{ t('ticketForm.print') }}
          </button>
          
          <button 
            @click="openTicketPage"
            class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
            </svg>
            {{ t('ticketForm.openPage') }}
          </button>
          
          <button 
            @click="downloadTicket"
            class="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            {{ t('ticketForm.downloadText') }}
          </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import QRCode from 'qrcode'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const { t } = useI18n()

// Helper function to get order type translation
const getOrderTypeTranslation = (orderType) => {
  const translations = {
    'dine-in': t('ticketForm.orderTypes.dineIn'),
    'takeout': t('ticketForm.orderTypes.takeout'),
    'delivery': t('ticketForm.orderTypes.delivery')
  }
  return translations[orderType] || orderType.replace('-', ' ')
}

// Generate QR Code with ticket URL
const generateQRCode = async () => {
  try {
    // Create a simple URL with essential ticket information
    const baseUrl = window.location.origin + window.location.pathname
    const ticketUrl = `${baseUrl}?ticket=${ticketNumber.value}&date=${encodeURIComponent(ticketDate.value)}&time=${encodeURIComponent(ticketTime.value)}&total=${total.value}&customer=${encodeURIComponent(customerData.value.name)}`
    
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
    // Fallback: create an even simpler QR code with just the ticket number
    try {
      const fallbackUrl = `${window.location.origin}?ticket=${ticketNumber.value}`
      qrCodeDataURL.value = await QRCode.toDataURL(fallbackUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
    } catch (fallbackError) {
      console.error('Fallback QR code generation also failed:', fallbackError)
      qrCodeDataURL.value = ''
    }
  }
}

const props = defineProps({
  cartItems: {
    type: Array,
    required: true
  },
  mobile: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'complete', 'ticket-generated', 'back-to-cart'])

// Reactive data
const showTicket = ref(false)
const customerData = ref({
  name: '',
  email: '',
  phone: '',
  address: '',
  orderType: ''
})

const ticketNumber = ref('')
const ticketDate = ref('')
const ticketTime = ref('')
const qrCodeDataURL = ref('')
const ticketRef = ref(null)

// Reset form function
const resetForm = () => {
  showTicket.value = false
  customerData.value = {
    name: '',
    email: '',
    phone: '',
    address: '',
    orderType: ''
  }
  ticketNumber.value = ''
  ticketDate.value = ''
  ticketTime.value = ''
  qrCodeDataURL.value = ''
}

// Expose reset function to parent
defineExpose({
  resetForm
})

// Computed properties
const total = computed(() => {
  return props.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
})

// Methods
const handleCancel = () => {
  if (showTicket.value) {
    // If showing ticket, go back to form
    showTicket.value = false
  } else {
    // If in form, emit back-to-cart or close
    if (props.mobile) {
      emit('back-to-cart')
    } else {
      emit('close')
    }
  }
}

const handleBackToMenu = () => {
  // Reset form and emit complete to go back to menu
  resetForm()
  emit('complete')
}

const generateTicket = async () => {
  // Generate ticket number and timestamp
  ticketNumber.value = 'MCK' + Date.now().toString().slice(-6)
  const now = new Date()
  ticketDate.value = now.toLocaleDateString()
  ticketTime.value = now.toLocaleTimeString()
  
  // Generate QR code
  await generateQRCode()
  
  // Emit ticket generated event with ticket data
  emit('ticket-generated', {
    ticketNumber: ticketNumber.value,
    customerData: customerData.value,
    cartItems: props.cartItems,
    total: total.value,
    date: ticketDate.value,
    time: ticketTime.value,
    qrCodeDataURL: qrCodeDataURL.value
  })
  
  // Show the ticket
  showTicket.value = true
}

// Download ticket as PDF
const downloadTicketPDF = async () => {
  if (!ticketRef.value) return
  
  try {
    const canvas = await html2canvas(ticketRef.value, {
      scale: 2,
      useCORS: true,
      allowTaint: true
    })
    
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    
    const imgWidth = 210
    const pageHeight = 295
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight
    
    let position = 0
    
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight
    
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }
    
    pdf.save(`ticket-${ticketNumber.value}.pdf`)
  } catch (error) {
    console.error('Error generating PDF:', error)
  }
}

// Print ticket directly
const printTicket = () => {
  if (!ticketRef.value) return
  
  const printWindow = window.open('', '_blank')
  const ticketHTML = generateTicketHTML()
  
  printWindow.document.write(ticketHTML)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
  printWindow.close()
}

// Generate complete HTML page for ticket
const generateTicketHTML = () => {
  const itemsHTML = props.cartItems.map(item => `
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
      <title>Ticket ${ticketNumber.value}</title>
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
        <div><strong>Ticket:</strong> ${ticketNumber.value}</div>
        <div><strong>Fecha:</strong> ${ticketDate.value}</div>
        <div><strong>Hora:</strong> ${ticketTime.value}</div>
        <div><strong>Tipo:</strong> ${getOrderTypeTranslation(customerData.value.orderType)}</div>
      </div>
      
      <div class="customer-info">
        <div><strong>Cliente:</strong> ${customerData.value.name}</div>
        ${customerData.value.email ? `<div><strong>Email:</strong> ${customerData.value.email}</div>` : ''}
        ${customerData.value.phone ? `<div><strong>Teléfono:</strong> ${customerData.value.phone}</div>` : ''}
        ${customerData.value.address ? `<div><strong>Dirección:</strong> ${customerData.value.address}</div>` : ''}
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
         Total: $${total.value.toFixed(2)}
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

// Open ticket in new window/tab
const openTicketPage = () => {
  const ticketHTML = generateTicketHTML()
  const newWindow = window.open('', '_blank')
  newWindow.document.write(ticketHTML)
  newWindow.document.close()
}

const downloadTicket = () => {
  // Create a simple text version of the ticket for download
  const ticketContent = `
MCDONALD'S RECEIPT
==================
Ticket #: ${ticketNumber.value}
Date: ${ticketDate.value}
Time: ${ticketTime.value}
Order Type: ${customerData.value.orderType.replace('-', ' ')}

CUSTOMER INFORMATION
====================
Name: ${customerData.value.name}
Email: ${customerData.value.email}
${customerData.value.phone ? `Phone: ${customerData.value.phone}` : ''}
${customerData.value.address ? `Address: ${customerData.value.address}` : ''}

ORDER DETAILS
=============
${props.cartItems.map(item => `${item.name} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}`).join('\n')}

Total Amount: $${total.value.toFixed(2)}

Thank you for choosing McDonald's!
Please keep this receipt for your records.
  `.trim()

  // Create and download the file
  const blob = new Blob([ticketContent], { type: 'text/plain' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `McDonald_Receipt_${ticketNumber.value}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}
</script>