import { describe, it, expect } from 'vitest';
import i18n from '@/i18n';

describe('i18n', () => {
  it('defaults to Swedish', () => {
    expect(i18n.language).toBe('sv');
    expect(i18n.t('login.title')).toBe('Logga in');
  });

  it('switches to English', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.t('login.title')).toBe('Sign in');
    await i18n.changeLanguage('sv');
  });
});
