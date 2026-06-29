import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Locale, TranslationKey, translations } from '../lib/i18n'

interface LocaleContextType {
  locale: Locale
  t: (key: TranslationKey) => string
  setLocale: (locale: Locale) => void
}

const LocaleContext = createContext<LocaleContextType>({
  locale: 'en',
  t: (key) => key,
  setLocale: () => {},
})

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem('ts_locale') as Locale | null
    return saved ?? (import.meta.env.VITE_DEFAULT_LOCALE as Locale) ?? 'en'
  })

  useEffect(() => {
    document.documentElement.dir  = locale === 'he' ? 'rtl' : 'ltr'
    document.documentElement.lang = locale
  }, [locale])

  function setLocale(l: Locale) {
    setLocaleState(l)
    localStorage.setItem('ts_locale', l)
  }

  function t(key: TranslationKey): string {
    return translations[locale][key] ?? translations.en[key] ?? key
  }

  return (
    <LocaleContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  return useContext(LocaleContext)
}
