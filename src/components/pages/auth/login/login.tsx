'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import { ArrowRight, Eye, EyeOff, KeyRound, Lock, Mail } from 'lucide-react';
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
		<div className="auth-login-card relative overflow-hidden bg-white">
			<div className="auth-login-lane">
				<div className="flex items-center justify-between gap-3">
					<b>{t.settings.security}</b>
					<em>+</em>
				</div>
			</div>

			<div className="relative z-10 p-4 sm:p-5">
				<div className="mb-5 flex items-start justify-between gap-4">
					<div>
						<p className="text-[10px] font-bold uppercase tracking-[0.18em] text-(--ink-muted)">{t.workflow.labels.board}</p>
						<h1 className="mt-1 text-2xl font-extrabold text-(--ink)">{t.auth.login}</h1>
						<p className="mt-2 text-xs font-semibold leading-5 text-(--ink-soft)">
							{t.workflow.sections.boardLanes.description}
						</p>
					</div>
					<div className="auth-login-mark">DW</div>
				</div>

				{errorState ? (
					<div className="mb-4 rounded-[14px] border border-[color:var(--accent)] bg-(--accent-soft) px-4 py-3 text-xs font-bold text-(--accent-strong)">
						{errorState}
					</div>
				) : null}

				<form onSubmit={formik.handleSubmit} className="space-y-3">
					<div>
						<label htmlFor="email" className="mb-2 block text-xs font-bold text-(--ink)">
							{t.auth.emailAddress}
						</label>
						<div className="relative">
							<Mail size={16} className="pointer-events-none absolute left-3 top-0 h-full text-(--ink-soft)" />
							<input
								id="email"
								name="email"
								type="email"
								autoComplete="email"
								placeholder={t.auth.emailPlaceholder}
								value={formik.values.email}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								className="auth-login-input app-input pl-14"
							/>
						</div>
						{formik.touched.email && formik.errors.email ? (
							<p className="mt-2 text-sm text-(--ink-soft)">{formik.errors.email}</p>
						) : null}
					</div>

					<div>
						<label htmlFor="password" className="mb-2 block text-xs font-bold text-(--ink)">
							{t.auth.password}
						</label>
						<div className="relative">
							<Lock size={16} className="pointer-events-none absolute left-3 top-0 h-full text-(--ink-soft)" />
							<input
								id="password"
								name="password"
								type={showPassword ? 'text' : 'password'}
								autoComplete="current-password"
								placeholder={t.auth.passwordPlaceholder}
								value={formik.values.password}
								onChange={formik.handleChange}
								onBlur={formik.handleBlur}
								className="auth-login-input app-input pl-14 pr-14"
							/>
							<button
								type="button"
								aria-label={t.common.togglePasswordVisibility}
								onClick={() => setShowPassword((current) => !current)}
								className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-(--ink-soft) transition hover:bg-(--surface-muted) hover:text-(--ink)"
							>
								{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
							</button>
						</div>
						{formik.touched.password && formik.errors.password ? (
							<p className="mt-2 text-sm text-(--ink-soft)">{formik.errors.password}</p>
						) : null}
					</div>

					{formik.errors.globalError ? (
						<div className="rounded-[14px] border border-[color:var(--line)] bg-(--surface-muted) px-4 py-3 text-xs font-semibold text-(--ink-soft)">
							{formik.errors.globalError}
						</div>
					) : null}

					<div className="flex flex-col gap-3 pt-2">
						<button type="submit" disabled={isPending} className="app-button min-w-full">
							<span>{isPending ? t.common.loading ?? 'Loading...' : t.auth.loginButton}</span>
							<ArrowRight size={16} />
						</button>
						<button
							type="button"
							onClick={() => router.push(AUTH_RESET_PASSWORD)}
							className="auth-forgot-link inline-flex min-h-9 items-center justify-center gap-2 rounded-full text-xs font-bold text-(--ink-soft) transition hover:bg-(--surface-muted) hover:text-(--ink)"
						>
							<KeyRound size={16} />
							<span>{t.auth.forgotPassword}</span>
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
		return <ApiProgress backdropColor="#FFFFFF" circularColor="var(--accent)" />;
	}

	return (
		<AuthLayout>
			<LoginPageContent />
		</AuthLayout>
	);
};

export default LoginClient;
