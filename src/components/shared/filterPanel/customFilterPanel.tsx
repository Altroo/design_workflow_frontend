'use client';

import React from 'react';

export interface DateRangeFilterValue {
	from?: string;
	to?: string;
}

export type CustomFilterValue = string | DateRangeFilterValue;

export interface CustomFilterItem {
	id: string;
	field: string;
	operator: string;
	value: CustomFilterValue;
}

export interface CustomFilterModel {
	items: CustomFilterItem[];
	logicOperator: 'and' | 'or';
}

interface CustomFilterPanelProps {
	filterModel: CustomFilterModel;
	onChange: (model: CustomFilterModel) => void;
}

export function filterHasValue(item: CustomFilterItem): boolean {
	if (typeof item.value === 'string') {
		return item.value.trim() !== '';
	}
	return Boolean(item.value.from || item.value.to);
}

const CustomFilterPanel: React.FC<CustomFilterPanelProps> = ({ filterModel, onChange }) => {
	return (
		<div className="ui-filter-panel app-card border border-[color:var(--line)] bg-white p-4">
			<div className="flex items-center justify-between gap-3">
				<p className="text-sm font-medium text-[var(--ink)]">Filters</p>
				<button
					type="button"
					className="app-pill ui-button-ghost border border-[color:var(--line)] px-3 py-2 text-sm"
					onClick={() => onChange({ ...filterModel, items: [] })}
				>
					Clear
				</button>
			</div>
		</div>
	);
};

export default CustomFilterPanel;
