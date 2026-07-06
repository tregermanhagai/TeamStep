import { Locale } from './i18n'

const TRAINER_NAMES = ['israel goren']

export function trainerLabel(name: string, locale: Locale): string {
  if (TRAINER_NAMES.includes(name.toLowerCase())) {
    return locale === 'he' ? '(מאמן)' : '(trainer)'
  }
  return ''
}
