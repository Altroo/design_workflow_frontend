'use client';

import React from 'react';

export type GridColDef = {
	field: string;
	headerName?: string;
	renderCell?: (params: { row: Record<string, unknown>; value: unknown }) => React.ReactNode;
};

export type GridLogicOperator = 'and' | 'or';

export type GridFilterModel = {
	items: Array<Record<string, unknown>>;
	logicOperator?: GridLogicOperator;
};

export type GridRowParams = {
	row: Record<string, unknown>;
};

type PaginatedDataGridProps<T> = {
	data?: { count: number; results: T[] };
	isLoading?: boolean;
	columns: GridColDef[];
	paginationModel: { page: number; pageSize: number };
	setPaginationModel: React.Dispatch<React.SetStateAction<{ page: number; pageSize: number }>>;
	searchTerm: string;
	setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
	onSelectionChange?: (ids: number[]) => void;
	selectedIds?: number[];
	onRowClick?: (params: GridRowParams) => void;
};

export function isDateRangeValue(value: unknown): value is { from?: string; to?: string } {
	return typeof value === 'object' && value !== null && 'from' in value;
}

export function mapOperatorToParam(field: string, operator: string, value: unknown): Record<string, string> {
	return { [`${field}__${operator}`]: String(value) };
}

const PaginatedDataGrid = <T extends { id?: number | string },>({
	data,
	isLoading,
	columns,
	paginationModel,
	setPaginationModel,
	searchTerm,
	setSearchTerm,
	onSelectionChange,
	selectedIds = [],
	onRowClick,
}: PaginatedDataGridProps<T>) => {
	const rows = data?.results ?? [];
	const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / paginationModel.pageSize));

	if (isLoading) {
		return <div className="workflow-data-grid app-card p-6 text-sm text-[var(--ink-soft)]">Loading...</div>;
	}

	return (
		<div className="workflow-data-grid app-card overflow-hidden border border-[color:var(--line)] bg-white">
			<div className="flex flex-col gap-3 border-b border-[color:var(--line)] p-4 sm:flex-row sm:items-center sm:justify-between">
				<input
					value={searchTerm}
					onChange={(event) => setSearchTerm(event.target.value)}
					placeholder="Search"
					className="app-input w-full max-w-sm"
				/>
				<div className="flex items-center gap-2">
					<button
						type="button"
						className="app-button app-button-secondary min-h-10 px-3 py-2 text-sm"
						onClick={() => setPaginationModel((prev) => ({ ...prev, page: Math.max(0, prev.page - 1) }))}
						disabled={paginationModel.page <= 0}
					>
						Prev
					</button>
					<span className="text-sm text-[var(--ink-soft)]">
						{paginationModel.page + 1} / {totalPages}
					</span>
					<button
						type="button"
						className="app-button app-button-secondary min-h-10 px-3 py-2 text-sm"
						onClick={() => setPaginationModel((prev) => ({ ...prev, page: Math.min(totalPages - 1, prev.page + 1) }))}
						disabled={paginationModel.page >= totalPages - 1}
					>
						Next
					</button>
				</div>
			</div>
			<div className="overflow-x-auto">
				<table className="min-w-full text-left text-sm">
					<thead className="bg-[var(--surface-muted)] text-[var(--ink-soft)]">
						<tr>
							{onSelectionChange ? <th className="px-4 py-3">#</th> : null}
							{columns.map((column) => (
								<th key={column.field} className="px-4 py-3 font-medium">
									{column.headerName ?? column.field}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{rows.map((row, index) => {
							const rowId = Number(row.id ?? index);
							const checked = selectedIds.includes(rowId);
							return (
								<tr
									key={String(row.id ?? index)}
									className="border-t border-[color:var(--line)] hover:bg-[var(--surface-muted)]"
									onClick={() => onRowClick?.({ row: row as Record<string, unknown> })}
								>
									{onSelectionChange ? (
										<td className="px-4 py-3">
											<input
												type="checkbox"
												checked={checked}
												className="app-check"
												onChange={(event) => {
													event.stopPropagation();
													onSelectionChange(
														event.target.checked
															? [...selectedIds, rowId]
															: selectedIds.filter((id) => id !== rowId),
													);
												}}
											/>
										</td>
									) : null}
									{columns.map((column) => (
										<td key={column.field} className="px-4 py-3">
											{column.renderCell
												? column.renderCell({
														row: row as Record<string, unknown>,
														value: (row as Record<string, unknown>)[column.field],
													})
												: String((row as Record<string, unknown>)[column.field] ?? '-')}
										</td>
									))}
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
};

export default PaginatedDataGrid;
