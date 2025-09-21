import { createI18n } from 'vue-i18n'
import en from '../locales/en.json'
import es from '../locales/es.json'

// Get the user's preferred language from localStorage or default to Spanish
const getDefaultLocale = () => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return 'es' // Default to Spanish on server-side
  }
  
  const saved = localStorage.getItem('preferred-language')
  if (saved) return saved
  
  // Check browser language
  const browserLang = navigator.language.split('-')[0]
  return ['es', 'en'].includes(browserLang) ? browserLang : 'es'
}

const i18n = createI18n({
  legacy: false, // Use Composition API mode
  locale: getDefaultLocale(),
  fallbackLocale: 'en',
  messages: {
    en,
    es
  }
})

export default i18n

// Helper function to change language
export const changeLanguage = (locale: string) => {
  i18n.global.locale.value = locale as ('es' | 'en')
  
  // Only access localStorage in browser environment
  if (typeof window !== 'undefined') {
    localStorage.setItem('preferred-language', locale)
  }
}

// Helper function to get current language
export const getCurrentLanguage = () => {
  return i18n.global.locale.value
}