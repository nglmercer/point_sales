<template>
  <div class="product-manager">
    <header class="manager-header">
      <h2>Gestión de Productos</h2>
      <button class="btn btn-primary" @click="handleNewProduct">
        Añadir Producto
      </button>
    </header>

    <DataTable
      :items="products"
      :columns="tableColumns"
      :actions="tableActions"
      :is-loading="isLoading"
      :darkmode="true"
      @action="handleTableAction"
    />

    <!-- Modal para crear/editar productos -->
    <dlg-cont :visible="showProductModal" @close="showProductModal = false">
      <MainForm
        ref="mainFormRef"
        form-id="productForm"
        :title="formTitle"
        :darkmode="true"
        @submit="handleFormSubmit"
      />
    </dlg-cont>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue';
import { productService, initializeDatabase, type Product } from '@/utils/idb/StoreManager';
import DataTable from '@/components/Tables/DataTable.vue';
import MainForm from '@/components/Forms/MainForm.vue'; // Asume que MainForm está en esta ruta
import {DlgCont} from '@/litcomponents/dialog.ts';
import { CInput } from '@/litcomponents/CInput';

// --- Estado Reactivo ---
const products = ref<Product[]>([]);
const isLoading = ref(true);
const showProductModal = ref(false);
const selectedProduct = ref<Product | null>(null);
const mainFormRef = ref<InstanceType<typeof MainForm> | null>(null);

// --- Título dinámico para el formulario ---
const formTitle = computed<string>(() =>
    //@ts-ignore
  selectedProduct.value ? 'Editar Producto' : 'Nuevo Producto'
);

// --- Configuración de la Tabla ---
const tableColumns = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Nombre' },
  { 
    key: 'price', 
    label: 'Precio',
    formatter: (price: number) => `$${price}`
  },
  { key: 'category', label: 'Categoría' },
  { 
    key: 'stock', 
    label: 'Stock',
    formatter: (stock: number | null | undefined) => {
      if (stock === null || stock === undefined) return 'Sin control';
      if (stock === 0) return 'Sin stock';
      if (stock <= 5) return `⚠️ ${stock}`;
      return stock.toString();
    }
  },
];

const tableActions = [
  { label: 'Editar', event: 'edit', class: 'btn-primary' },
  { label: 'Eliminar', event: 'delete', class: 'btn-danger' },
];

// --- Ciclo de Vida ---
onMounted(async () => {
  await initializeDatabase(); // Asegura que la DB esté lista y sembrada
  await fetchProducts();
});

// --- Métodos ---
async function fetchProducts() {
  isLoading.value = true;
  try {
    const allProducts  = await productService.getAllProducts();
    products.value = allProducts as Product[];
  } catch (error) {
    console.error("Error al cargar los productos:", error);
  } finally {
    isLoading.value = false;
  }
}

function handleNewProduct() {
  selectedProduct.value = null;
  showProductModal.value = true;
  // Usamos nextTick para asegurarnos que el formulario esté renderizado antes de resetearlo
  nextTick(() => {
    mainFormRef.value?.resetForm();
  });
}

function handleTableAction(eventName: string, product: Product) {
  switch (eventName) {
    case 'edit':
      selectedProduct.value = product;
      showProductModal.value = true;
      // Espera a que el DOM se actualice y el formulario sea visible
      nextTick(() => {
        mainFormRef.value?.setFormData({ ...product } as Partial<Record<string, string | number | boolean | string[]>>);
      });
      break;
    case 'delete':
      if (confirm(`¿Estás seguro de que quieres eliminar "${product.name}"?`)) {
        deleteProduct(product.id);
      }
      break;
  }
}

async function deleteProduct(productId: number) {
  try {
    await productService.deleteProduct(productId);
    console.log(`Producto con ID ${productId} eliminado.`);
    await fetchProducts(); // Recargar la lista
  } catch (error) {
    console.error(`Error al eliminar el producto ${productId}:`, error);
  }
}

async function handleFormSubmit(formData: any) {
  try {
    // El método saveData de idb-manager maneja tanto la creación como la actualización
    await productService.saveProduct(formData)
    console.log("Producto guardado:", formData);
    showProductModal.value = false;
    await fetchProducts(); // Recargar la lista para ver los cambios
  } catch (error) {
    console.error("Error al guardar el producto:", error);
  }
}
</script>

<style scoped>
.product-manager {
  padding: 24px;
  background-color: #121212; /* Fondo oscuro para el contenedor */
  border-radius: 8px;
}

.manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  color: #fff;
}

/* Clases de botones genéricas para consistencia */
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
</style>