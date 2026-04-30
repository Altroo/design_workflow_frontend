import React from 'react';
import * as Select from '@radix-ui/react-select';
import { ChevronDown } from 'lucide-react';
import { DropDownType } from '@/types/accountTypes';
import { useLanguage } from '@/utils/hooks';

type Props = {
	id: string;
	label: string;
	items: Array<DropDownType> | Array<string>;
	theme?: unknown;
	value: string | null;
	size?: 'small' | 'medium';
	onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
	onBlur?: (e: React.FocusEvent<HTMLSelectElement>) => void;
	helperText?: string;
	error?: boolean;
	disabled?: boolean;
	cssClass?: string;
	startIcon?: React.ReactNode;
	endIcon?: React.ReactNode;
	children?: React.ReactNode;
};

const CustomDropDownSelect: React.FC<Props> = (props: Props) => {
	const { t } = useLanguage();
	const value = props.value || undefined;

	const emitChange = (nextValue: string) => {
		const event = {
			target: { id: props.id, name: props.id, value: nextValue },
			currentTarget: { id: props.id, name: props.id, value: nextValue },
		} as React.ChangeEvent<HTMLSelectElement>;
		props.onChange?.(event);
	};

	const options = props.items.map((item, index) => {
		const isObject = typeof item === 'object' && item !== null && 'value' in item;
		const optionValue = String(isObject && 'code' in item ? item.code : item);
		const optionLabel = String(isObject ? item.value : item || t.common.selectValue);
		return { key: `${optionValue}-${index}`, value: optionValue, label: optionLabel };
	});

	return (
		<div className={props.cssClass ?? ''}>
			<label htmlFor={props.id} className="mb-2 block text-sm font-medium leading-5 text-[var(--ink-soft)]">
				{props.label}
			</label>
			<div className="relative">
				{props.startIcon ? (
					<div className="pointer-events-none absolute left-3 top-0 z-10 flex h-full items-center justify-center text-[var(--ink-muted)]">
						{props.startIcon}
					</div>
				) : null}
				<Select.Root value={value} onValueChange={emitChange} disabled={props.disabled}>
					<Select.Trigger
						id={props.id}
						data-testid={`dropdown-${props.id}`}
						aria-label={props.label}
						onBlur={() => props.onBlur?.({ target: { id: props.id, name: props.id, value: props.value ?? '' } } as unknown as React.FocusEvent<HTMLSelectElement>)}
						className={[
							'app-input app-select-trigger w-full text-left',
							props.startIcon ? 'pl-14' : '',
							'pr-14',
							props.error ? 'border-red-300 bg-red-50' : '',
						].join(' ')}
					>
						<Select.Value placeholder={t.common.selectValue} />
						<Select.Icon asChild>{props.endIcon ?? <ChevronDown size={18} />}</Select.Icon>
					</Select.Trigger>
					<Select.Portal>
						<Select.Content className="app-select-content z-[9999]" position="popper" sideOffset={8}>
							<Select.Viewport className="p-1">
								{options.map((option) => (
									<Select.Item key={option.key} value={option.value} className="app-select-item">
										<Select.ItemText>{option.label}</Select.ItemText>
									</Select.Item>
								))}
							</Select.Viewport>
						</Select.Content>
					</Select.Portal>
				</Select.Root>
			</div>
			{props.helperText ? <p className="mt-2 text-sm text-red-600">{props.helperText}</p> : null}
		</div>
	);
};

export default CustomDropDownSelect;
