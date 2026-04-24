import React, { forwardRef } from 'react';

type Props = {
	type: React.HTMLInputTypeAttribute;
	id: string;
	value: string;
	onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onInput?: (e: React.InputEvent<HTMLInputElement>) => void;
	onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
	onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
	onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
	theme?: unknown;
	cssClass?: string;
	helperText?: string;
	error?: boolean;
	placeholder?: string;
	label?: string;
	fullWidth?: boolean;
	size?: 'small' | 'medium';
	disabled?: boolean;
	onClick?: () => void;
	autoFocus?: boolean;
	slotProps?: { htmlInput?: React.InputHTMLAttributes<HTMLInputElement> };
	inputRef?: React.Ref<HTMLInputElement | null>;
};

const CustomOutlinedText = forwardRef<HTMLInputElement, Props>((props, ref) => {
	const {
		cssClass,
		theme: _theme,
		slotProps,
		inputRef,
		value,
		onChange,
		onInput,
		onBlur,
		onKeyDown,
		onPaste,
		type,
		id,
		helperText,
		error,
		placeholder,
		label,
		fullWidth,
		size,
		disabled,
		onClick,
		autoFocus,
		...rest
	} = props;
	void _theme;

	// Merge parent-provided slotProps.htmlInput with explicit handlers (do not override parent's handlers)
	const mergedHtmlInput: React.InputHTMLAttributes<HTMLInputElement> = {
		...(slotProps?.htmlInput ?? {}),
		onChange: slotProps?.htmlInput?.onChange ?? onChange,
		onInput: slotProps?.htmlInput?.onInput ?? onInput,
		onBlur: slotProps?.htmlInput?.onBlur ?? onBlur,
		onKeyDown: slotProps?.htmlInput?.onKeyDown ?? onKeyDown,
		onPaste: slotProps?.htmlInput?.onPaste ?? onPaste,
		// preserve other htmlInput props like maxLength if provided by parent
		...(slotProps?.htmlInput ?? {}),
	};

	return (
		<div className={[fullWidth ? 'w-full' : '', cssClass ?? ''].join(' ')}>
			{label ? (
				<label htmlFor={id} className="mb-2 block text-sm font-medium text-[var(--ink)]">
					{label}
				</label>
			) : null}
			<input
				{...rest}
				type={type}
				id={id}
				value={value}
				onChange={onChange}
				onInput={onInput}
				onBlur={onBlur}
				onKeyDown={onKeyDown}
				onPaste={onPaste}
				placeholder={placeholder}
				disabled={disabled}
				onClick={onClick}
				autoFocus={autoFocus}
				ref={inputRef ?? (ref as React.Ref<HTMLInputElement>)}
				{...mergedHtmlInput}
				className={[
					'app-input w-full text-center text-lg font-semibold tracking-[0.32em]',
					size === 'small' ? 'min-h-[46px]' : 'min-h-[54px]',
					error ? 'border-[color:var(--accent)]' : '',
				].join(' ')}
			/>
			{helperText ? <p className="mt-2 text-center text-sm text-[var(--ink-soft)]">{helperText}</p> : null}
		</div>
	);
});

CustomOutlinedText.displayName = 'CustomOutlinedText';
export default CustomOutlinedText;
