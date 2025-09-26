<template>
  <div class="sidebar-nav" :class="sidebarClasses">
    <!-- Header slot for logo or title -->
    <div v-if="$slots.header" class="sidebar-header">
      <slot name="header"></slot>
    </div>

    <!-- Navigation items -->
    <nav class="sidebar-navigation" :class="navigationClasses">
      <div
        v-for="(item, index) in items"
        :key="item.id || index"
        class="nav-item"
        :class="getItemClasses(item)"
        @click="handleItemClick(item, index)"
      >
        <!-- Icon with Material Symbols -->
        <div class="nav-icon" :class="iconClasses">
          <span class="material-symbols-outlined" :style="getIconStyle(item)">
            {{ item.icon }}
          </span>
          
          <!-- Badge/Indicator slot -->
          <div v-if="item.badge || $slots[`badge-${item.id}`]" class="nav-badge">
            <slot :name="`badge-${item.id}`" :item="item" :badge="item.badge">
              <span class="badge-default" :class="getBadgeClasses(item)">
                {{ item.badge }}
              </span>
            </slot>
          </div>
        </div>

        <!-- Label -->
        <div class="nav-label" :class="labelClasses">
          <slot :name="`label-${item.id}`" :item="item">
            {{ item.label }}
          </slot>
        </div>

        <!-- Custom indicator slot -->
        <div v-if="$slots[`indicator-${item.id}`]" class="nav-indicator">
          <slot :name="`indicator-${item.id}`" :item="item"></slot>
        </div>
      </div>
    </nav>

    <!-- Footer slot for additional content -->
    <div v-if="$slots.footer" class="sidebar-footer">
      <slot name="footer"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface NavItem {
  id?: string
  icon: string
  label: string
  active?: boolean
  disabled?: boolean
  badge?: string | number
  badgeType?: 'primary' | 'secondary' | 'success' | 'warning' | 'error'
  iconSize?: string
  iconColor?: string
  [key: string]: any
}

interface Props {
  items: NavItem[]
  variant?: 'vertical' | 'horizontal'
  size?: 'sm' | 'md' | 'lg'
  theme?: 'light' | 'dark'
  compact?: boolean
  rounded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'vertical',
  size: 'md',
  theme: 'light',
  compact: false,
  rounded: false
})

const emit = defineEmits<{
  'item-click': [item: NavItem, index: number]
  'item-select': [item: NavItem]
}>()

// Computed classes
const sidebarClasses = computed(() => [
  'sidebar-nav',
  `sidebar-${props.variant}`,
  `sidebar-${props.size}`,
  `sidebar-${props.theme}`,
  {
    'sidebar-compact': props.compact,
    'sidebar-rounded': props.rounded
  }
])

const navigationClasses = computed(() => [
  'sidebar-navigation',
  {
    'flex-col': props.variant === 'vertical',
    'flex-row': props.variant === 'horizontal'
  }
])

const iconClasses = computed(() => [
  'nav-icon',
  {
    'text-lg': props.size === 'sm',
    'text-xl': props.size === 'md',
    'text-2xl': props.size === 'lg'
  }
])

const labelClasses = computed(() => [
  'nav-label',
  {
    'text-xs': props.size === 'sm',
    'text-sm': props.size === 'md',
    'text-base': props.size === 'lg',
    'hidden': props.compact
  }
])

// Methods
const getItemClasses = (item: NavItem) => [
  'nav-item',
  {
    'nav-item-active': item.active,
    'nav-item-disabled': item.disabled,
    'cursor-pointer': !item.disabled,
    'cursor-not-allowed': item.disabled,
    'opacity-50': item.disabled
  }
]

const getBadgeClasses = (item: NavItem) => [
  'badge-default',
  `badge-${item.badgeType || 'primary'}`
]

const getIconStyle = (item: NavItem) => ({
  fontSize: item.iconSize || undefined,
  color: item.iconColor || undefined
})

const handleItemClick = (item: NavItem, index: number) => {
  if (item.disabled) return
  
  emit('item-click', item, index)
  emit('item-select', item)
}
</script>

<style scoped>
/* Base sidebar styles */

</style>