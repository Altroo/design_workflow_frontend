import React from 'react';

export interface DropdownFilterOption {
	value: string;
	label: string;
	color?: 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
}

type GridFilterItem = {
	value?: string;
};

type GridFilterOperator = {
	label: string;
	value: string;
	getApplyFilterFn: (filterItem: GridFilterItem) => ((value: unknown) => boolean) | null;
	InputComponent?: React.ComponentType<unknown>;
};

interface DropdownFilterProps {
	item: GridFilterItem;
	applyValue: (item: GridFilterItem) => void;
	options: DropdownFilterOption[];
	placeholder?: string;
	showChips?: boolean;
}

const DropdownFilter: React.FC<DropdownFilterProps> = (props) => {
	const { item, applyValue, options, placeholder } = props;

	const handleFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
		applyValue({ ...item, value: event.target.value });
	};

	return (
		<select value={item.value || ''} onChange={handleFilterChange} className="app-input min-w-[180px]">
			<option value="">{placeholder ?? 'All'}</option>
			{options.map((option) => (
				<option key={option.value} value={option.value}>
					{option.label}
				</option>
			))}
		</select>
	);
};

export const createDropdownFilterOperators = (
	options: DropdownFilterOption[],
	placeholder?: string,
	_showChips?: boolean,
	filterLabel?: string,
): GridFilterOperator[] => [
	{
		label: filterLabel ?? 'est',
		value: 'is',
		getApplyFilterFn: (filterItem: GridFilterItem) => {
			if (!filterItem.value) {
				return null;
			}
			return (value: unknown): boolean => {
				return value === filterItem.value;
			};
		},
		InputComponent: (props: unknown) => (
			<DropdownFilter {...(props as DropdownFilterProps)} options={options} placeholder={placeholder} />
		),
	},
];

export const createBooleanFilterOperators = (
	options: DropdownFilterOption[],
	placeholder?: string,
	filterLabel?: string,
): GridFilterOperator[] => [
	{
		label: filterLabel ?? 'est',
		value: 'is',
		getApplyFilterFn: (filterItem: GridFilterItem) => {
			if (!filterItem.value) {
				return null;
			}
			// Convert string 'true'/'false' back to boolean for comparison
			const boolValue = filterItem.value === 'true';
			return (value: unknown): boolean => {
				return Boolean(value) === boolValue;
			};
		},
		InputComponent: (props: unknown) => (
			<DropdownFilter {...(props as DropdownFilterProps)} options={options} placeholder={placeholder} />
		),
	},
];

export default DropdownFilter;
