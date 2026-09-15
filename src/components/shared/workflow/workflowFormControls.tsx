'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import * as Select from '@radix-ui/react-select';
import { format, isValid, parseISO } from 'date-fns';
import { CalendarDays, ChevronDown, X } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';

const EMPTY_SELECT_VALUE = '__empty__';
const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

type WorkflowSelectFieldProps = {
	id?: string;
	value: string;
	onChange: (value: string) => void;
	options: Array<{ value: string | number; label: string }>;
	startIcon?: ReactNode;
	placeholder?: string;
	ariaLabel?: string;
	className?: string;
	disabled?: boolean;
};

export const WorkflowSelectField = ({
	id,
	value,
	onChange,
	options,
	startIcon,
	placeholder,
	ariaLabel,
	className,
	disabled = false,
}: WorkflowSelectFieldProps) => {
	const hasMatchingOption = value !== '' && options.some((option) => String(option.value) === String(value));
	const normalizedValue = value === '' || !hasMatchingOption ? EMPTY_SELECT_VALUE : String(value);

	return (
		<Select.Root disabled={disabled} value={normalizedValue} onValueChange={(nextValue) => onChange(nextValue === EMPTY_SELECT_VALUE ? '' : nextValue)}>
			<Select.Trigger
				id={id}
				aria-label={ariaLabel}
				disabled={disabled}
				className={cx('app-input app-select-trigger pr-14 text-left', startIcon ? 'pl-14' : '', className)}
			>
				{startIcon ? (
					<span className="pointer-events-none absolute left-3 top-0 z-10 flex h-full items-center justify-center text-(--ink-soft)">
						{startIcon}
					</span>
				) : null}
				<Select.Value placeholder={placeholder} />
				<Select.Icon asChild>
					<ChevronDown size={18} />
				</Select.Icon>
			</Select.Trigger>
			<Select.Portal>
				<Select.Content className="app-select-content z-[9999]" position="popper" sideOffset={8}>
					<Select.Viewport className="app-select-viewport p-1">
						{options.map((option) => {
							const optionValue = option.value === '' ? EMPTY_SELECT_VALUE : String(option.value);
							return (
								<Select.Item key={optionValue} value={optionValue} className="app-select-item">
									<Select.ItemText>{option.label}</Select.ItemText>
								</Select.Item>
							);
						})}
					</Select.Viewport>
				</Select.Content>
			</Select.Portal>
		</Select.Root>
	);
};

type WorkflowDateFieldProps = {
	id?: string;
	value?: string | null;
	onChange: (value: string) => void;
	placeholder?: string;
	ariaLabel?: string;
	clearLabel?: string;
	wrapperClassName?: string;
	triggerClassName?: string;
};

export const WorkflowDateField = ({
	id,
	value,
	onChange,
	placeholder = 'YYYY-MM-DD',
	ariaLabel,
	clearLabel = 'Clear date',
	wrapperClassName,
	triggerClassName,
}: WorkflowDateFieldProps) => {
	const parsed = value ? parseISO(value) : null;
	const selectedDate = parsed && isValid(parsed) ? parsed : null;
	const [open, setOpen] = useState(false);

	return (
		<Popover.Root open={open} onOpenChange={setOpen}>
			<div className={cx('relative', wrapperClassName)}>
				<span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-(--ink-soft)">
					<CalendarDays size={18} />
				</span>
				<Popover.Trigger
					id={id}
					aria-label={ariaLabel}
					className={cx('app-input app-date-trigger pl-14 pr-14 text-left', !value && 'text-(--ink-muted)', triggerClassName)}
				>
					{value || placeholder}
				</Popover.Trigger>
				{value ? (
					<button
						type="button"
						aria-label={clearLabel}
						className="absolute right-4 top-1/2 z-10 -translate-y-1/2 text-(--ink-soft)"
						onClick={() => onChange('')}
					>
						<X size={16} />
					</button>
				) : null}
			</div>
			<Popover.Portal>
				<Popover.Content className="app-day-picker-popover" sideOffset={8} align="start">
					<DayPicker
						mode="single"
						selected={selectedDate ?? undefined}
						onSelect={(date) => {
							onChange(date ? format(date, 'yyyy-MM-dd') : '');
							if (date) setOpen(false);
						}}
						captionLayout="label"
						navLayout="around"
						className="app-day-picker"
					/>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
};
