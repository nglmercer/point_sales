import { ref,toRaw , reactive, computed, nextTick, onMounted, onUnmounted } from 'vue'
import type { FormData, FormConfig } from '@/utils/form-config'
import { defaultProductFormConfig, defaultProductData } from '@/utils/form-config'
import { dbManager, type Product } from '@/utils/StoreManager'
export interface UseFormManagerOptions {
  formId: string
  initialData?: FormData
  formConfig?: FormConfig
  onSubmit?: (data: FormData) => void | Promise<void>
  onReset?: () => void
  onChange?: (fieldName: string, value: any, formData: FormData) => void
}
function isValueEmpty(value: any): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return true;
  }
  return false;
}
export function useFormManager(options: UseFormManagerOptions) {
  const {
    formId,
    initialData = {},
    formConfig = defaultProductFormConfig,
    onSubmit,
    onReset,
    onChange
  } = options

  // Estado reactivo del formulario
  const formData = reactive<FormData>({ ...defaultProductData, ...initialData })
  const validationErrors = reactive<Record<string, string>>({})
  const isSubmitting = ref(false)
  const isValid = ref(true)

  // Referencias DOM
  const formElement = ref<HTMLElement | null>(null)

  // Función para parsear valores según el tipo
  function parseValueByType(value: any, type: string): any {
    if (!value && value !== '0' && value !== 0) {
      return type === 'number' ? null : ''
    }
    
    switch (type) {
      case 'switch':
      case 'checkbox':
      case 'boolean':
        return coerceToBoolean(value)
      case 'number':
      case 'range':
        const num = Number(value)
        return isNaN(num) ? null : num
      default:
        return String(value)
    }
  }

  function coerceToBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') {
      return !['false', '0', '', 'null', 'undefined'].includes(value.toLowerCase())
    }
    return Boolean(value)
  }

  // Función para evaluar condiciones de visibilidad
  function evaluateShowCondition(condition: any): boolean {
    if (!condition?.field) return true
    
    const triggerValue = formData[condition.field as keyof FormData]
    const expectedValue = condition.value
    const negate = condition.negate === true
    
    let matches: boolean
    if (Array.isArray(expectedValue)) {
      matches = expectedValue.some(val => compareValues(triggerValue, val))
    } else {
      matches = compareValues(triggerValue, expectedValue)
    }
    
    return negate ? !matches : matches
  }

  function compareValues(actual: any, expected: any): boolean {
    // Comparación para booleanos
    if (typeof expected === 'boolean') {
      const actualBool = coerceToBoolean(actual)
      return String(actualBool) === String(expected)
    }
    
    // Comparación para null/undefined
    if (actual == null) {
      return expected == null || expected === ''
    }
    
    // Comparación de strings
    return String(actual) === String(expected)
  }

  // Computed para campos visibles
  const visibleFields = computed(() => {
    return Object.entries(formConfig).filter(([fieldKey, fieldConfig]) => {
      if (fieldConfig.hidden) return false
      if (!fieldConfig.showIf) return true
      return evaluateShowCondition(fieldConfig.showIf)
    })
  })

  // Función para actualizar un campo
  function updateField(fieldName: string, value: any) {
    const oldValue = formData[fieldName as keyof FormData]
    ;(formData as any)[fieldName] = value
    
    // Limpiar error de validación si existe
    if (validationErrors[fieldName]) {
      delete validationErrors[fieldName]
    }
    
    // Llamar callback de cambio
    if (onChange) {
      onChange(fieldName, value, formData)
    }
  }

  // Función para validar un campo
  function validateField(fieldName: string): boolean {
    const fieldConfig = formConfig[fieldName];
    if (!fieldConfig) return true;

    const value = formData[fieldName as keyof FormData];

    // Para depurar, este log es clave:
    //console.log(`Validando campo: '${fieldName}', Valor:`, value, `(Tipo: ${typeof value})`, '¿Requerido?:', !!fieldConfig.required);

    // 1. Validación de campo requerido (MEJORADA)
    if (fieldConfig.required && isValueEmpty(value)) {
      validationErrors[fieldName] = 'Este campo es requerido';
      return false;
    }
    
    // Si el campo no es requerido y está vacío, no se realizan más validaciones.
    if (!fieldConfig.required && isValueEmpty(value)) {
      // Limpiamos el error si lo hubiera de una validación anterior
      delete validationErrors[fieldName];
      return true;
    }

    // 2. Validación de patrón
    if (fieldConfig.pattern) { // Se valida incluso si el valor es 0 o false
      const regex = new RegExp(fieldConfig.pattern);
      if (!regex.test(String(value))) {
        validationErrors[fieldName] = 'El formato no es válido';
        return false;
      }
    }

    // 3. Validación de rango para números
    if (fieldConfig.type === 'number') { // El value ya no es null/undefined en este punto
      const numValue = Number(value);
      if (isNaN(numValue)) {
          // Opcional: Podrías añadir un error si el valor no es un número válido
          validationErrors[fieldName] = 'Debe ser un número válido';
          return false;
      }
      if (fieldConfig.min !== undefined && numValue < fieldConfig.min) {
        validationErrors[fieldName] = `El valor mínimo es ${fieldConfig.min}`;
        return false;
      }
      if (fieldConfig.max !== undefined && numValue > fieldConfig.max) {
        validationErrors[fieldName] = `El valor máximo es ${fieldConfig.max}`;
        return false;
      }
    }
    
    // Si pasa todas las validaciones, nos aseguramos de que no haya un error antiguo
    delete validationErrors[fieldName];
    return true;
  }

  // Función para validar todo el formulario
  function validateForm(): boolean {
    let formIsValid = true
    
    // Limpiar errores previos
    Object.keys(validationErrors).forEach(key => {
      delete validationErrors[key]
    })
    console.log("formData", formData) // proxy target-handler
    // Validar solo campos visibles
    visibleFields.value.forEach(([fieldName]) => {
      if (!validateField(fieldName)) {
        formIsValid = false
      }
    })
    
    isValid.value = formIsValid
    return formIsValid
  }

  // Función para enviar el formulario
  async function submitForm() {
    if (isSubmitting.value) return
    
    if (!validateForm()) {
      console.warn('Formulario inválido')
      return
    }
    
    isSubmitting.value = true
    
    try {
      if (onSubmit) {
        const plainFormData = toRaw(formData)
        await onSubmit(plainFormData) 
      }
    } catch (error) {
      console.error('Error al enviar formulario:', error)
    } finally {
      isSubmitting.value = false
    }
  }

  // Función para resetear el formulario
  function resetForm() {
    // Resetear datos
    Object.keys(formData).forEach(key => {
      if (key in defaultProductData) {
        const typedKey = key as keyof FormData;
        (formData[typedKey] as any) = (defaultProductData as any)[typedKey];
      }
    })
    
    // Limpiar errores
    Object.keys(validationErrors).forEach(key => {
      delete validationErrors[key]
    })
    
    isValid.value = true
    
    // Resetear web components
    if (formElement.value) {
      const inputs = formElement.value.querySelectorAll('c-input')
      inputs.forEach((input: any) => {
        if (input.reset) {
          input.reset()
        }
      })
    }
    
    if (onReset) {
      onReset()
    }
  }

  // Función para establecer datos del formulario
  function setFormData(data: Partial<FormData>) {
    Object.entries(data).forEach(([key, value]) => {
      if (key in formData) {
        ;(formData as any)[key] = value
      }
    })
    
    // Actualizar web components
    nextTick(() => {
      if (formElement.value) {
        const inputs = formElement.value.querySelectorAll('c-input')
        inputs.forEach((input: any) => {
          const fieldName = input.getAttribute('data-field-name')
          if (fieldName && data[fieldName as keyof FormData] !== undefined) {
            if (input.setVal) {
              input.setVal(data[fieldName as keyof FormData])
            }
          }
        })
      }
    })
  }

  // Event listeners para web components
  function setupEventListeners() {
    if (!formElement.value) return
    
    const handleInputChange = (event: Event) => {
      const target = event.target as any
      if (target.tagName === 'C-INPUT') {
        const fieldName = target.getAttribute('data-field-name')
        if (fieldName) {
          const value = target.getVal ? target.getVal() : target.value
          updateField(fieldName, value)
        }
      }
    }
    
    formElement.value.addEventListener('change', handleInputChange)
    formElement.value.addEventListener('input', handleInputChange)
    
    return () => {
      if (formElement.value) {
        formElement.value.removeEventListener('change', handleInputChange)
        formElement.value.removeEventListener('input', handleInputChange)
      }
    }
  }

  // Lifecycle hooks
  onMounted(() => {
    const cleanup = setupEventListeners()
    onUnmounted(() => {
      if (cleanup) cleanup()
    })
  })

  return {
    // Estado reactivo
    formData,
    validationErrors,
    isSubmitting,
    isValid,
    visibleFields,
    
    // Referencias
    formElement,
    
    // Métodos
    updateField,
    validateField,
    validateForm,
    submitForm,
    resetForm,
    setFormData,
    
    // Utilidades
    parseValueByType,
    evaluateShowCondition
  }
}