import React, { ForwardedRef, forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '@/utils/hooks';

type Props = {
	id: string;
	value: string;
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	theme?: unknown;
	onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
	cssClass?: string;
	helperText?: string;
	error?: boolean;
	placeholder?: string;
	label?: string;
	fullWidth?: boolean;
	size?: 'small' | 'medium';
	disabled?: boolean;
	startIcon?: React.ReactNode;
	onClick?: () => void;
};

const CustomPasswordInput = forwardRef<HTMLInputElement, Props>((props: Props, ref: ForwardedRef<HTMLInputElement>) => {
	const [showPassword, setShowPassword] = useState(false);
	const { t } = useLanguage();

	return (
		<div className={[props.fullWidth ? 'w-full' : '', props.cssClass ?? ''].join(' ')}>
			{props.label ? (
				<label htmlFor={props.id} className="mb-2 block text-sm font-medium text-[var(--ink)]">
					{props.label}
				</label>
			) : null}
			<div className="relative">
				{props.startIcon ? (
					<div className="pointer-events-none absolute left-5 top-1/2 z-10 -translate-y-1/2 text-[var(--ink-soft)]">
						{props.startIcon}
					</div>
				) : null}
				<input
					ref={ref}
					id={props.id}
					name={props.id}
					type={showPassword ? 'text' : 'password'}
					value={props.value}
					onChange={props.onChange}
					onBlur={props.onBlur}
					placeholder={props.placeholder}
					disabled={props.disabled}
					onClick={props.onClick}
					className={['app-input w-full', props.startIcon ? 'pl-14' : '', 'pr-14', props.error ? 'border-red-600' : ''].join(' ')}
				/>
				<button
					type="button"
					aria-label={t.common.togglePasswordVisibility}
					onClick={() => setShowPassword((current) => !current)}
					className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]"
				>
					{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
				</button>
			</div>
			{props.helperText ? <p className="mt-2 text-sm text-red-600">{props.helperText}</p> : null}
		</div>
	);
});

CustomPasswordInput.displayName = 'CustomPasswordInput';

export default CustomPasswordInput;
