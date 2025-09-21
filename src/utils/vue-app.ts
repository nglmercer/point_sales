import type { App } from 'vue'
import i18n from './i18n.js'

export default function (app: App) {
  app.use(i18n)
}