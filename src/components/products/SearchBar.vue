<template>
  <div class="w-full">
    <input
      type="text"
      :value="modelValue"
      :placeholder="placeholder"
      :class="[
        'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors',
        inputClass
      ]"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: string;
  placeholder?: string;
  inputClass?: string;
}

withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: 'Search...',
  inputClass: ''
});

defineEmits<{
  (e: 'update:modelValue', value: string): void
}>();
</script>