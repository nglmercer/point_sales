<template>
  <div
    v-if="visible"
    :class="containerClass"
    role="status"
    aria-live="polite"
    aria-atomic="true"
    @mouseenter="pauseTimer"
    @mouseleave="resumeTimer"
  >
    <div class="flex gap-4 items-start">
      <!-- Icono opcional -->
      <div v-if="showIcon" class="flex-shrink-0 mt-1 text-current">
        <svg class="w-7 h-7" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="12" r="10" class="opacity-90"/>
          <rect x="11" y="10" width="2" height="6" fill="white"/>
          <rect x="11" y="6" width="2" height="2" fill="white"/>
        </svg>
      </div>

      <div class="flex-1 min-w-0">
        <div class="flex justify-between items-start gap-4">
          <div>
            <p class="font-semibold text-base md:text-lg" v-if="title">{{ title }}</p>
            <p class="text-sm md:text-base mt-1" v-if="message">{{ message }}</p>
          </div>

          <div v-if="hasDetails || showAccept" class="ml-2 flex-shrink-0 flex items-center gap-2">
            <button
              v-if="hasDetails"
              @click="toggle"
              :aria-expanded="expanded.toString()"
              :aria-controls="detailsId"
              class="inline-flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 transition"
            >
              <span>{{ expanded ? 'Ocultar' : 'Ver detalles' }}</span>
              <svg
                :class="['w-4 h-4 transform transition-transform', expanded ? 'rotate-180' : 'rotate-0']"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <path d="M6 8l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>

            <button
              v-if="showAccept"
              @click="accept"
              @keyup.enter.space.prevent="accept"
              class="inline-flex items-center px-3 py-1 rounded-md text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-offset-1 transition"
              aria-label="Aceptar"
            >
              Aceptar
            </button>

            <button
              v-if="showClose"
              @click="close('closed')"
              aria-label="Cerrar"
              class="p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1"
            >
              <span class="sr-only">Cerrar</span>
              ✕
            </button>
          </div>
        </div>

        <transition
          enter-from-class="opacity-0 scale-95 -translate-y-1"
          enter-active-class="transition ease-out duration-150"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-from-class="opacity-100 scale-100"
          leave-active-class="transition ease-in duration-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-show="expanded"
            :id="detailsId"
            class="mt-4 border-l-4 pl-4 py-3 rounded-sm text-sm"
            :class="detailsClass"
            role="region"
          >
            <slot name="details" v-if="$slots.details"></slot>

            <template v-else>
              <div v-if="Array.isArray(details)">
                <ul class="list-disc pl-5 space-y-1">
                  <li v-for="(item, i) in details" :key="i">
                    <span v-if="isPrimitive(item)">{{ item }}</span>
                    <pre v-else class="text-xs bg-white/60 p-2 rounded-md overflow-x-auto">{{ format(item) }}</pre>
                  </li>
                </ul>
              </div>

              <div v-else-if="isObject(details)">
                <pre class="text-xs bg-white/60 p-2 rounded-md overflow-x-auto">{{ format(details) }}</pre>
              </div>

              <p v-else-if="typeof details === 'string'">{{ details }}</p>
            </template>
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, useSlots } from 'vue'

// Props
const props = defineProps({
  title: { type: String, default: 'Información' },
  message: { type: String, default: '' },
  details: { type: [String, Array, Object], default: null },
  color: { type: String, default: 'blue' }, // blue | green | yellow | red (simple mapping)
  initiallyExpanded: { type: Boolean, default: false },

  // Nuevas props
  showAccept: { type: Boolean, default: true },          // mostrar botón Aceptar por defecto
  showClose: { type: Boolean, default: false },          // mostrar botón cerrar (opcional)
  autoDismiss: { type: Boolean, default: true },         // auto-cerrar por defecto
  autoDismissDelay: { type: Number, default: 15000 },    // 15s por defecto (milisegundos)
  showIcon: { type: Boolean, default: true },            // mostrar icono
  maxWidthClass: { type: String, default: 'max-w-3xl' }  // ocupa más espacio por defecto
})

// Emits
const emit = defineEmits(['accepted', 'closed', 'dismissed', 'toggle'])

// Estado local
const visible = ref(true)
const expanded = ref(props.initiallyExpanded)
const slots = useSlots()
const hasDetails = computed(() => !!props.details || !!slots.details)
const detailsId = `alert-details-${Math.random().toString(36).substring(2, 9)}`

// Simplified color classes
const simpleColorMap = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', accent: 'border-blue-400', text: 'text-blue-800' },
  green: { bg: 'bg-green-50', border: 'border-green-200', accent: 'border-green-400', text: 'text-green-800' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', accent: 'border-yellow-400', text: 'text-yellow-800' },
  red: { bg: 'bg-red-50', border: 'border-red-200', accent: 'border-red-400', text: 'text-red-800' }
}
const colorSet = simpleColorMap[props.color] || simpleColorMap.blue

const containerClass = computed(() =>
  `${props.maxWidthClass} w-full mx-auto p-4 rounded-md border ${colorSet.border} ${colorSet.bg} ${colorSet.text}`
)
const detailsClass = computed(() => `border-l-4 ${colorSet.accent} ${colorSet.bg}`)

// Helpers
const isObject = (val) => val && typeof val === 'object' && !Array.isArray(val)
const isPrimitive = (val) => ['string', 'number', 'boolean'].includes(typeof val)
const format = (val) => JSON.stringify(val, null, 2)

// Auto-dismiss timer
let timer = null
let remaining = props.autoDismissDelay
let startTs = null

const startTimer = () => {
  clearTimer()
  if (!props.autoDismiss) return
  remaining = props.autoDismissDelay
  startTs = Date.now()
  timer = setTimeout(() => {
    // Only auto-dismiss if still visible
    if (visible.value) {
      visible.value = false
      emit('dismissed')
      emit('closed')
    }
  }, remaining)
}

const clearTimer = () => {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

const pauseTimer = () => {
  if (!props.autoDismiss || !timer) return
  // compute remaining
  const elapsed = Date.now() - (startTs || Date.now())
  remaining = Math.max(0, remaining - elapsed)
  clearTimer()
}

const resumeTimer = () => {
  if (!props.autoDismiss) return
  if (remaining <= 0) {
    // already due
    visible.value = false
    emit('dismissed')
    emit('closed')
    return
  }
  startTs = Date.now()
  timer = setTimeout(() => {
    if (visible.value) {
      visible.value = false
      emit('dismissed')
      emit('closed')
    }
  }, remaining)
}

// Actions
const accept = () => {
  // mark accepted, clear timer and hide
  clearTimer()
  visible.value = false
  emit('accepted')
  emit('closed')
}

const close = (type = 'closed') => {
  clearTimer()
  visible.value = false
  if (type === 'dismissed') emit('dismissed')
  emit('closed')
}

const toggle = () => {
  expanded.value = !expanded.value
  emit('toggle', expanded.value)
}

// Lifecycle
onMounted(() => {
  if (props.autoDismiss) startTimer()
})

onBeforeUnmount(() => {
  clearTimer()
})

// Si cambian props.autoDismiss o autoDismissDelay reiniciar timer
watch(() => [props.autoDismiss, props.autoDismissDelay], () => {
  clearTimer()
  if (props.autoDismiss) startTimer()
})
</script>

<style scoped>
/* Estilos mínimos para dar más presencia a la información */
p { line-height: 1.25; }
pre { white-space: pre-wrap; word-break: break-word; }
</style>
