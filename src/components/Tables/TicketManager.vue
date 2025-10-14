<template>
  <div class="ticket-manager">
    <header class="manager-header">
      <h2>Gestión de Tickets</h2>
      <button class="btn btn-primary" @click="handleNewTicket">
        Añadir Ticket
      </button>
    </header>

    <DataTable
      :items="tickets"
      :columns="tableColumns"
      :actions="tableActions"
      :is-loading="isLoading"
      :darkmode="true"
      @action="handleTableAction"
    />

    <!-- Modal para crear/editar tickets -->
    <dlg-cont :visible="showTicketModal" @close="showTicketModal = false">
      <MainForm
        ref="mainFormRef"
        form-id="ticketForm"
        :title="formTitle"
        :form-config="ticketFormConfig"
        :darkmode="true"
        @submit="handleFormSubmit"
      />
    </dlg-cont>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick, onUnmounted } from 'vue';
import { ticketService, initializeDatabase, type TicketData } from '@/utils/idb/StoreManager';
import DataTable from '@/components/Tables/DataTable.vue';
import MainForm from '@/components/Forms/MainForm.vue';
import { DlgCont } from '@/litcomponents/dialog.ts';
import { emitter } from '@/utils/Emitter';
import type { FormConfig } from '@/utils/form-config';
import '@/litcomponents/CInput';
// --- Configuración del Formulario de Tickets ---
const ticketFormConfig: FormConfig = {
  'ticketID': {
    type: 'text',
    label: 'ID del Ticket',
    required: true,
    placeholder: 'TKT-001'
  },
  'customerData.name': {
    type: 'text',
    label: 'Nombre del Cliente',
    required: true,
    placeholder: 'Juan Pérez'
  },
  'customerData.dni': {
    type: 'text',
    label: 'DNI',
    required: true,
    placeholder: '12345678'
  },
  'customerData.phone': {
    type: 'tel',
    label: 'Teléfono',
    placeholder: '987654321'
  },
  'customerData.address': {
    type: 'text',
    label: 'Dirección',
    placeholder: 'Av. Principal 123'
  },
  'customerData.orderType': {
    type: 'select',
    label: 'Tipo de Orden',
    required: true,
    options: [
      { value: '', label: 'Seleccionar...' },
      { value: 'dine-in', label: 'Para comer aquí' },
      { value: 'takeout', label: 'Para llevar' },
      { value: 'delivery', label: 'Delivery' }
    ]
  },
  'total': {
    type: 'number',
    label: 'Total',
    required: true,
    min: 0,
    step: 0.01,
    placeholder: '0.00'
  },
  'date': {
    type: 'date',
    label: 'Fecha',
    required: true
  },
  'time': {
    type: 'time',
    label: 'Hora',
    required: true
  }
};

// --- Estado Reactivo ---
const tickets = ref<TicketData[]>([]);
const isLoading = ref(true);
const showTicketModal = ref(false);
const selectedTicket = ref<TicketData | null>(null);
const mainFormRef = ref<InstanceType<typeof MainForm> | null>(null);

// --- Título dinámico para el formulario ---
const formTitle = computed<string>(() =>
  selectedTicket.value ? 'Editar Ticket' : 'Nuevo Ticket'
);

// --- Configuración de la Tabla ---
const tableColumns = [
  { key: 'ticketID', label: 'ID Ticket' },
  { 
    key: 'customerData', 
    label: 'Cliente',
    formatter: (customerData: any) => customerData?.name || 'N/A'
  },
  { 
    key: 'customerData', 
    label: 'DNI',
    formatter: (customerData: any) => customerData?.dni || 'N/A'
  },
  { 
    key: 'customerData', 
    label: 'Tipo',
    formatter: (customerData: any) => {
      const orderTypes: Record<string, string> = {
        'dine-in': 'Comer aquí',
        'takeout': 'Para llevar',
        'delivery': 'Delivery'
      };
      return orderTypes[customerData?.orderType] || 'N/A';
    }
  },
  { 
    key: 'total', 
    label: 'Total',
    formatter: (total: number) => `$${total.toFixed(2)}`
  },
  { key: 'date', label: 'Fecha' },
  { key: 'time', label: 'Hora' }
];

const tableActions = [
  { label: 'Ver', event: 'view', class: 'btn-info' },
  { label: 'Editar', event: 'edit', class: 'btn-primary' },
  { label: 'Eliminar', event: 'delete', class: 'btn-danger' }
];

// --- Ciclo de Vida ---
onMounted(async () => {
  emitter.on('sync:change', fetchTickets);
  setTimeout(fetchTickets, 2000);
});

onUnmounted(() => {
  emitter.off('sync:change', fetchTickets);
});

// --- Métodos ---
async function fetchTickets() {
  isLoading.value = true;
  try {
    const allTickets = await ticketService.getAllTickets();
    if (!allTickets || !Array.isArray(allTickets)) {
      console.error("Failed to load tickets from IndexedDB: Invalid data");
      isLoading.value = false;
      return;
    }
    tickets.value = allTickets as TicketData[];
  } catch (error) {
    console.error("Error al cargar los tickets:", error);
  } finally {
    isLoading.value = false;
  }
}

function handleNewTicket() {
  selectedTicket.value = null;
  showTicketModal.value = true;
  nextTick(() => {
    mainFormRef.value?.resetForm();
  });
}

function handleTableAction(eventName: string, ticket: TicketData) {
  switch (eventName) {
    case 'view':
      viewTicket(ticket);
      break;
    case 'edit':
      selectedTicket.value = ticket;
      showTicketModal.value = true;
      nextTick(() => {
        // Aplanar los datos anidados para el formulario
        const flatData = {
          ...ticket,
          'customerData.name': ticket.customerData?.name,
          'customerData.dni': ticket.customerData?.dni,
          'customerData.phone': ticket.customerData?.phone,
          'customerData.address': ticket.customerData?.address,
          'customerData.orderType': ticket.customerData?.orderType
        };
        mainFormRef.value?.setFormData(flatData as any);
      });
      break;
    case 'delete':
      if (confirm(`¿Estás seguro de que quieres eliminar el ticket "${ticket.ticketID}"?`)) {
        deleteTicket(String(ticket.id));
      }
      break;
  }
}

function viewTicket(ticket: TicketData) {
  // Acción adicional: mostrar detalles del ticket
  alert(`Ticket: ${ticket.ticketID}\nCliente: ${ticket.customerData?.name}\nTotal: $${ticket.total.toFixed(2)}\n\nProductos: ${ticket.cartItems?.length || 0} items`);
}

async function deleteTicket(ticketId: string) {
  try {
    await ticketService.deleteTicket(ticketId);
    console.log(`Ticket con ID ${ticketId} eliminado.`);
    await fetchTickets();
  } catch (error) {
    console.error(`Error al eliminar el ticket ${ticketId}:`, error);
  }
}

async function handleFormSubmit(formData: any) {
  try {
    // Reconstruir la estructura anidada
    const ticketData: TicketData = {
      id: selectedTicket.value?.id || formData.ticketID,
      ticketID: formData.ticketID,
      customerData: {
        id: selectedTicket.value?.customerData?.id || formData.customerData.id,
        name: formData['customerData.name'],
        dni: formData['customerData.dni'],
        phone: formData['customerData.phone'],
        address: formData['customerData.address'],
        orderType: formData['customerData.orderType']
      },
      cartItems: selectedTicket.value?.cartItems || [],
      total: parseFloat(formData.total),
      date: formData.date,
      time: formData.time
    };

    if (selectedTicket.value) {
      await ticketService.updateTicket(ticketData);
    } else {
      await ticketService.saveTicket(ticketData);
    }
    
    console.log("Ticket guardado:", ticketData);
    showTicketModal.value = false;
    await fetchTickets();
  } catch (error) {
    console.error("Error al guardar el ticket:", error);
  }
}
</script>

<style scoped>
.ticket-manager {
  padding: 24px;
  background-color: #121212;
  border-radius: 8px;
}

.manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  color: #fff;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover {
  background-color: #0056b3;
}

.btn-info {
  background-color: #17a2b8;
  color: white;
}

.btn-info:hover {
  background-color: #138496;
}
</style>