<template>
  <div :class="['data-table-container overflow-auto', { dark: darkmode }]">
    <div v-if="isLoading" class="state-overlay">
      <p>Cargando datos...</p>
    </div>
    <div v-else-if="!items || items.length === 0" class="state-overlay">
      <p>{{ emptyMessage }}</p>
    </div>
    <table v-else class="data-table">
      <thead>
        <tr>
          <th v-for="column in columns" :key="column.key">
            {{ column.label }}
          </th>
          <th v-if="actions && actions.length > 0" class="actions-header">
            Acciones
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item[primaryKey]">
          <td v-for="column in columns" :key="`${item[primaryKey]}-${column.key}`">
            {{ getCellValue(item, column) }}
          </td>
          <td v-if="actions && actions.length > 0" class="actions-cell">
            <button
              v-for="action in actions"
              :key="action.event"
              :class="['btn-action', action.class || 'btn-secondary']"
              @click="handleActionClick(action.event, item)"
            >
              {{ action.label }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { withDefaults } from 'vue'

// --- Interfaces para Tipado ---
interface ColumnDefinition {
  key: string;
  label: string;
  formatter?: (value: any, item: any) => string;
}

interface ActionDefinition {
  label: string;
  event: string;
  class?: string; // Para estilos personalizados (e.g., 'btn-danger')
}

// --- Props ---
interface Props {
  items: any[];
  columns: ColumnDefinition[];
  actions?: ActionDefinition[];
  isLoading?: boolean;
  darkmode?: boolean;
  primaryKey?: string;
  emptyMessage?: string;
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  darkmode: false,
  primaryKey: 'id',
  emptyMessage: 'No hay elementos para mostrar.',
  actions: () => []
})

// --- Emits ---
const emit = defineEmits<{
  (e: 'action', eventName: string, item: any): void
}>()

// --- Métodos ---
function getCellValue(item: any, column: ColumnDefinition): string {
  const value = item[column.key];
  if (column.formatter) {
    return column.formatter(value, item);
  }
  return value !== null && value !== undefined ? String(value) : '';
}

function handleActionClick(eventName: string, item: any) {
  emit('action', eventName, item);
}
</script>

<style scoped>
.data-table-container {
  --bg-color: #ffffff;
  --text-color: #333;
  --border-color: #e0e0e0;
  --header-bg: #f5f5f5;
  --row-hover-bg: #f9f9f9;
  --btn-secondary-bg: #6c757d;
  --btn-secondary-border: #6c757d;
  --btn-primary-bg: #007bff;
  --btn-primary-border: #007bff;
  --btn-danger-bg: #dc3545;
  --btn-danger-border: #dc3545;
  
  font-family: system-ui, -apple-system, sans-serif;
  color: var(--text-color);
  background-color: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden; /* Para que el borde redondeado se aplique a la tabla */
  position: relative;
  min-height: 150px;
}
.overflow-auto {
  overflow: auto;
}
.data-table-container.dark {
  --bg-color: #1a1a1a;
  --text-color: #e0e0e0;
  --border-color: #333;
  --header-bg: #2a2a2a;
  --row-hover-bg: #252525;
}

.state-overlay {
  display: flex;
  justify-content: center;
  align-items: center;
  position: absolute;
  inset: 0;
  color: var(--text-color);
  opacity: 0.7;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

thead th {
  background-color: var(--header-bg);
  font-weight: 600;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

tbody tr:hover {
  background-color: var(--row-hover-bg);
}

.actions-header {
  text-align: right;
}

.actions-cell {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  white-space: nowrap;
}

.btn-action {
  padding: 6px 12px;
  border: 1px solid transparent;
  border-radius: 5px;
  font-size: 0.85rem;
  color: white;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-action:hover {
  opacity: 0.85;
}

.btn-secondary {
  background-color: var(--btn-secondary-bg);
  border-color: var(--btn-secondary-border);
}

.btn-primary {
  background-color: var(--btn-primary-bg);
  border-color: var(--btn-primary-border);
}

.btn-danger {
    background-color: var(--btn-danger-bg);
    border-color: var(--btn-danger-border);
}
</style>