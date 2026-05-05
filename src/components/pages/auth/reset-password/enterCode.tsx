'use client';

import React, { useRef, useState } from 'react';
import { useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AuthLayout from '@/components/layouts/auth/authLayout';
import ApiProgress from '@/components/formikElements/apiLoading/apiProgress/apiProgress';
import { usePasswordResetMutation, useSendPasswordResetCodeMutation } from '@/store/services/account';
import { cookiesPoster } from '@/utils/apiHelpers';
import { passwordResetCodeSchema } from '@/utils/formValidationSchemas';
import { setFormikAutoErrors } from '@/utils/helpers';
import { AUTH_RESET_PASSWORD_SET_PASSWORD } from '@/utils/routes';
import { useLanguage, useToast } from '@/utils/hooks';

type Props = {
	email: string;
};

type FieldKey = 'one' | 'two' | 'three' | 'four' | 'five' | 'six';

const fields: FieldKey[] = ['one', 'two', 'three', 'four', 'five', 'six'];

const EnterCodePageContent = ({ email }: Props) => {
	const router = useRouter();
	const { onSuccess, onError } = useToast();
	const { t } = useLanguage();
	const [isPending, setIsPending] = useState(false);
	const [sendPasswordResetCode, sendPasswordResetState] = useSendPasswordResetCodeMutation();
	const [passwordReset, passwordResetState] = usePasswordResetMutation();
	const inputRefs = {
		one: useRef<HTMLInputElement>(null),
		two: useRef<HTMLInputElement>(null),
		three: useRef<HTMLInputElement>(null),
		four: useRef<HTMLInputElement>(null),
		five: useRef<HTMLInputElement>(null),
		six: useRef<HTMLInputElement>(null),
	};

	const formik = useFormik({
		initialValues: {
			one: '',
			two: '',
			three: '',
			four: '',
			five: '',
			six: '',
			globalError: '',
		},
		validateOnMount: true,
		validationSchema: toFormikValidationSchema(passwordResetCodeSchema),
		onSubmit: async (values, { setFieldError }) => {
			setIsPending(true);
			const code = fields.map((field) => values[field]).join('');
			try {
				await passwordReset({ email, code }).unwrap();
				await cookiesPoster('/api/cookies', { code });
				router.push(AUTH_RESET_PASSWORD_SET_PASSWORD);
			} catch (e) {
				setFormikAutoErrors({ e, setFieldError });
			} finally {
				setIsPending(false);
			}
		},
	});

	const moveFocus = (field: FieldKey, value: string) => {
		if (!value) {
			return;
		}
		const index = fields.indexOf(field);
		const nextField = fields[index + 1];
		if (nextField) {
			inputRefs[nextField].current?.focus();
		}
	};

	const handleInput = (field: FieldKey, value: string) => {
		const nextValue = value.replace(/\D/g, '').slice(0, 1);
		void formik.setFieldValue(field, nextValue);
		moveFocus(field, nextValue);
	};

	const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
		event.preventDefault();
		const digits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, fields.length).split('');
		digits.forEach((digit, index) => {
			void formik.setFieldValue(fields[index], digit);
		});
		const focusField = fields[Math.min(digits.length, fields.length - 1)];
		inputRefs[focusField].current?.focus();
	};

	const resendHandler = async () => {
		try {
			await sendPasswordResetCode({ email }).unwrap();
			onSuccess(t.auth.codeSent);
		} catch (e) {
			onError(t.auth.codeSendFailed);
			setFormikAutoErrors({ e, setFieldError: formik.setFieldError });
		}
	};

	return (
		<div className="app-card px-5 py-6 sm:px-7 sm:py-7">
			<p className="text-xs font-semibold uppercase tracking-[0.22em] text-(--ink-soft)">{t.auth.confirmCode}</p>
			<h1 className="mt-3 text-4xl font-semibold text-(--ink)">{t.auth.enterCode}</h1>
			<p className="mt-3 text-sm leading-6 text-(--ink-soft)">
				{t.auth.codeSentTo} <span className="font-semibold text-(--ink)">{email}</span>
			</p>

			<form onSubmit={formik.handleSubmit} className="mt-8 space-y-6">
				<div className="grid grid-cols-6 gap-2 sm:gap-3">
					{fields.map((field, index) => (
						<input
							key={field}
							ref={inputRefs[field]}
							id={field}
							name={field}
							autoFocus={index === 0}
							value={formik.values[field]}
							onChange={(event) => handleInput(field, event.target.value)}
							onBlur={formik.handleBlur}
							onPaste={handlePaste}
							onKeyDown={(event) => {
								if (event.key === 'Backspace' && !formik.values[field]) {
									const previousField = fields[index - 1];
									if (previousField) {
										inputRefs[previousField].current?.focus();
									}
								}
							}}
							inputMode="numeric"
							className="h-14 rounded-lg border border-[color:var(--line-strong)] bg-white text-center text-xl font-semibold outline-none transition focus:border-[color:var(--accent)] focus:shadow-[0_0_0_4px_rgba(17,24,39,0.16)]"
						/>
					))}
				</div>

				{formik.errors.globalError ? (
					<div className="rounded-lg border border-[color:var(--line)] bg-(--surface-muted) px-4 py-3 text-sm text-(--ink-soft)">
						{formik.errors.globalError}
					</div>
				) : null}

				<div className="flex flex-col gap-3 sm:flex-row">
					<button
						type="submit"
						disabled={isPending || passwordResetState.isLoading}
						className="app-button flex-1"
					>
						<span>{t.auth.confirmCode}</span>
						<ArrowRight size={16} />
					</button>
					<button
						type="button"
						onClick={() => void resendHandler()}
						disabled={sendPasswordResetState.isLoading}
						className="app-button app-button-secondary flex-1"
					>
						<RotateCcw size={16} />
						<span>{t.auth.resendCode}</span>
					</button>
				</div>
			</form>
		</div>
	);
};

const EnterCodeClient: React.FC<Props> = ({ email }) => {
	const { data: session, status } = useSession();

	if (status === 'loading') {
		return <ApiProgress backdropColor="#FFFFFF" circularColor="var(--accent)" />;
	}

	if (session) {
		return <ApiProgress backdropColor="#FFFFFF" circularColor="var(--accent)" />;
	}

	return (
		<AuthLayout>
			<EnterCodePageContent email={email} />
		</AuthLayout>
	);
};

export default EnterCodeClient;
