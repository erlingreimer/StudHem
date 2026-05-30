import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import sv from './locales/sv.json';
import en from './locales/en.json';
import { STORAGE_PREFIX } from '@/config/constants';

const LANG_KEY = `${STORAGE_PREFIX}lang`;
const stored = localStorage.getItem(LANG_KEY);
const initialLang = stored === 'en' ? 'en' : 'sv';

void i18n.use(initReactI18next).init({
  resources: { sv: { translation: sv }, en: { translation: en } },
  lng: initialLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  // Disable single-underscore plural detection so keys like "in_progress" resolve as literals.
  pluralSeparator: '|',
});

i18n.on('languageChanged', (lng) => localStorage.setItem(LANG_KEY, lng));

export default i18n;
