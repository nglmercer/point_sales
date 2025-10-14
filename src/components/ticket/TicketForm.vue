<template>
  <div :class="mobile ? 'h-full flex flex-col justify-center bg-white min-w-100 relative max-h-[max(70dvh,calc(100vh-4rem))] overflow-auto' : 'max-w-md bg-white rounded-lg shadow-lg min-w-100 h-full overflow-auto max-h-[max(70dvh,calc(100vh-4rem))]'">
    
      <div :class="mobile ? 'p-4 border-b bg-blue-600 text-white' : 'p-2 border-b'">
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
          <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>
      <!-- Customer Form -->
      <div v-if="!showTicket" :class="mobile ? 'p-2 overflow-auto' : 'p-4 overflow-auto'">
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

          <!-- Description -->
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

      <!-- Generated Ticket using SimpleTicketViewer -->
      <div v-else :class="'p-2'">
        <SimpleTicketViewer
          :is-visible="true"
          :ticket-data="generatedTicketData"
          :show-brand-header="true"
          :show-header="!mobile"
          :show-footer="true"
          :show-order-items="true"
          :show-qr-code="true"
          :show-print-button="true"
          :close-button-text="t('ticketForm.backToMenu')"
          :brand-tagline="t('ticketForm.thankYou')"
          class="border-0 shadow-none"
          @close="handleBackToMenu"
        />
      </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CartItem, CustomerData as StoreCustomerData, TicketData as StoreTicketData } from '@/utils/idb/StoreManager'
import SimpleTicketViewer from './SimpleTicketViewer.vue'

// --- TYPE DEFINITIONS ---

type OrderType = 'dine-in' | 'takeout' | 'delivery';

interface LocalCustomerData {
  name: string;
  dni: string;
  phone?: string;
  address?: string;
  description?: string;
  orderType?: OrderType | '';
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

const generatedTicketData = ref<StoreTicketData | null>(null);

// --- COMPUTED PROPERTIES ---

const total = computed<number>(() => {
  return props.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
});

// --- METHODS ---

const resetForm = (): void => {
  showTicket.value = false;
  customerData.value = {
    name: '',
    dni: '',
    phone: '',
    address: '',
    description: '',
    orderType: '',
  };
  generatedTicketData.value = null;
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
  emit('complete');
};

const generateTicket = async (): Promise<void> => {
  // Generate ticket details
  const ticketID = 'MCK' + Date.now().toString().slice(-6);
  const now = new Date();
  const ticketDate = now.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  const ticketTime = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  // Convert local customer data to StoreManager format
  const storeCustomerData: StoreCustomerData = {
    ...customerData.value,
    id: customerData.value.dni
  };

  // Build complete ticket data
  const ticketData: StoreTicketData = {
    id: ticketID,
    ticketID: ticketID,
    customerData: storeCustomerData,
    cartItems: props.cartItems,
    total: total.value,
    date: ticketDate,
    time: ticketTime,
  };

  // Store ticket data for the viewer
  generatedTicketData.value = ticketData;

  // Show the ticket view
  showTicket.value = true;

  // Emit ticket data to parent (without qrCodeDataURL as it will be generated by SimpleTicketViewer)
  emit('ticket-generated', ticketData);
};
</script>

<style scoped>
/* Override SimpleTicketViewer styles when embedded */
:deep(.fixed) {
  position: relative !important;
  inset: auto !important;
  background: transparent !important;
  backdrop-filter: none !important;
  z-index: auto !important;
  padding: 0 !important;
}


</style>