'use client';

import React, { useState } from 'react';
import { useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import { ArrowRight, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AuthLayout from '@/components/layouts/auth/authLayout';
import { cookiesPoster } from '@/utils/apiHelpers';
import { passwordResetConfirmationSchema } from '@/utils/formValidationSchemas';
import { setFormikAutoErrors } from '@/utils/helpers';
import { useSetPasswordMutation } from '@/store/services/account';
import { AUTH_RESET_PASSWORD_COMPLETE } from '@/utils/routes';
import { useLanguage } from '@/utils/hooks';

type Props = {
	email: string;
	code: string;
};

const SetPasswordPageContent = ({ email, code }: Props) => {
	const router = useRouter();
	const { t } = useLanguage();
	const [isPending, setIsPending] = useState(false);
	const [setPassword, setPasswordState] = useSetPasswordMutation();

	const formik = useFormik({
		initialValues: {
			new_password: '',
			new_password2: '',
			globalError: '',
		},
		validateOnMount: true,
		validationSchema: toFormikValidationSchema(passwordResetConfirmationSchema),
		onSubmit: async (values, { setFieldError }) => {
			setIsPending(true);
			try {
				await setPassword({
					email,
					code,
					new_password: values.new_password,
					new_password2: values.new_password2,
				}).unwrap();
				await cookiesPoster('/api/cookies', { pass_updated: 1 });
				router.push(AUTH_RESET_PASSWORD_COMPLETE);
			} catch (e) {
				setFormikAutoErrors({ e, setFieldError });
			} finally {
				setIsPending(false);
			}
		},
	});

	return (
		<div className="app-card px-5 py-6 sm:px-7 sm:py-7">
			<p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ink-soft)]">Security</p>
			<h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-[var(--ink)]">{t.auth.setNewPassword}</h1>
			<p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
				Create strong password. Keep workspace secure.
			</p>

			<form onSubmit={formik.handleSubmit} className="mt-8 space-y-5">
				{[
					{
						id: 'new_password',
						label: t.auth.password,
						placeholder: t.auth.passwordPlaceholder,
						value: formik.values.new_password,
						error: formik.touched.new_password ? formik.errors.new_password : '',
					},
					{
						id: 'new_password2',
						label: t.auth.confirmPassword,
						placeholder: t.auth.confirmPassword,
						value: formik.values.new_password2,
						error: formik.touched.new_password2 ? formik.errors.new_password2 : '',
					},
				].map((field) => (
					<div key={field.id}>
						<label htmlFor={field.id} className="mb-2 block text-sm font-medium text-[var(--ink)]">
							{field.label}
						</label>
						<div className="relative">
							<Lock size={18} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]" />
							<input
								id={field.id}
								name={field.id}
								type="password"
								value={field.value}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								placeholder={field.placeholder}
								className="app-input pl-14"
							/>
						</div>
						{field.error ? <p className="mt-2 text-sm text-[var(--ink-soft)]">{field.error}</p> : null}
					</div>
				))}

				{formik.errors.globalError ? (
					<div className="rounded-[8px] border border-[color:var(--line)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--ink-soft)]">
						{formik.errors.globalError}
					</div>
				) : null}

				<button type="submit" disabled={isPending || setPasswordState.isLoading} className="app-button w-full">
					<span>{t.auth.changePasswordButton}</span>
					<ArrowRight size={16} />
				</button>
			</form>
		</div>
	);
};

const SetPasswordClient: React.FC<Props> = ({ email, code }) => (
	<AuthLayout>
		<SetPasswordPageContent email={email} code={code} />
	</AuthLayout>
);

export default SetPasswordClient;
