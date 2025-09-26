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
      @input="$emit('update:modelValue', $event.target.value)"
    />
  </div>
</template>

<script setup>
defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: 'Search...'
  },
  inputClass: {
    type: String,
    default: ''
  }
})

defineEmits(['update:modelValue'])
</script>