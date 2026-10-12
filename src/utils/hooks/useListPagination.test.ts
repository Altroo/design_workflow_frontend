// Model Next's canonical query independently from the browser history commit.
let mockCanonicalSearch: string | null = null;
jest.mock('next/navigation', () => ({
	useSearchParams: () => {
		const React = jest.requireActual<typeof import('react')>('react');
		const search = React.useSyncExternalStore(
			(listener) => {
				window.addEventListener('popstate', listener);
				window.addEventListener('test-next-query', listener);
				return () => {
					window.removeEventListener('popstate', listener);
					window.removeEventListener('test-next-query', listener);
				};
			},
			() => mockCanonicalSearch ?? window.location.search,
			() => '',
		);
		return new URLSearchParams(search);
	},
}));
const replaceState = window.history.replaceState.bind(window.history);
beforeAll(() => jest.spyOn(window.history, 'replaceState').mockImplementation((...args) => {
	replaceState(...args);
	window.dispatchEvent(new Event('test-next-query'));
}));
afterAll(() => jest.restoreAllMocks());
afterEach(() => { mockCanonicalSearch = null; });

import { act, renderHook } from '@testing-library/react';
import { listReturnUrl } from '@/utils/listReturn';
import { parseListPagination, useListPagination } from './useListPagination';
it('updates and restores URL pagination on a users list round trip', () => {
	window.sessionStorage.clear();
	window.history.replaceState({}, '', '/dashboard/users');
	const { result, unmount } = renderHook(() => useListPagination());
	act(() => result.current[1]({ page: 2, pageSize: 10 }));
	expect(window.location.search).toBe('?page=3&page_size=10');
	unmount();
	window.history.replaceState({}, '', '/dashboard/users/42');
	const target = listReturnUrl('/dashboard/users');
	window.history.replaceState({}, '', target);
	expect(renderHook(() => useListPagination()).result.current[0]).toEqual({ page: 2, pageSize: 10 });
});
it('handles reload/history and invalid pagination safely', () => {
	expect(parseListPagination('?page=0&page_size=99')).toEqual({ page: 0, pageSize: 10 });
	window.history.replaceState({}, '', '/dashboard/users?page=3&page_size=25');
	const { result } = renderHook(() => useListPagination());
	act(() => { window.history.replaceState({}, '', '/dashboard/users?page=2'); window.dispatchEvent(new PopStateEvent('popstate')); });
	expect(result.current[0]).toEqual({ page: 1, pageSize: 10 });
});

it('reads canonical pagination before the browser history commit', () => {
 window.history.replaceState({}, '', '/dashboard/users/42');
 mockCanonicalSearch = '?page=3&page_size=25';
 expect(renderHook(() => useListPagination()).result.current[0]).toEqual({page: 2, pageSize: 25});
});
