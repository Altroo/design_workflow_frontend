import React, { ForwardedRef, forwardRef } from 'react';

type Props = {
	type: React.HTMLInputTypeAttribute;
	id: string;
	value: string;
	onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
	theme?: unknown;
	onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
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
	startIcon?: React.ReactNode;
	endIcon?: React.ReactNode;
	slotProps?: {
		htmlInput?: React.InputHTMLAttributes<HTMLInputElement>;
	};
	name?: string;
	required?: boolean;
	autoComplete?: string;
	maxLength?: number;
	shrink?: boolean;
	multiline?: boolean;
	rows?: number;
};

const CustomTextInput = forwardRef<HTMLInputElement | HTMLTextAreaElement, Props>(
	(props: Props, ref: ForwardedRef<HTMLInputElement | HTMLTextAreaElement>) => {
		const { cssClass, startIcon, endIcon, multiline, rows, helperText, error, fullWidth, slotProps, ...rest } = props;

		return (
			<div className={[fullWidth ? 'w-full' : '', cssClass ?? ''].join(' ')}>
				{props.label ? (
					<label htmlFor={props.id} className="mb-2 block text-sm font-medium text-[var(--ink)]">
						{props.label}
					</label>
				) : null}
				<div className="relative">
					{startIcon ? (
						<div className="pointer-events-none absolute left-5 top-1/2 z-10 -translate-y-1/2 text-[var(--ink-soft)]">
							{startIcon}
						</div>
					) : null}
					{multiline ? (
						<textarea
							ref={ref as ForwardedRef<HTMLTextAreaElement>}
							id={rest.id}
							name={rest.name || rest.id}
							value={rest.value}
							onChange={(event) => rest.onChange(event)}
							onBlur={(event) => rest.onBlur?.(event)}
							placeholder={rest.placeholder}
							disabled={rest.disabled}
							required={rest.required}
							rows={rows}
							className={['app-input w-full min-h-[110px] resize-y', startIcon ? 'pl-14' : '', endIcon ? 'pr-14' : '', error ? 'border-red-600' : ''].join(' ')}
						/>
					) : (
						<input
							ref={ref as ForwardedRef<HTMLInputElement>}
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
							className={['app-input w-full', startIcon ? 'pl-14' : '', endIcon ? 'pr-14' : '', error ? 'border-red-600' : ''].join(' ')}
							{...slotProps?.htmlInput}
						/>
					)}
					{endIcon ? (
						<div className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]">{endIcon}</div>
					) : null}
				</div>
				{helperText ? <p className="mt-2 text-sm text-red-600">{helperText}</p> : null}
			</div>
		);
	},
);

CustomTextInput.displayName = 'CustomTextInput';
export default CustomTextInput;
