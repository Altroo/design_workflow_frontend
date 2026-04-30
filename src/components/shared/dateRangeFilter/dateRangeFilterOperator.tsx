import React, { useState } from 'react';
import { formatLocalDate } from '@/utils/helpers';
import { useLanguage } from '@/utils/hooks';

interface DateRangeValue {
	from?: string;
	to?: string;
}

type GridFilterItem = {
	value?: DateRangeValue;
};

type GridFilterInputValueProps = {
	item: GridFilterItem;
	applyValue: (item: GridFilterItem) => void;
};

type GridFilterOperator = {
	label: string;
	value: string;
	getApplyFilterFn: () => null;
	InputComponent: React.ComponentType<GridFilterInputValueProps>;
};

const DateRangeFilterInput: React.FC<GridFilterInputValueProps> = (props) => {
	const { item, applyValue } = props;
	const { t } = useLanguage();
	const value = item.value || {};

	const [fromDate, setFromDate] = useState<Date | null>(value.from ? new Date(value.from) : null);
	const [toDate, setToDate] = useState<Date | null>(value.to ? new Date(value.to) : new Date());

	const handleFromChange = (date: Date | null) => {
		setFromDate(date);
		let effectiveToDate = toDate;
		
		// If new from date is after to date, adjust to date
		if (date && toDate && date > toDate) {
			effectiveToDate = date;
			setToDate(date);
		}
		
		const newValue: DateRangeValue = {
			from: date ? formatLocalDate(date) : undefined,
			to: effectiveToDate ? formatLocalDate(effectiveToDate) : formatLocalDate(new Date()),
		};
		applyValue({ ...item, value: newValue });
	};

	const handleToChange = (date: Date | null) => {
		// Only allow to date >= from date
		if (date && fromDate && date < fromDate) {
			return; // Don't allow invalid selection
		}
		setToDate(date);
		const newValue: DateRangeValue = {
			from: fromDate ? formatLocalDate(fromDate) : undefined,
			to: date ? formatLocalDate(date) : undefined,
		};
		applyValue({ ...item, value: newValue });
	};

	return (
		<div className="flex items-center gap-2 pr-1">
			<label className="flex flex-col gap-1 text-xs font-medium text-(--ink-soft)">
				<span>{t.filters.from}</span>
				<input
					type="date"
					value={fromDate ? formatLocalDate(fromDate) : ''}
					onChange={(event) => handleFromChange(event.target.value ? new Date(event.target.value) : null)}
					className="app-input min-w-[180px]"
				/>
			</label>
			<label className="flex flex-col gap-1 text-xs font-medium text-(--ink-soft)">
				<span>{t.filters.to}</span>
				<input
					type="date"
					value={toDate ? formatLocalDate(toDate) : ''}
					onChange={(event) => handleToChange(event.target.value ? new Date(event.target.value) : null)}
					className="app-input min-w-[180px]"
				/>
			</label>
		</div>
	);
};

export const createDateRangeFilterOperator = (filterLabel?: string): GridFilterOperator[] => [
	{
		label: filterLabel ?? 'entre',
		value: 'between',
		getApplyFilterFn: () => {
			// Return null to indicate server-side filtering
			// The actual filtering is done by the backend using date_after/date_before params
			return null;
		},
		InputComponent: DateRangeFilterInput,
	},
];
