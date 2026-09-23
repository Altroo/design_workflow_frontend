import {type ChangeEvent, type FocusEvent, type HTMLInputTypeAttribute, type InputHTMLAttributes, type ReactNode, type Ref} from 'react';

type Props = {
	type: HTMLInputTypeAttribute;
	id: string;
	value: string;
	onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
	theme?: unknown;
	onBlur?: (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
	cssClass?: string;
	helperText?: string;
	error?: boolean;
	placeholder?: string;
	label?: string;
	fullWidth?: boolean;
	size?: 'small' | 'medium';
	disabled?: boolean;
	variant?: 'filled' | 'standard' | 'outlined';
	onClick?: () => void;
	startIcon?: ReactNode;
	endIcon?: ReactNode;
	slotProps?: {
		htmlInput?: InputHTMLAttributes<HTMLInputElement>;
	};
	name?: string;
	required?: boolean;
	autoComplete?: string;
	maxLength?: number;
	shrink?: boolean;
	multiline?: boolean;
	rows?: number;
	ref?: Ref<HTMLInputElement | HTMLTextAreaElement>;
};

const CustomTextInput = ({ref, ...props}: Props) => {
		const { cssClass, startIcon, endIcon, multiline, rows, helperText, error, fullWidth, slotProps, ...rest } = props;

		return (
			<div className={[fullWidth ? 'w-full' : '', cssClass ?? ''].join(' ')}>
				{props.label ? (
					<label htmlFor={props.id} className="mb-2 block text-sm font-medium leading-5 text-(--ink-soft)">
						{props.label}
					</label>
				) : null}
				<div className="relative">
					{startIcon ? (
						<div className="pointer-events-none absolute left-3 top-0 z-10 flex h-full items-center justify-center text-(--ink-muted)">
							{startIcon}
						</div>
					) : null}
					{multiline ? (
						<textarea
							ref={ref as Ref<HTMLTextAreaElement>}
							id={rest.id}
							name={rest.name || rest.id}
							value={rest.value}
							onChange={(event) => rest.onChange(event)}
							onBlur={(event) => rest.onBlur?.(event)}
							placeholder={rest.placeholder}
							disabled={rest.disabled}
							required={rest.required}
							rows={rows}
							className={['app-input min-h-[110px] w-full resize-y', startIcon ? 'pl-14' : '', endIcon ? 'pr-14' : '', error ? 'border-red-300 bg-red-50' : ''].join(' ')}
						/>
					) : (
						<input
							ref={ref as Ref<HTMLInputElement>}
							id={rest.id}
							name={rest.name || rest.id}
							type={rest.type}
							value={rest.value}
							onChange={rest.onChange}
							onBlur={rest.onBlur}
							placeholder={rest.placeholder}
							disabled={rest.disabled}
							required={rest.required}
							autoComplete={rest.autoComplete}
							onClick={rest.onClick}
							maxLength={props.maxLength}
							className={['app-input w-full', startIcon ? 'pl-14' : '', endIcon ? 'pr-14' : '', error ? 'border-red-300 bg-red-50' : ''].join(' ')}
							{...slotProps?.htmlInput}
						/>
					)}
					{endIcon ? (
						<div className="absolute right-4 top-1/2 -translate-y-1/2 text-(--ink-muted)">{endIcon}</div>
					) : null}
				</div>
				{helperText ? <p className="mt-2 text-sm text-red-600">{helperText}</p> : null}
			</div>
		);
};

CustomTextInput.displayName = 'CustomTextInput';
export default CustomTextInput;
