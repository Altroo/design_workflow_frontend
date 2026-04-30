'use client';

import React, { useEffect, useState } from 'react';
import { useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import { ArrowLeft, ArrowRight, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AuthLayout from '@/components/layouts/auth/authLayout';
import ApiProgress from '@/components/formikElements/apiLoading/apiProgress/apiProgress';
import { useSendPasswordResetCodeMutation } from '@/store/services/account';
import { cookiesPoster } from '@/utils/apiHelpers';
import { emailSchema } from '@/utils/formValidationSchemas';
import { setFormikAutoErrors } from '@/utils/helpers';
import { AUTH_LOGIN, AUTH_RESET_PASSWORD_ENTER_CODE, DASHBOARD } from '@/utils/routes';
import { useLanguage } from '@/utils/hooks';

const ResetPasswordPageContent = () => {
	const router = useRouter();
	const [isPending, setIsPending] = useState(false);
	const { t } = useLanguage();
	const [sendPasswordResetCode, { isLoading }] = useSendPasswordResetCodeMutation();

	const formik = useFormik({
		initialValues: {
			email: '',
			globalError: '',
		},
		validateOnMount: true,
		validationSchema: toFormikValidationSchema(emailSchema),
		onSubmit: async (values, { setFieldError }) => {
			setIsPending(true);
			try {
				await sendPasswordResetCode({ email: values.email }).unwrap();
				await cookiesPoster('/api/cookies', { new_email: values.email });
				router.push(AUTH_RESET_PASSWORD_ENTER_CODE);
			} catch (e) {
				setFormikAutoErrors({ e, setFieldError });
			} finally {
				setIsPending(false);
			}
		},
	});

	return (
		<div className="app-card px-5 py-6 sm:px-7 sm:py-7">
			<p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--ink-soft)">Recovery</p>
			<h1 className="mt-3 text-4xl font-semibold text-(--ink)">
				{t.auth.recovery} {t.auth.ofPassword}
			</h1>
			<p className="mt-3 text-sm leading-6 text-(--ink-soft)">{t.auth.enterEmailDescription}</p>

			<form onSubmit={formik.handleSubmit} className="mt-8 space-y-5">
				<div>
					<label htmlFor="email" className="mb-2 block text-sm font-medium leading-5 text-(--ink-soft)">
						{t.auth.emailAddress}
					</label>
					<div className="relative">
						<Mail size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-(--ink-muted)" />
						<input
							id="email"
							name="email"
							type="email"
							autoComplete="email"
							value={formik.values.email}
							onChange={formik.handleChange}
							onBlur={formik.handleBlur}
							placeholder={t.auth.emailPlaceholder}
							className="app-input pl-14"
						/>
					</div>
					{formik.touched.email && formik.errors.email ? (
						<p className="mt-2 text-sm text-(--ink-soft)">{formik.errors.email}</p>
					) : null}
				</div>

				{formik.errors.globalError ? (
					<div className="rounded-lg border border-[color:var(--line)] bg-(--surface-muted) px-4 py-3 text-sm text-(--ink-soft)">
						{formik.errors.globalError}
					</div>
				) : null}

				<div className="flex flex-col gap-3 sm:flex-row">
					<button type="submit" disabled={isLoading || isPending} className="app-button flex-1">
						<span>{t.auth.resendCode}</span>
						<ArrowRight size={16} />
					</button>
					<button
						type="button"
						onClick={() => router.push(AUTH_LOGIN)}
						className="app-button app-button-secondary flex-1"
					>
						<ArrowLeft size={16} />
						<span>{t.auth.backToLogin}</span>
					</button>
				</div>
			</form>
		</div>
	);
};

const ResetPasswordClient: React.FC = () => {
	const { data: session, status } = useSession();
	const router = useRouter();

	useEffect(() => {
		if (status !== 'loading' && session) {
			router.replace(DASHBOARD);
		}
	}, [router, session, status]);

	if (status === 'loading') {
		return <ApiProgress backdropColor="#FFFFFF" circularColor="var(--accent)" />;
	}

	if (session) {
		return <ApiProgress backdropColor="#FFFFFF" circularColor="var(--accent)" />;
	}

	return (
		<AuthLayout>
			<ResetPasswordPageContent />
		</AuthLayout>
	);
};

export default ResetPasswordClient;
