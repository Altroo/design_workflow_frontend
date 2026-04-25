'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import { ArrowRight, Eye, EyeOff, KeyRound, Lock, Mail, ShieldCheck } from 'lucide-react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthLayout from '@/components/layouts/auth/authLayout';
import ApiProgress from '@/components/formikElements/apiLoading/apiProgress/apiProgress';
import { loginSchema } from '@/utils/formValidationSchemas';
import { allowAnyInstance, setFormikAutoErrors } from '@/utils/helpers';
import { postApi } from '@/utils/apiHelpers';
import type { AccountPostLoginResponseType } from '@/types/accountTypes';
import { AUTH_RESET_PASSWORD, DASHBOARD } from '@/utils/routes';
import { useAppDispatch, useLanguage } from '@/utils/hooks';
import { refreshAppTokenStatesAction } from '@/store/actions/_initActions';

const LoginPageContent = () => {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, setIsPending] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const { t } = useLanguage();
	const error = searchParams.get('error') as string | null;
	const errorState = error === 'AccessDenied' ? t.errors.serviceUnavailable : error;

	const formik = useFormik({
		initialValues: {
			email: '',
			password: '',
			globalError: '',
		},
		validateOnMount: true,
		validationSchema: toFormikValidationSchema(loginSchema),
		onSubmit: async (values, { setFieldError }) => {
			setIsPending(true);
			try {
				const instance = allowAnyInstance();
				const response: AccountPostLoginResponseType = await postApi(
					`${process.env.NEXT_PUBLIC_ACCOUNT_LOGIN}`,
					instance,
					{
						email: values.email,
						password: values.password,
					},
				);

				if (response.status === 200) {
					await signIn('credentials', {
						email: values.email,
						password: values.password,
						redirect: false,
					});
				}
			} catch (e) {
				setFormikAutoErrors({ e, setFieldError });
			} finally {
				setIsPending(false);
			}
		},
	});

	return (
		<div className="app-card relative overflow-hidden bg-white">
			<div className="border-b border-[color:var(--line)] bg-[linear-gradient(135deg,var(--accent-tint),#fff)] px-5 py-5 sm:px-7">
				<div className="flex items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<div className="grid h-12 w-12 place-items-center rounded-[8px] border border-[color:var(--ink)] bg-[var(--ink)] text-sm font-extrabold text-white">
							DW
						</div>
						<div>
							<p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[var(--accent-strong)]">Studio access</p>
							<p className="text-lg font-extrabold text-[var(--ink)]">Design Workflow</p>
						</div>
					</div>
					<div className="hidden items-center gap-2 rounded-[8px] border border-[color:var(--line)] bg-white px-3 py-2 text-xs font-bold text-[var(--accent-strong)] sm:flex">
						<ShieldCheck size={15} />
						Secure
					</div>
				</div>
			</div>

			<div className="relative z-10 px-5 py-6 sm:px-7 sm:py-7">
				<div className="mb-7">
					<h1 className="text-4xl font-extrabold text-[var(--ink)]">{t.auth.login}</h1>
					<p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
						Access architectural project boards and task rooms.
					</p>
				</div>

					<div className="mb-5 grid grid-cols-3 gap-2" aria-hidden="true">
						<div className="h-2 rounded-full bg-[var(--accent)]" />
						<div className="h-2 rounded-full bg-[var(--line-strong)]" />
						<div className="h-2 rounded-full bg-[var(--surface-strong)]" />
					</div>

				{errorState ? (
					<div className="mb-4 rounded-[8px] border border-[color:var(--accent)] bg-[var(--accent-soft)] px-4 py-3 text-sm font-medium text-[var(--accent-strong)]">
						{errorState}
					</div>
				) : null}

				<form onSubmit={formik.handleSubmit} className="space-y-4">
					<div>
						<label htmlFor="email" className="mb-2 block text-sm font-medium text-[var(--ink)]">
							{t.auth.emailAddress}
						</label>
						<div className="relative">
							<Mail size={18} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]" />
							<input
								id="email"
								name="email"
								type="email"
								autoComplete="email"
								placeholder={t.auth.emailPlaceholder}
								value={formik.values.email}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								className="app-input min-h-[52px] pl-14"
							/>
						</div>
						{formik.touched.email && formik.errors.email ? (
							<p className="mt-2 text-sm text-[var(--ink-soft)]">{formik.errors.email}</p>
						) : null}
					</div>

					<div>
						<label htmlFor="password" className="mb-2 block text-sm font-medium text-[var(--ink)]">
							{t.auth.password}
						</label>
						<div className="relative">
							<Lock size={18} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]" />
							<input
								id="password"
								name="password"
								type={showPassword ? 'text' : 'password'}
								autoComplete="current-password"
								placeholder={t.auth.passwordPlaceholder}
								value={formik.values.password}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								className="app-input min-h-[52px] pl-14 pr-14"
							/>
							<button
								type="button"
								aria-label={showPassword ? 'Hide password' : 'Show password'}
								onClick={() => setShowPassword((current) => !current)}
								className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-[8px] text-[var(--ink-soft)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]"
							>
								{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
							</button>
						</div>
						{formik.touched.password && formik.errors.password ? (
							<p className="mt-2 text-sm text-[var(--ink-soft)]">{formik.errors.password}</p>
						) : null}
					</div>

					{formik.errors.globalError ? (
						<div className="rounded-[8px] border border-[color:var(--line)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--ink-soft)]">
							{formik.errors.globalError}
						</div>
					) : null}

					<div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
						<button
							type="button"
							onClick={() => router.push(AUTH_RESET_PASSWORD)}
							className="inline-flex min-h-11 items-center gap-2 rounded-[8px] text-sm font-semibold text-[var(--ink-soft)] transition hover:text-[var(--ink)]"
						>
							<KeyRound size={16} />
							<span>{t.auth.forgotPassword}</span>
						</button>
						<button type="submit" disabled={isPending} className="app-button min-w-[168px] sm:self-auto">
							<span>{isPending ? t.common.loading ?? 'Loading...' : t.auth.loginButton}</span>
							<ArrowRight size={16} />
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

const LoginClient: React.FC = () => {
	const { data: session, status } = useSession();
	const dispatch = useAppDispatch();
	const router = useRouter();
	const sessionUpdatedRef = useRef(false);

	useEffect(() => {
		if (session && !sessionUpdatedRef.current) {
			dispatch(refreshAppTokenStatesAction(session));
			sessionUpdatedRef.current = true;
			router.replace(DASHBOARD);
		}
	}, [dispatch, router, session]);

	if (status === 'loading' || session) {
		return <ApiProgress backdropColor="#FFFFFF" circularColor="#111827" />;
	}

	return (
		<AuthLayout>
			<LoginPageContent />
		</AuthLayout>
	);
};

export default LoginClient;
