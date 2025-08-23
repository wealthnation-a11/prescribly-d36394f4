import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';

export const useLanguage = () => {
  const { i18n, t } = useTranslation();

  const changeLanguage = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
  };

  const currentLanguage = i18n.language;

  // Handle RTL languages
  useEffect(() => {
    const rtlLanguages = ['ar'];
    const direction = rtlLanguages.includes(currentLanguage) ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', direction);
    document.documentElement.setAttribute('lang', currentLanguage);
  }, [currentLanguage]);

  return {
    t,
    changeLanguage,
    currentLanguage,
    isRTL: ['ar'].includes(currentLanguage)
  };
};