import React from 'react';
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

	return (
		<div className={props.cssClass ?? ''}>
			<label htmlFor={props.id} className="mb-2 block text-sm font-medium text-[var(--ink)]">
				{props.label}
			</label>
			<div className="relative">
				{props.startIcon ? (
					<div className="pointer-events-none absolute left-5 top-1/2 z-10 -translate-y-1/2 text-[var(--ink-soft)]">
						{props.startIcon}
					</div>
				) : null}
				<select
					id={props.id}
					value={props.value ?? ''}
					onChange={props.onChange}
					onBlur={props.onBlur}
					disabled={props.disabled}
					className={['app-input w-full appearance-none', props.startIcon ? 'pl-14' : '', 'pr-14', props.error ? 'border-red-600' : ''].join(' ')}
				>
					<option value="">{t.common.selectValue}</option>
					{props.items.map((item, index) => {
						const isObject = typeof item === 'object' && item !== null && 'value' in item;
						const value = isObject && 'code' in item ? item.code : item;
						const label = isObject ? item.value : item;
						return (
							<option key={`${String(value)}-${index}`} value={value ?? ''}>
								{label || t.common.selectValue}
							</option>
						);
					})}
				</select>
				<div className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]">
					{props.endIcon ?? <ChevronDown size={18} />}
				</div>
			</div>
			{props.helperText ? <p className="mt-2 text-sm text-red-600">{props.helperText}</p> : null}
		</div>
	);
};

export default CustomDropDownSelect;
