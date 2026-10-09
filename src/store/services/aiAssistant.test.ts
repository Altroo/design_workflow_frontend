import { aiAssistantApi } from './aiAssistant';
import { setupApiStore } from '@/store/setupApiStore';

const mockQuery = jest.fn(async () => ({ data: { original_text: 'Texte', suggested_text: 'Text' } }));
jest.mock('@/utils/axiosBaseQuery', () => ({
	axiosBaseQuery:
		() =>
		(...args: unknown[]) =>
			mockQuery(...(args as [])),
}));

const storeRef = setupApiStore(aiAssistantApi);

it('uses the application backend preview endpoint, never a direct model or save endpoint', async () => {
	const data = {
		action: 'translate' as const,
		text: 'Texte',
		source_language: 'auto' as const,
		target_language: 'en' as const,
		context: 'comment' as const,
	};
	const result = await storeRef.store.dispatch(aiAssistantApi.endpoints.assistText.initiate(data));
	expect(mockQuery).toHaveBeenCalledWith(
		expect.objectContaining({ url: `${process.env.NEXT_PUBLIC_API_URL}/api/ai/assist/`, method: 'POST', data }),
		expect.anything(),
		undefined,
	);
	expect(result).toMatchObject({ data: { original_text: 'Texte', suggested_text: 'Text' } });
});
