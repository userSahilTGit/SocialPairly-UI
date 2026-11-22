import { CUSTOMER_CARE_EMAIL } from './oauth'

/**
 * Public support channels shown on the floating contact widget and Customer Care page.
 * Phone is Indian (+91). WhatsApp / tel links use E.164 digits only.
 */
export const SUPPORT_PHONE_DISPLAY = '6282 902 802'
export const SUPPORT_PHONE_E164 = '916282902802'
export const SUPPORT_PHONE_TEL = `tel:+${SUPPORT_PHONE_E164}`
export const SUPPORT_WHATSAPP_URL = `https://wa.me/${SUPPORT_PHONE_E164}`

export const DEFAULT_SUPPORT_EMAIL = CUSTOMER_CARE_EMAIL
export const PREMIUM_SUPPORT_EMAIL = 'salmaan.razzak@socialpairly.com'
export const SUPPORT_EMAIL = PREMIUM_SUPPORT_EMAIL
export const SUPPORT_EMAIL_MAILTO = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('SocialPairly Support')}`

export function getSupportEmailForMember(isPremium) {
  return isPremium ? PREMIUM_SUPPORT_EMAIL : DEFAULT_SUPPORT_EMAIL
}
