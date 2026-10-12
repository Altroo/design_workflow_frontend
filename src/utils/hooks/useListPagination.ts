'use client';
import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { useSearchParams } from 'next/navigation';
import { rememberListPagination } from '@/utils/listReturn';

type Pagination = { page: number; pageSize: number };
const sizes = new Set([5, 10, 25, 50, 100]);
export function parseListPagination(search: string): Pagination {
	const params = new URLSearchParams(search);
	const page = Number(params.get('page'));
	const size = Number(params.get('page_size'));
	return { page: Number.isSafeInteger(page) && page > 0 ? page - 1 : 0, pageSize: sizes.has(size) ? size : 10 };
}
export function useListPagination(): [Pagination, Dispatch<SetStateAction<Pagination>>] {
	const search = useSearchParams()?.toString() ?? '';
	useEffect(() => { rememberListPagination(window.location.href); }, [search]);
	const setPagination: Dispatch<SetStateAction<Pagination>> = update => {
		const next = typeof update === 'function' ? update(parseListPagination(window.location.search)) : update;
		const url = new URL(window.location.href);
		url.searchParams.set('page', String(next.page + 1));
		url.searchParams.set('page_size', String(next.pageSize));
		window.history.replaceState(null, '', url);
	};
	return [parseListPagination(search), setPagination];
}
