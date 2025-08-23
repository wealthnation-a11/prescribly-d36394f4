import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import en from './locales/en/translation.json';
import es from './locales/es/translation.json';
import fr from './locales/fr/translation.json';
import ar from './locales/ar/translation.json';
import hi from './locales/hi/translation.json';
import zh from './locales/zh/translation.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  ar: { translation: ar },
  hi: { translation: hi },
  zh: { translation: zh }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,
    
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    },

    interpolation: {
      escapeValue: false
    }
  });

// Handle RTL languages
i18n.on('languageChanged', (lng) => {
  const rtlLanguages = ['ar'];
  const direction = rtlLanguages.includes(lng) ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', direction);
  document.documentElement.setAttribute('lang', lng);
});

export default i18n;