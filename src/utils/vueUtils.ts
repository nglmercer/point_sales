// src/utils/vueUtils.ts
import { toRaw, isRef, isReactive, isProxy } from 'vue'

/**
 * Tipos de utilidades
 */
export type SerializableValue = string | number | boolean | null | undefined | Date | SerializableObject | SerializableArray
export interface SerializableObject { [key: string]: SerializableValue }
export interface SerializableArray extends Array<SerializableValue> {}

/**
 * Opciones para la serialización
 */
export interface SerializeOptions {
  removeVueInternals?: boolean // Remover propiedades internas de Vue (__v_*, $*)
  preserveDates?: boolean      // Preservar objetos Date
  maxDepth?: number           // Profundidad máxima para evitar referencias circulares
  customSerializer?: (key: string, value: any) => any // Función personalizada de serialización
}

/**
 * Detecta si un objeto es un Proxy de Vue (reactivo, ref, etc.)
 */
export function isVueProxy(obj: any): boolean {
  return isProxy(obj) || isReactive(obj) || isRef(obj)
}

/**
 * Convierte recursivamente objetos reactivos de Vue a objetos planos serializables
 * Esta es la función principal que debes usar
 */
export function toSerializable<T>(obj: T, options: SerializeOptions = {}): T {
  const {
    removeVueInternals = true,
    preserveDates = true,
    maxDepth = 50,
    customSerializer
  } = options

  function serialize(value: any, depth = 0): any {
    // Evitar recursión infinita
    if (depth > maxDepth) {
      console.warn('Max depth reached in toSerializable, returning null')
      return null
    }

    // Manejar valores null/undefined
    if (value === null || value === undefined) {
      return value
    }

    // Manejar primitivos
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value
    }

    // Preservar fechas si está habilitado
    if (preserveDates && value instanceof Date) {
      return new Date(value.getTime())
    }

    // Aplicar serializer personalizado si existe
    if (customSerializer) {
      const customResult = customSerializer('', value)
      if (customResult !== undefined) {
        return customResult
      }
    }

    // Extraer valor raw si es un proxy de Vue
    const rawValue = isVueProxy(value) ? toRaw(value) : value

    // Manejar arrays
    if (Array.isArray(rawValue)) {
      return rawValue.map((item, index) => {
        if (customSerializer) {
          const customResult = customSerializer(index.toString(), item)
          if (customResult !== undefined) return customResult
        }
        return serialize(item, depth + 1)
      })
    }

    // Manejar objetos
    if (typeof rawValue === 'object') {
      const result: any = {}
      
      for (const key in rawValue) {
        // Saltar propiedades no enumerables
        if (!rawValue.hasOwnProperty(key)) continue
        
        // Remover propiedades internas de Vue si está habilitado
        if (removeVueInternals && (key.startsWith('__v_') || key.startsWith('$'))) {
          continue
        }

        const propertyValue = rawValue[key]
        
        // Aplicar serializer personalizado si existe
        if (customSerializer) {
          const customResult = customSerializer(key, propertyValue)
          if (customResult !== undefined) {
            result[key] = customResult
            continue
          }
        }

        result[key] = serialize(propertyValue, depth + 1)
      }
      
      return result
    }

    // Para cualquier otro tipo, devolver el valor raw
    return rawValue
  }

  return serialize(obj)
}

/**
 * Función más simple para casos comunes
 * Equivalente a toSerializable con opciones por defecto
 */
export function cleanReactiveObject<T>(obj: T): T {
  return toSerializable(obj)
}

/**
 * Función específica para preparar datos para IndexedDB
 */
export function prepareForIndexedDB<T>(obj: T): T {
  return toSerializable(obj, {
    removeVueInternals: true,
    preserveDates: true,
    maxDepth: 20
  })
}

/**
 * Función para crear una copia profunda sin reactividad
 */
export function deepCloneNonReactive<T>(obj: T): T {
  return toSerializable(obj, {
    removeVueInternals: true,
    preserveDates: true,
    maxDepth: 30
  })
}

/**
 * Función para serializar específicamente datos de tickets
 */
export function serializeTicketData(ticketData: any): any {
  return toSerializable(ticketData, {
    removeVueInternals: true,
    preserveDates: true,
    maxDepth: 10,
    customSerializer: (key: string, value: any) => {
      return undefined // Usar serialización por defecto
    }
  })
}

/**
 * Función helper para debugging - muestra qué objetos son reactivos
 */
export function debugReactivity(obj: any, path = ''): void {
  if (!obj || typeof obj !== 'object') return

  console.log(`${path}: isProxy=${isProxy(obj)}, isReactive=${isReactive(obj)}, isRef=${isRef(obj)}`)

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      debugReactivity(item, `${path}[${index}]`)
    })
  } else {
    Object.keys(obj).forEach(key => {
      if (obj.hasOwnProperty(key)) {
        debugReactivity(obj[key], path ? `${path}.${key}` : key)
      }
    })
  }
}

/**
 * Hook personalizado para usar en componentes Vue
 */
export function useSerializable() {
  const serialize = <T>(obj: T, options?: SerializeOptions): T => {
    return toSerializable(obj, options)
  }

  const prepareForDB = <T>(obj: T): T => {
    return prepareForIndexedDB(obj)
  }

  const cleanObject = <T>(obj: T): T => {
    return cleanReactiveObject(obj)
  }

  return {
    serialize,
    prepareForDB,
    cleanObject,
    debugReactivity
  }
}

// Exportar todo como default también
export default {
  toSerializable,
  cleanReactiveObject,
  prepareForIndexedDB,
  deepCloneNonReactive,
  serializeTicketData,
  debugReactivity,
  useSerializable,
  isVueProxy
}