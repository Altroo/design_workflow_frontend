'use client';

import React, { useState } from 'react';
import { LockKeyhole, PencilLine, TriangleAlert } from 'lucide-react';
import { setFormikAutoErrors } from '@/utils/helpers';
import { useFormik } from 'formik';
import { changePasswordSchema } from '@/utils/formValidationSchemas';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import CustomPasswordInput from '@/components/formikElements/customPasswordInput/customPasswordInput';
import PrimaryLoadingButton from '@/components/htmlElements/buttons/primaryLoadingButton/primaryLoadingButton';
import { useEditPasswordMutation } from '@/store/services/account';
import ApiProgress from '@/components/formikElements/apiLoading/apiProgress/apiProgress';
import NavigationBar from '@/components/layouts/navigationBar/navigationBar';
import { useToast, useAppSelector, useLanguage } from '@/utils/hooks';
import { getProfilState } from '@/store/selectors';

const FormikContent: React.FC = () => {
	const { onSuccess, onError } = useToast();
	const { t } = useLanguage();
	const profil = useAppSelector(getProfilState);
	const [changePassword, { isLoading: isChangePasswordLoading }] = useEditPasswordMutation();
	const [isPending, setIsPending] = useState(false);

	const formik = useFormik({
		initialValues: {
			old_password: '',
			new_password: '',
			new_password2: '',
			globalError: '',
		},
		validateOnMount: true,
		validationSchema: toFormikValidationSchema(changePasswordSchema),
		onSubmit: async (values, { setFieldError, resetForm }) => {
			setIsPending(true);
			try {
				await changePassword({
					data: {
						old_password: values.old_password,
						new_password: values.new_password,
						new_password2: values.new_password2,
					},
				}).unwrap();
				onSuccess(t.settings.passwordChangeSuccess);
				resetForm();
			} catch (e) {
				onError(t.settings.passwordChangeError);
				setFormikAutoErrors({ e, setFieldError });
			} finally {
				setIsPending(false);
			}
		},
	});

	return (
		<div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
			{(isChangePasswordLoading || isPending) && <ApiProgress backdropColor="#FFFFFF" circularColor="#111827" />}
			<div className="app-card border border-[color:var(--line-strong)] bg-white p-6 sm:p-8">
				<div className="flex items-start justify-between gap-4">
					<div>
						<p className="text-xs font-medium uppercase tracking-[0.24em] text-[var(--ink-soft)]">Settings</p>
						<h2 className="mt-2 text-3xl font-semibold text-[var(--ink)]">{t.settings.changePassword}</h2>
						<p className="mt-2 text-sm text-[var(--ink-soft)]">Update credentials with strong password rules.</p>
					</div>
					<div className="flex h-14 w-14 items-center justify-center rounded-[8px] bg-[var(--accent)] text-white">
						<LockKeyhole className="h-6 w-6" />
					</div>
				</div>

				{profil && profil.default_password_set ? (
					<div className="mt-6 flex items-start gap-3 rounded-[8px] border border-[color:var(--line)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--ink)]">
						<TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
						<p>{t.settings.defaultPasswordWarning}</p>
					</div>
				) : null}

				<form className="mt-6 space-y-4" onSubmit={formik.handleSubmit}>
					<CustomPasswordInput
						id="old_password"
						value={formik.values.old_password}
						onChange={formik.handleChange('old_password')}
						onBlur={formik.handleBlur('old_password')}
						helperText={formik.touched.old_password ? formik.errors.old_password : ''}
						error={formik.touched.old_password && Boolean(formik.errors.old_password)}
						label={t.settings.oldPassword}
						placeholder={t.settings.oldPassword}
						startIcon={<LockKeyhole className="h-4 w-4" />}
						fullWidth={true}
					/>
					<CustomPasswordInput
						id="new_password"
						value={formik.values.new_password}
						onChange={formik.handleChange('new_password')}
						onBlur={formik.handleBlur('new_password')}
						helperText={formik.touched.new_password ? formik.errors.new_password : ''}
						error={formik.touched.new_password && Boolean(formik.errors.new_password)}
						label={t.settings.newPassword}
						placeholder={t.settings.newPassword}
						startIcon={<LockKeyhole className="h-4 w-4" />}
						fullWidth={true}
					/>
					<CustomPasswordInput
						id="new_password2"
						value={formik.values.new_password2}
						onChange={formik.handleChange('new_password2')}
						onBlur={formik.handleBlur('new_password2')}
						helperText={formik.touched.new_password2 ? formik.errors.new_password2 : ''}
						error={formik.touched.new_password2 && Boolean(formik.errors.new_password2)}
						label={t.settings.confirmNewPassword}
						placeholder={t.settings.confirmNewPassword}
						startIcon={<LockKeyhole className="h-4 w-4" />}
						fullWidth={true}
					/>
					<PrimaryLoadingButton
						buttonText={t.settings.modify}
						active={!isPending}
						onClick={formik.handleSubmit}
						type="submit"
						startIcon={<PencilLine className="h-4 w-4" />}
						loading={isPending}
					/>
				</form>
			</div>
		</div>
	);
};

const PasswordClient: React.FC = () => {
	const { t } = useLanguage();

	return (
		<NavigationBar title={t.settings.changePassword}>
			<main className="min-h-[calc(100vh-120px)]">
				<FormikContent />
			</main>
		</NavigationBar>
	);
};

export default PasswordClient;
