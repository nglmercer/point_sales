<template>
  <div 
    :class="[
      'navigation-container',
      `navigation-${direction}`,
      {
        'has-overflow': hasOverflow
      }
    ]"
    ref="containerRef"
  >
    <!-- Navigation Wrapper -->
    <div 
      class="navigation-wrapper"
      ref="wrapperRef"
      @scroll="handleScroll"
      :style="wrapperStyles"
    >
      <!-- Navigation Content -->
      <div
        class="navigation-content"
        ref="contentRef"
        :style="{
          display: 'flex',
          flexDirection: props.direction === 'horizontal' ? 'row' : 'column',
          gap: props.itemSpacing,
          minWidth: props.direction === 'horizontal' ? 'max-content' : '100%',
          minHeight: props.direction === 'vertical' ? 'max-content' : '100%'
        }"
      >
        <!-- Navigation Items -->
        <div
          v-for="(item, index) in items"
          :key="item.id || index"
          :class="[
            'navigation-item',
            {
              'is-active': item.active
            }
          ]"
          :style="getItemStyles(item, index)"
          @click="handleItemClick(item, index)"
        >
          <slot 
            name="item" 
            :item="item" 
            :index="index" 
            :isActive="item.active"
          >
            <!-- Default Item Template -->
            <div class="default-nav-item">
              <span 
                v-if="item.icon" 
                class="material-symbols-outlined nav-icon"
                :style="{ fontSize: iconSize }"
              >
                {{ item.icon }}
              </span>
              <span v-if="item.label && showLabels" class="nav-label">
                {{ item.label }}
              </span>
            </div>
          </slot>
        </div>
      </div>
    </div>

    <!-- Scroll Indicators -->
    <div v-if="hasOverflow && showIndicators" class="scroll-indicators">
      <!-- Previous/Left Indicator -->
      <button
        v-if="canScrollPrevious"
        @click="scrollToPrevious"
        :class="[
          'scroll-indicator scroll-previous',
          `scroll-${direction === 'horizontal' ? 'left' : 'up'}`
        ]"
        :aria-label="direction === 'horizontal' ? 'Scroll left' : 'Scroll up'"
      >
        <span class="material-symbols-outlined">
          {{ direction === 'horizontal' ? 'chevron_left' : 'keyboard_arrow_up' }}
        </span>
      </button>

      <!-- Next/Right Indicator -->
      <button
        v-if="canScrollNext"
        @click="scrollToNext"
        :class="[
          'scroll-indicator scroll-next',
          `scroll-${direction === 'horizontal' ? 'right' : 'down'}`
        ]"
        :aria-label="direction === 'horizontal' ? 'Scroll right' : 'Scroll down'"
      >
        <span class="material-symbols-outlined">
          {{ direction === 'horizontal' ? 'chevron_right' : 'keyboard_arrow_down' }}
        </span>
      </button>
    </div>

    <!-- Overflow Dots Indicator -->
    <div v-if="hasOverflow && showDots" class="overflow-dots">
      <div
        v-for="(dot, index) in visibleDots"
        :key="index"
        :class="[
          'overflow-dot',
          { 'is-active': dot.active }
        ]"
        @click="scrollToSection(index)"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'

// Types
interface NavigationItem {
  id?: string | number
  icon?: string
  label?: string
  active?: boolean
  disabled?: boolean
  [key: string]: any
}

interface NavigationProps {
  items: NavigationItem[]
  direction?: 'horizontal' | 'vertical'
  showLabels?: boolean
  showIndicators?: boolean
  showDots?: boolean
  iconSize?: string
  itemSpacing?: string
  scrollBehavior?: 'smooth' | 'auto'
  autoHide?: boolean
  maxVisibleItems?: number
}

// Props
const props = withDefaults(defineProps<NavigationProps>(), {
  direction: 'horizontal',
  showLabels: true,
  showIndicators: true,
  showDots: false,
  iconSize: '24px',
  itemSpacing: '8px',
  scrollBehavior: 'smooth',
  autoHide: false,
  maxVisibleItems: 0
})

// Emits
const emit = defineEmits<{
  'item-click': [item: NavigationItem, index: number]
  'scroll': [scrollPosition: number, direction: string]
}>()

// Refs
const containerRef = ref<HTMLElement>()
const wrapperRef = ref<HTMLElement>()
const contentRef = ref<HTMLElement>()

// State
const hasOverflow = ref(false)
const canScrollPrevious = ref(false)
const canScrollNext = ref(false)
const scrollPosition = ref(0)

// Computed
const wrapperStyles = computed(() => ({
  [`overflow-${props.direction === 'horizontal' ? 'x' : 'y'}`]: 'auto',
  [`overflow-${props.direction === 'horizontal' ? 'y' : 'x'}`]: 'hidden',
  scrollBehavior: props.scrollBehavior
}))

const contentStyles = computed(() => ({
  display: 'flex',
  flexDirection: props.direction === 'horizontal' ? 'row' : 'column',
  gap: props.itemSpacing,
  minWidth: props.direction === 'horizontal' ? 'max-content' : '100%',
  minHeight: props.direction === 'vertical' ? 'max-content' : '100%'
}))

const visibleDots = computed(() => {
  if (!hasOverflow.value || !props.showDots) return []
  
  const totalSections = Math.ceil(props.items.length / (props.maxVisibleItems || 5))
  const currentSection = Math.floor(scrollPosition.value / (props.maxVisibleItems || 5))
  
  return Array.from({ length: totalSections }, (_, index) => ({
    active: index === currentSection
  }))
})

// Methods
const getItemStyles = (item: NavigationItem, index: number) => ({
  opacity: item.disabled ? 0.5 : 1,
  cursor: item.disabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.2s ease'
})

const checkOverflow = async () => {
  await nextTick()
  
  if (!wrapperRef.value || !contentRef.value) return
  
  const wrapper = wrapperRef.value
  const content = contentRef.value
  
  if (props.direction === 'horizontal') {
    hasOverflow.value = content.scrollWidth > wrapper.clientWidth
    canScrollPrevious.value = wrapper.scrollLeft > 0
    canScrollNext.value = wrapper.scrollLeft < (content.scrollWidth - wrapper.clientWidth)
  } else {
    hasOverflow.value = content.scrollHeight > wrapper.clientHeight
    canScrollPrevious.value = wrapper.scrollTop > 0
    canScrollNext.value = wrapper.scrollTop < (content.scrollHeight - wrapper.clientHeight)
  }
}

const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement
  
  if (props.direction === 'horizontal') {
    scrollPosition.value = target.scrollLeft
  } else {
    scrollPosition.value = target.scrollTop
  }
  
  checkOverflow()
  emit('scroll', scrollPosition.value, props.direction)
}

const scrollToPrevious = () => {
  if (!wrapperRef.value) return
  
  const wrapper = wrapperRef.value
  const scrollAmount = wrapper.clientWidth * 0.8 // 80% of visible area
  
  if (props.direction === 'horizontal') {
    wrapper.scrollBy({ left: -scrollAmount, behavior: props.scrollBehavior })
  } else {
    wrapper.scrollBy({ top: -scrollAmount, behavior: props.scrollBehavior })
  }
}

const scrollToNext = () => {
  if (!wrapperRef.value) return
  
  const wrapper = wrapperRef.value
  const scrollAmount = wrapper.clientWidth * 0.8 // 80% of visible area
  
  if (props.direction === 'horizontal') {
    wrapper.scrollBy({ left: scrollAmount, behavior: props.scrollBehavior })
  } else {
    wrapper.scrollBy({ top: scrollAmount, behavior: props.scrollBehavior })
  }
}

const scrollToSection = (sectionIndex: number) => {
  if (!wrapperRef.value) return
  
  const itemsPerSection = props.maxVisibleItems || 5
  const targetIndex = sectionIndex * itemsPerSection
  const itemElements = contentRef.value?.children
  
  if (itemElements && itemElements[targetIndex]) {
    const targetElement = itemElements[targetIndex] as HTMLElement
    targetElement.scrollIntoView({ behavior: props.scrollBehavior })
  }
}

const handleItemClick = (item: NavigationItem, index: number) => {
  if (item.disabled) return
  emit('item-click', item, index)
}



// Resize Observer
let resizeObserver: ResizeObserver | null = null

const setupResizeObserver = () => {
  if (!containerRef.value) return
  
  resizeObserver = new ResizeObserver(() => {
    checkOverflow()
  })
  
  resizeObserver.observe(containerRef.value)
}

// Lifecycle
onMounted(() => {
  checkOverflow()
  setupResizeObserver()
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})

// Watchers
watch(() => props.items, () => {
  nextTick(() => checkOverflow())
}, { deep: true })

watch(() => props.direction, () => {
  nextTick(() => checkOverflow())
})
</script>

<style scoped>
.navigation-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.navigation-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
}

.navigation-wrapper::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

.navigation-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

.navigation-wrapper::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 2px;
}

.navigation-wrapper::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

.navigation-content {
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: space-evenly;
}

.navigation-item {
  flex-shrink: 0;
  transition: all 0.2s ease;
  border-radius: 8px;
  position: relative;
  min-height: 44px;
  display: flex;
}

.navigation-item:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.navigation-item.is-active {
  background-color: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}



.default-nav-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 12px;
  white-space: nowrap;
  width: 100%;
  height: 100%;
  min-height: 44px;
}

.nav-icon {
  flex-shrink: 0;
}

.nav-label {
  font-size: 14px;
  font-weight: 500;
}

/* Scroll Indicators */
.scroll-indicators {
  position: absolute;
  z-index: 10;
}

.navigation-horizontal .scroll-indicators {
  top: 50%;
  transform: translateY(-50%);
}

.navigation-vertical .scroll-indicators {
  left: 50%;
  transform: translateX(-50%);
}

.scroll-indicator {
  position: absolute;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.scroll-indicator:hover {
  background: #f9fafb;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.scroll-left {
  left: -16px;
}

.scroll-right {
  right: -16px;
}

.scroll-up {
  top: -16px;
}

.scroll-down {
  bottom: -16px;
}

/* Overflow Dots */
.overflow-dots {
  position: absolute;
  display: flex;
  gap: 4px;
  z-index: 10;
}

.navigation-horizontal .overflow-dots {
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
}

.navigation-vertical .overflow-dots {
  right: -20px;
  top: 50%;
  transform: translateY(-50%);
  flex-direction: column;
}

.overflow-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d1d5db;
  cursor: pointer;
  transition: all 0.2s ease;
}

.overflow-dot.is-active {
  background: #3b82f6;
}

.overflow-dot:hover {
  background: #6b7280;
}

/* Auto-hide scrollbars */
.navigation-container.auto-hide .navigation-wrapper {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.navigation-container.auto-hide .navigation-wrapper::-webkit-scrollbar {
  display: none;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .scroll-indicator {
    width: 28px;
    height: 28px;
  }
  
  .default-nav-item {
    padding: 6px 10px;
  }
  
  .nav-label {
    font-size: 13px;
  }
}
</style>