<template>
  <div :class="containerClass">
    <div :class="logoClass" class="text-yellow-500 font-bold flex justify-center">
      <img src="/logo_image.png" alt="logo" class="size-16">
    </div>
    <div v-if="showText" :class="textClass">
      <h1 :class="titleClass">{{ "Name" }}</h1>
      <p v-if="subtitle" :class="subtitleClass">{{ subtitle }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  subtitle?: string;
  align?: 'left' | 'center' | 'right';
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  showText: true,
  subtitle: '',
  align: 'center'
});

const sizeClasses = {
  sm: 'text-2xl',
  md: 'text-4xl',
  lg: 'text-6xl',
  xl: 'text-8xl'
};

const textSizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl'
};

const alignClasses = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right'
};

const containerClass = computed(() => [
  alignClasses[props.align]
]);

const logoClass = computed(() => [
  sizeClasses[props.size]
]);

const textClass = computed(() => [
  'mt-2',
  alignClasses[props.align]
]);

const titleClass = computed(() => [
  'font-bold',
  textSizeClasses[props.size]
]);

const subtitleClass = computed(() => [
  'text-sm text-gray-600 mt-1'
]);
</script>