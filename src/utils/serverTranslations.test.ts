import { getServerTranslations } from './serverTranslations';
import { translations } from '@/translations';

const mockGet = jest.fn();
jest.mock('next/headers', () => ({ cookies: async () => ({ get: mockGet }) }));

it.each(['fr', 'en', 'invalid', undefined])('resolves the language cookie %s with a French fallback', async (value) => {
	mockGet.mockReturnValue(value ? { value } : undefined);
	expect(await getServerTranslations()).toBe(translations[value === 'en' ? 'en' : 'fr']);
	expect(mockGet).toHaveBeenCalledWith('app-language');
});
