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
            aria-label="Close"
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
              <span class="font-medium text-gray-700">{{ t('ticketModal.ticketID') }}:</span>
              <div class="font-mono text-blue-600">{{ ticketData.ticketID }}</div>
            </div>
            <div>
              <span class="font-medium text-gray-700">{{ t('ticketModal.total') }}:</span>
              <div class="font-semibold text-green-600">${{ ticketData.total.toFixed(2) }}</div>
            </div>
            <div>
              <span class="font-medium text-gray-700">{{ t('ticketModal.date') }}:</span>
              <div>{{ ticketData.date }}</div>
            </div>
            <div>
              <span class="font-medium text-gray-700">{{ t('ticketModal.time') }}:</span>
              <div>{{ ticketData.time }}</div>
            </div>
          </div>

          <!-- Customer Info -->
          <div v-if="ticketData.customerData" class="mt-4 pt-4 border-t border-gray-200">
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="font-medium text-gray-700">{{ t('ticketModal.customer') }}:</span>
                <div>{{ ticketData.customerData.name }}</div>
              </div>
              <div v-if="ticketData.customerData.dni">
                <span class="font-medium text-gray-700">{{ t('ticketModal.dni') }}:</span>
                <div>{{ ticketData.customerData.dni }}</div>
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

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { qrCodeService } from '@/utils/QRCodeService.js';
import type{ CustomerData,TicketData } from '@/utils/idb/StoreManager.js'
// To enable the functions below, you may need to install type definitions:
// npm install --save-dev @types/jspdf @types/html2canvas
// import jsPDF from 'jspdf';
// import html2canvas from 'html2canvas';

const props = withDefaults(defineProps<{
  isVisible: boolean;
  ticketData: TicketData | null;
}>(), {
  isVisible: false,
  ticketData: null,
});

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'view-ticket', payload: TicketData): void;
  (e: 'continue-shopping'): void;
}>();


// --- COMPOSITION API ---

const { t } = useI18n();


// --- REACTIVE STATE ---

const qrCodeDataURL = ref<string>('');


// --- LOGIC ---

// Watch for changes in ticketData to update the QR code
watch(() => props.ticketData, async (newTicketData: TicketData | null) => {
  if (newTicketData) {
    console.log('newTicketData', newTicketData)
    // Always generate a new QR code using the service
    try {
      qrCodeDataURL.value = await qrCodeService.generateTicketQRCode(newTicketData, {
        width: 200,
        margin: 2
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      qrCodeDataURL.value = '';
    }
  } else {
    qrCodeDataURL.value = ''; // Clear QR code if ticketData is null
  }
}, { immediate: true });



// --- MODAL ACTIONS ---

const closeModal = (): void => {
  emit('close');
};

const continueShopping = (): void => {
  emit('continue-shopping');
  closeModal(); // Typically, you would also close the modal
};

const viewFullTicket = (): void => {
  if (!props.ticketData) return;
  emit('view-ticket', props.ticketData);
  closeModal();
};

/*
// --- OPTIONAL TICKET ACTIONS (Uncomment to enable) ---
const downloadPDF = async (): Promise<void> => { ... };
const printTicket = (): void => { ... };
const downloadText = (): void => { ... };
const emailTicket = (): void => { ... };
*/
</script>