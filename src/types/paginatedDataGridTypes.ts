import type { Dispatch, ReactNode, SetStateAction } from 'react';

export type GridColDef = {
	field: string;
	headerName?: string;
	renderCell?: (params: { row: Record<string, unknown>; value: unknown }) => ReactNode;
};

export type GridRowParams = {
	row: Record<string, unknown>;
};

export type GridPaginationModel = { page: number; pageSize: number };

export type PaginatedDataGridProps<T> = {
	data?: { count: number; results: T[] };
	isLoading?: boolean;
	columns: GridColDef[];
	paginationModel: GridPaginationModel;
	setPaginationModel: Dispatch<SetStateAction<GridPaginationModel>>;
	searchTerm: string;
	setSearchTerm: Dispatch<SetStateAction<string>>;
	onSelectionChange?: (ids: number[]) => void;
	selectedIds?: number[];
	onRowClick?: (params: GridRowParams) => void;
};
