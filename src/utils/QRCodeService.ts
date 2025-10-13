import QRCode from 'qrcode'
import type { TicketData } from '@/utils/idb/StoreManager.js'

export interface QRCodeGenerationOptions {
  width?: number
  margin?: number
  darkColor?: string
  lightColor?: string
}

export class QRCodeService {
  private static instance: QRCodeService
  private readonly defaultOptions: QRCodeGenerationOptions = {
    width: 256,
    margin: 2,
    darkColor: '#000000',
    lightColor: '#FFFFFF'
  }

  private constructor() {}

  public static getInstance(): QRCodeService {
    if (!QRCodeService.instance) {
      QRCodeService.instance = new QRCodeService()
    }
    return QRCodeService.instance
  }

  /**
   * Generate QR code URL from ticket data
   */
  public async generateTicketQRCode(
    ticketData: Partial<TicketData>,
    options: QRCodeGenerationOptions = {}
  ): Promise<string> {
    try {
      const mergedOptions = { ...this.defaultOptions, ...options }
      const ticketUrl = this.buildTicketURL(ticketData as TicketData)
      
      return await QRCode.toDataURL(ticketUrl, {
        width: mergedOptions.width,
        margin: mergedOptions.margin,
        color: {
          dark: mergedOptions.darkColor!,
          light: mergedOptions.lightColor!
        }
      })
    } catch (error) {
      console.error('Error generating QR code:', error)
      throw new Error('Failed to generate QR code')
    }
  }

  /**
   * Generate QR code URL from ticket info (for URL-based tickets)
   */
  public async generateTicketInfoQRCode(
    ticketInfo: Record<string, any>,
    options: QRCodeGenerationOptions = {}
  ): Promise<string> {
    try {
      /*
        generar FIRMA HASH {ticketInfo}
      */
      const mergedOptions = { ...this.defaultOptions, ...options }
      const ticketUrl = this.buildTicketInfoURL(ticketInfo)
      
      return await QRCode.toDataURL(ticketUrl, {
        width: mergedOptions.width,
        margin: mergedOptions.margin,
        color: {
          dark: mergedOptions.darkColor!,
          light: mergedOptions.lightColor!
        }
      })
    } catch (error) {
      console.error('Error generating QR code:', error)
      throw new Error('Failed to generate QR code')
    }
  }

  /**
   * Build ticket URL from ticket data
   */
  private buildTicketURL(ticketData: TicketData): string {
    const ticketParams = new URLSearchParams()
    
    // Add basic ticket information
    ticketParams.append('ticket', ticketData.ticketID)
    ticketParams.append('total', ticketData.total.toString())
    ticketParams.append('date', ticketData.date)
    ticketParams.append('time', ticketData.time)

    // Add customer information
    if (ticketData.customerData) {
      if (ticketData.customerData.name) {
        ticketParams.append('name', ticketData.customerData.name)
      }
      if (ticketData.customerData.phone) {
        ticketParams.append('phone', ticketData.customerData.phone)
      }
      if (ticketData.customerData.address) {
        ticketParams.append('address', ticketData.customerData.address)
      }
      if (ticketData.customerData.dni) {
        ticketParams.append('dni', ticketData.customerData.dni)
      }
/*       if (ticketData.customerData.email) {
        ticketParams.append('email', ticketData.customerData.email)
      } */
    }

    // Add cart items summary
    if (ticketData.cartItems && ticketData.cartItems.length > 0) {
      const itemCount = ticketData.cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0)
      ticketParams.append('items', itemCount.toString())
    }

    // Add verification hash
    const verificationData = {
      id: ticketData.ticketID,
      total: ticketData.total,
      date: ticketData.date,
      time: ticketData.time
    }
    
    const verificationString = btoa(JSON.stringify(verificationData)).slice(0, 8)
    ticketParams.append('verify', verificationString)

    return `${window.location.origin}?${ticketParams.toString()}`
  }

  /**
   * Build ticket URL from ticket info (for URL-based tickets)
   */
  private buildTicketInfoURL(ticketInfo: Record<string, any>): string {
    const ticketParams = new URLSearchParams()
    
    // Add basic ticket information
    ticketParams.append('ticket', ticketInfo.ticket || ticketInfo.ticketID || '')
    ticketParams.append('total', ticketInfo.total?.toString() || '0')
    ticketParams.append('date', ticketInfo.date || new Date().toLocaleDateString())
    ticketParams.append('time', ticketInfo.time || new Date().toLocaleTimeString())

    // Add customer information
    if (ticketInfo.customerData) {
      if (ticketInfo.customerData.name) {
        ticketParams.append('name', ticketInfo.customerData.name)
      }
      if (ticketInfo.customerData.phone) {
        ticketParams.append('phone', ticketInfo.customerData.phone)
      }
      if (ticketInfo.customerData.address) {
        ticketParams.append('address', ticketInfo.customerData.address)
      }
      if (ticketInfo.customerData.dni) {
        ticketParams.append('dni', ticketInfo.customerData.dni)
      }
      if (ticketInfo.customerData.email) {
        ticketParams.append('email', ticketInfo.customerData.email)
      }
    } else if (ticketInfo.customer) {
      ticketParams.append('name', ticketInfo.customer)
    }

    // Add verification hash
    const verificationData = {
      id: ticketInfo.ticket || ticketInfo.ticketID || 'N/A',
      total: ticketInfo.total || 0,
      date: ticketInfo.date || new Date().toLocaleDateString(),
      time: ticketInfo.time || new Date().toLocaleTimeString()
    }
    
    const verificationString = btoa(JSON.stringify(verificationData)).slice(0, 8)
    ticketParams.append('verify', verificationString)

    return `${window.location.origin}?${ticketParams.toString()}`
  }

  /**
   * Extract ticket data from URL parameters
   */
  public extractTicketFromURL(): Record<string, any> | null {
    const urlParams = new URLSearchParams(window.location.search)
    const ticket = urlParams.get('ticket')
    
    if (!ticket) return null
    
    return {
      ticket: ticket,
      date: urlParams.get('date') || new Date().toLocaleDateString(),
      time: urlParams.get('time') || new Date().toLocaleTimeString(),
      customer: urlParams.get('name') || urlParams.get('customer') || '',
      total: urlParams.get('total') || '0.00',
      customerData: {
        name: urlParams.get('name') || urlParams.get('customer') || '',
        email: urlParams.get('email') || '',
        phone: urlParams.get('phone') || '',
        address: urlParams.get('address') || '',
        dni: urlParams.get('dni') || ''
      }
    }
  }
}

// Export singleton instance
export const qrCodeService = QRCodeService.getInstance()