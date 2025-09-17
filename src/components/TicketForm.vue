<template>
  <div :class="mobile ? 'h-full flex flex-col bg-white' : 'w-96 bg-white rounded-lg shadow-lg'">
    <!-- Header -->
    <div :class="mobile ? 'p-4 border-b bg-blue-600 text-white' : 'p-6 border-b'">
      <div class="flex items-center justify-between">
        <h2 :class="mobile ? 'text-lg font-semibold' : 'text-xl font-semibold text-gray-800'">
          {{ showTicket ? 'Your Receipt' : 'Customer Information' }}
        </h2>
        <button 
          @click="mobile ? $emit('close') : $emit('back-to-cart')"
          :class="mobile ? 'text-white hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'"
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
              Full Name *
            </label>
            <input
              v-model="customerData.name"
              type="text"
              required
              :class="mobile ? 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm' : 'w-full px-3 py-2 border border-gray-300 rounded-md'"
              placeholder="Enter your full name"
            />
          </div>

          <!-- Email -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              v-model="customerData.email"
              type="email"
              required
              :class="mobile ? 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm' : 'w-full px-3 py-2 border border-gray-300 rounded-md'"
              placeholder="Enter your email"
            />
          </div>

          <!-- Phone -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              v-model="customerData.phone"
              type="tel"
              :class="mobile ? 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm' : 'w-full px-3 py-2 border border-gray-300 rounded-md'"
              placeholder="Enter your phone number"
            />
          </div>

          <!-- Address -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <textarea
              v-model="customerData.address"
              rows="2"
              :class="mobile ? 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm' : 'w-full px-3 py-2 border border-gray-300 rounded-md'"
              placeholder="Enter your address (optional)"
            ></textarea>
          </div>

          <!-- Order Type -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Order Type *
            </label>
            <select
              v-model="customerData.orderType"
              required
              :class="mobile ? 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm' : 'w-full px-3 py-2 border border-gray-300 rounded-md'"
            >
              <option value="">Select order type</option>
              <option value="dine-in">Dine In</option>
              <option value="takeout">Takeout</option>
              <option value="delivery">Delivery</option>
            </select>
          </div>

          <!-- Order Summary -->
          <div class="border-t pt-4">
            <h3 class="font-medium text-gray-800 mb-2">Order Summary</h3>
            <div class="space-y-1 text-sm">
              <div v-for="item in cartItems" :key="item.id" class="flex justify-between">
                <span>{{ item.name }} x{{ item.quantity }}</span>
                <span>${{ (item.price * item.quantity).toFixed(2) }}</span>
              </div>
              <div class="border-t pt-1 font-semibold flex justify-between">
                <span>Total:</span>
                <span>${{ total.toFixed(2) }}</span>
              </div>
            </div>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :class="mobile ? 'w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors' : 'w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors'"
          >
            Generate Ticket & Process Payment
          </button>
        </form>
      </div>

      <!-- Generated Ticket -->
      <div v-else :class="mobile ? 'p-4' : 'p-6'">
        <div class="bg-white border-2 border-dashed border-gray-300 p-4 rounded-lg">
          <!-- Restaurant Header -->
          <div class="text-center border-b pb-4 mb-4">
            <div class="text-yellow-500 text-4xl font-bold mb-2">M</div>
            <h1 class="text-xl font-bold">McDonald's</h1>
            <p class="text-sm text-gray-600">Thank you for your order!</p>
          </div>

          <!-- Ticket Info -->
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="font-medium">Ticket #:</span>
              <span>{{ ticketNumber }}</span>
            </div>
            <div class="flex justify-between">
              <span class="font-medium">Date:</span>
              <span>{{ ticketDate }}</span>
            </div>
            <div class="flex justify-between">
              <span class="font-medium">Time:</span>
              <span>{{ ticketTime }}</span>
            </div>
            <div class="flex justify-between">
              <span class="font-medium">Order Type:</span>
              <span class="capitalize">{{ customerData.orderType.replace('-', ' ') }}</span>
            </div>
          </div>

          <!-- Customer Info -->
          <div class="border-t border-b py-4 my-4">
            <h3 class="font-medium mb-2">Customer Information</h3>
            <div class="space-y-1 text-sm">
              <div><span class="font-medium">Name:</span> {{ customerData.name }}</div>
              <div><span class="font-medium">Email:</span> {{ customerData.email }}</div>
              <div v-if="customerData.phone"><span class="font-medium">Phone:</span> {{ customerData.phone }}</div>
              <div v-if="customerData.address"><span class="font-medium">Address:</span> {{ customerData.address }}</div>
            </div>
          </div>

          <!-- Order Items -->
          <div class="space-y-2">
            <h3 class="font-medium">Order Details</h3>
            <div v-for="item in cartItems" :key="item.id" class="flex justify-between text-sm">
              <div>
                <span>{{ item.name }}</span>
                <span class="text-gray-600"> x{{ item.quantity }}</span>
              </div>
              <span>${{ (item.price * item.quantity).toFixed(2) }}</span>
            </div>
            
            <!-- Total -->
            <div class="border-t pt-2 font-semibold flex justify-between">
              <span>Total Amount:</span>
              <span>${{ total.toFixed(2) }}</span>
            </div>
          </div>

          <!-- Footer -->
          <div class="text-center text-xs text-gray-500 mt-4 pt-4 border-t">
            <p>Thank you for choosing McDonald's!</p>
            <p>Please keep this receipt for your records.</p>
          </div>
        </div>

        <!-- Action Buttons -->
        <div :class="mobile ? 'mt-4 space-y-2' : 'mt-4 flex space-x-2'">
          <button
            @click="downloadTicket"
            :class="mobile ? 'w-full bg-green-600 text-white py-2 px-4 rounded-md font-medium hover:bg-green-700 transition-colors' : 'flex-1 bg-green-600 text-white py-2 px-4 rounded-md font-medium hover:bg-green-700 transition-colors'"
          >
            Download Receipt
          </button>
          <button
            @click="emit('ticket-generated', { completed: true })"
            :class="mobile ? 'w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors' : 'flex-1 bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors'"
          >
            New Order
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

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

// Computed properties
const total = computed(() => {
  return props.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
})

// Methods
const generateTicket = () => {
  // Generate ticket number and timestamp
  ticketNumber.value = 'MCK' + Date.now().toString().slice(-6)
  const now = new Date()
  ticketDate.value = now.toLocaleDateString()
  ticketTime.value = now.toLocaleTimeString()
  
  // Emit ticket generated event with ticket data
  emit('ticket-generated', {
    ticketNumber: ticketNumber.value,
    customerData: customerData.value,
    cartItems: props.cartItems,
    total: total.value,
    date: ticketDate.value,
    time: ticketTime.value
  })
  
  // Show the ticket
  showTicket.value = true
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