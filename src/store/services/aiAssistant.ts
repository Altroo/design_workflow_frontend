import { createApi } from '@reduxjs/toolkit/query/react';
import { isAuthenticatedInstance } from '@/utils/helpers';
import { axiosBaseQuery } from '@/utils/axiosBaseQuery';
import { getInitStateToken } from '@/store/selectors';
import { initToken } from '@/store/slices/_initSlice';
import type { RootState } from '@/store/store';
import type { AiAssistRequest, AiAssistResponse } from '@/types/aiTypes';

export const aiAssistantApi = createApi({
	reducerPath: 'aiAssistantApi',
	baseQuery: axiosBaseQuery((api) =>
		isAuthenticatedInstance(
			() => getInitStateToken(api.getState() as RootState),
			() => api.dispatch(initToken()),
		),
	),
	endpoints: (builder) => ({
		assistText: builder.mutation<AiAssistResponse, AiAssistRequest>({
			query: (data) => ({ url: `${process.env.NEXT_PUBLIC_API_URL}/api/ai/assist/`, method: 'POST', data }),
		}),
	}),
});

export const { useAssistTextMutation } = aiAssistantApi;
