import en from '@/locales/en.json';
import ja from '@/locales/ja.json';
import es from '@/locales/es.json';
import zhCN from '@/locales/zh-CN.json';

export type Language = 'en' | 'ja' | 'es' | 'zh-CN' | string;

export const translations: Record<string, Record<string, string>> = {
  en,
  ja,
  es,
  'zh-CN': zhCN,
};

export const getTranslation = (lang: string, key: string): string => {
  return translations[lang]?.[key] || translations['en']?.[key] || key;
};

/**
 * Shorthand for getTranslation.
 * Similar to VS Code's nls.localize or i18next's t function.
 */
export const t = (key: string, lang: string = 'en'): string => {
  return getTranslation(lang, key);
};
