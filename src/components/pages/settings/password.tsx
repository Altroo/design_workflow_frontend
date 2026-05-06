'use client';

import React, { useState } from 'react';
import { LockKeyhole, PencilLine, ShieldCheck, TriangleAlert } from 'lucide-react';
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
import { WorkflowIconPill, WorkflowPageHero } from '@/components/shared/workflow/workflowPrimitives';

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
		<div className="workflow-user-form-shell workflow-password-shell">
			{(isChangePasswordLoading || isPending) && <ApiProgress backdropColor="#FFFFFF" circularColor="var(--accent)" />}
			<WorkflowPageHero element="div" className="workflow-user-form-hero" eyebrow={t.settings.passwordStudio} title={t.settings.changePassword} />

			<form className="workflow-user-form-grid workflow-password-grid" onSubmit={formik.handleSubmit}>
				<section className="workflow-user-form-side">
					<div className="workflow-user-form-panel workflow-password-card">
						<div className="workflow-user-form-panel-head">
							<div className="workflow-user-form-icon">
								<ShieldCheck className="h-5 w-5" />
							</div>
							<div>
								<p>{t.settings.security}</p>
								<h2>{t.settings.changePassword}</h2>
							</div>
						</div>
						<div className="workflow-password-visual" aria-hidden="true">
							<div className="workflow-password-lock">
								<LockKeyhole className="h-10 w-10" />
							</div>
							<div className="workflow-password-dots">
								<span />
								<span />
								<span />
								<span />
							</div>
						</div>
					</div>
				</section>

				<section className="workflow-user-form-main">
					{profil && profil.default_password_set ? (
						<div className="workflow-password-warning">
							<TriangleAlert className="h-5 w-5 shrink-0" />
							<p>{t.settings.defaultPasswordWarning}</p>
						</div>
					) : null}

					<div className="workflow-user-form-panel">
						<WorkflowIconPill tone="indigo" icon={<LockKeyhole className="h-4 w-4" />} label={t.settings.credentials} />
						<div className="workflow-password-fields">
							<CustomPasswordInput
								id="old_password"
								value={formik.values.old_password}
								onChange={formik.handleChange('old_password')}
								onBlur={formik.handleBlur('old_password')}
								helperText={formik.touched.old_password ? formik.errors.old_password : ''}
								error={formik.touched.old_password && Boolean(formik.errors.old_password)}
								label={t.settings.oldPassword}
								placeholder={t.settings.oldPasswordPlaceholder}
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
								placeholder={t.settings.newPasswordPlaceholder}
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
								placeholder={t.settings.confirmNewPasswordPlaceholder}
								startIcon={<LockKeyhole className="h-4 w-4" />}
								fullWidth={true}
							/>
						</div>
					</div>
					<div className="workflow-user-form-submit">
						<PrimaryLoadingButton
							buttonText={t.settings.modify}
							active={!isPending}
							onClick={formik.handleSubmit}
							type="submit"
							startIcon={<PencilLine className="h-4 w-4" />}
							loading={isPending}
						/>
					</div>
				</section>
			</form>
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
