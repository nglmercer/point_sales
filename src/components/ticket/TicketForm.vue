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
          aria-label="Close"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    </div>

    <!-- Content -->
    <div :class="mobile ? 'flex-1 overflow-y-auto max-h-dvh' : 'overflow-y-auto max-h-[70dvh]'">
      <!-- Customer Form -->
      <div v-if="!showTicket" :class="mobile ? 'p-4' : 'p-6'">
        <form @submit.prevent="generateTicket" class="space-y-4">
          <!-- Name -->
          <div>
            <label for="fullName" class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('ticketForm.fullNameRequired') }}
            </label>
            <input
              id="fullName"
              v-model="customerData.name"
              type="text"
              required
              :class="mobile ? 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm' : 'w-full px-3 py-2 border border-gray-300 rounded-md'"
              :placeholder="t('ticketForm.placeholders.fullName')"
            />
          </div>

          <!-- DNI -->
          <div>
            <label for="dni" class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('ticketForm.dniRequired') }}
            </label>
            <input
              id="dni"
              v-model="customerData.dni"
              type="text"
              required
              :class="mobile ? 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm' : 'w-full px-3 py-2 border border-gray-300 rounded-md'"
              :placeholder="t('ticketForm.placeholders.dni')"
            />
          </div>

          <!-- Phone -->
          <div>
            <label for="phone" class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('ticketForm.phoneNumber') }}
            </label>
            <input
              id="phone"
              v-model="customerData.phone"
              type="tel"
              :class="mobile ? 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm' : 'w-full px-3 py-2 border border-gray-300 rounded-md'"
              :placeholder="t('ticketForm.placeholders.phone')"
            />
          </div>

          <!-- Address -->
          <div>
            <label for="description" class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('ticketForm.description') }}
            </label>
            <textarea
              id="description"
              v-model="customerData.description"
              rows="2"
              :class="mobile ? 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm' : 'w-full px-3 py-2 border border-gray-300 rounded-md'"
              :placeholder="t('ticketForm.placeholders.description')"
            ></textarea>
          </div>

          <!-- Order Type -->
          <div>
            <label for="orderType" class="block text-sm font-medium text-gray-700 mb-1">
              {{ t('ticketForm.orderType') }}
            </label>
            <select
              id="orderType"
              v-model="customerData.orderType"
              :class="mobile ? 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm' : 'w-full px-3 py-2 border border-gray-300 rounded-md'"
            >
              <option value="">{{ t('ticketForm.selectOrderType') }}</option>
              <option value="dine-in">{{ t('ticketForm.dineIn') }}</option>
              <option value="takeout">{{ t('ticketForm.takeout') }}</option>
            </select>
          </div>

          <!-- Order Summary -->
          <div class="border-t pt-4">
            <h3 class="font-medium text-gray-800 mb-2">{{ t('ticketForm.orderSummary') }}</h3>
            <div class="space-y-1 text-sm">
              <div v-for="item in cartItems" :key="String(item.id)" class="flex justify-between">
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
            <Logo size="lg" :show-text="true" :subtitle="t('ticketForm.thankYou')" />
          </div>

          <!-- Ticket Info -->
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="font-medium">{{ t('ticketForm.ticketID') }}</span>
              <span>{{ ticketID }}</span>
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
              <div><span class="font-medium">{{ t('ticketForm.dni') }}</span> {{ customerData.dni }}</div>
              <div v-if="customerData.phone"><span class="font-medium">{{ t('ticketForm.phone') }}</span> {{ customerData.phone }}</div>
              <div v-if="customerData.address"><span class="font-medium">{{ t('ticketForm.address') }}:</span> {{ customerData.address }}</div>
            </div>
          </div>

          <!-- Order Items -->
          <div class="space-y-2">
            <h3 class="font-medium">{{ t('ticketForm.orderDetails') }}</h3>
            <div v-for="item in cartItems" :key="String(item.id)" class="flex justify-between text-sm">
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
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { qrCodeService } from '@/utils/QRCodeService.js'
import type { CartItem, CustomerData as StoreCustomerData, TicketData as StoreTicketData } from '@/utils/StoreManager.ts'
import Logo from '../Logo.vue'
// To enable the functions below, you may need to install type definitions:
// npm install --save-dev @types/jspdf @types/html2canvas
// import jsPDF from 'jspdf'
// import html2canvas from 'html2canvas'

// --- TYPE DEFINITIONS ---

type OrderType = 'dine-in' | 'takeout' | 'delivery';

interface LocalCustomerData {
  name: string;
  dni: string;
  phone?: string;
  address?: string;
  description?: string;
  orderType?: OrderType | ''; // Allow empty string for initial state
}
// --- PROPS & EMITS ---

const props = withDefaults(defineProps<{
  cartItems: CartItem[];
  mobile?: boolean;
}>(), {
  mobile: false,
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'complete'): void;
  (e: 'ticket-generated', payload: StoreTicketData): void;
  (e: 'back-to-cart'): void;
}>()


// --- COMPOSITION API ---

const { t } = useI18n();


// --- REACTIVE STATE ---

const showTicket = ref<boolean>(false);
const customerData = ref<LocalCustomerData>({
  name: '',
  dni: '',
  phone: '',
  address: '',
  description: '',
  orderType: '',
});

const ticketID = ref<string>('');
const ticketDate = ref<string>('');
const ticketTime = ref<string>('');
const qrCodeDataURL = ref<string>('');
const ticketRef = ref<HTMLDivElement | null>(null);


// --- COMPUTED PROPERTIES ---

const total = computed<number>(() => {
  return props.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
});


// --- METHODS ---

const getOrderTypeTranslation = (orderType: OrderType | '' =''): string => {
  if (!orderType) return '';
  const translations: Record<OrderType, string> = {
    'dine-in': t('ticketForm.orderTypes.dineIn'),
    'takeout': t('ticketForm.orderTypes.takeout'),
    'delivery': t('ticketForm.orderTypes.delivery')
  };
  return translations[orderType] || orderType;
}

const generateQRCode = async (): Promise<void> => {
  try {
    // Convert local customer data to StoreManager format for QR code
    const storeCustomerData: StoreCustomerData = {
      ...customerData.value,
      id: customerData.value.dni // Use DNI as the ID for customer data
    };

    // Build ticket data for QR generation
    const ticketData = {
      id: ticketID.value,
      ticketID: ticketID.value,
      total: total.value,
      date: ticketDate.value,
      time: ticketTime.value,
      customerData: storeCustomerData,
      cartItems: props.cartItems
    }
    
    qrCodeDataURL.value = await qrCodeService.generateTicketQRCode(ticketData, {
      width: 200,
      margin: 2
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    qrCodeDataURL.value = ''; // Ensure it's cleared on failure
  }
};

const resetForm = (): void => {
  showTicket.value = false;
  customerData.value = {
    name: '',
    dni: '',
    phone: '',
    address: '',
    orderType: '',
  };
  ticketID.value = '';
  ticketDate.value = '';
  ticketTime.value = '';
  qrCodeDataURL.value = '';
};

// Expose reset function to parent component
defineExpose({
  resetForm,
});


const handleCancel = (): void => {
  if (showTicket.value) {
    // If showing ticket, go back to the form
    showTicket.value = false;
  } else {
    // If on the form, emit back-to-cart (mobile) or close (desktop)
    props.mobile ? emit('back-to-cart') : emit('close');
  }
};

const handleBackToMenu = (): void => {
  resetForm();
  emit('complete'); // Signal completion to parent
};

const generateTicket = async (): Promise<void> => {
  // Generate ticket details
  ticketID.value = 'MCK' + Date.now().toString().slice(-6);
  const now = new Date();
  ticketDate.value = now.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  ticketTime.value = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  // Generate QR code
  await generateQRCode();

  // Show the ticket view
  showTicket.value = true;

  // Convert local customer data to StoreManager format
  const storeCustomerData: StoreCustomerData = {
    ...customerData.value,
    id: customerData.value.dni // Use DNI as the ID for customer data
  };

  // Emit ticket data to parent
  emit('ticket-generated', {
    id: ticketID.value,
    ticketID: ticketID.value,
    customerData: storeCustomerData,
    cartItems: props.cartItems,
    total: total.value,
    date: ticketDate.value,
    time: ticketTime.value,
    qrCodeDataURL: qrCodeDataURL.value,
  });
};

/*
// --- OPTIONAL TICKET ACTIONS (Uncomment to enable) ---

const downloadTicketPDF = async () => {
  if (!ticketRef.value) return;
  
  const canvas = await html2canvas(ticketRef.value, { scale: 2 });
  const imgData = canvas.toDataURL('image/png');
  
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [canvas.width, canvas.height]
  });

  pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
  pdf.save(`ticket-${ticketID.value}.pdf`);
};

const printTicket = () => {
  if (!ticketRef.value) return;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write('<html><head><title>Print Ticket</title>');
    // Optional: Add styles for printing
    printWindow.document.write('<style> body { font-family: sans-serif; } </style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(ticketRef.value.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
  }
};
*/
</script>