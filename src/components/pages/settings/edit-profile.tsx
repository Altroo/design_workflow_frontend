'use client';

import React, { useState } from 'react';
import { Camera, PencilLine, Sparkles, UserRound } from 'lucide-react';
import { useFormik } from 'formik';
import { profilSchema } from '@/utils/formValidationSchemas';
import CustomTextInput from '@/components/formikElements/customTextInput/customTextInput';
import CustomDropDownSelect from '@/components/formikElements/customDropDownSelect/customDropDownSelect';
import { genderItemsList } from '@/utils/rawData';
import { useAppDispatch, useToast, useLanguage } from '@/utils/hooks';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import { setFormikAutoErrors } from '@/utils/helpers';
import PrimaryLoadingButton from '@/components/htmlElements/buttons/primaryLoadingButton/primaryLoadingButton';
import type { SessionProps } from '@/types/_initTypes';
import { useGetProfilQuery, useEditProfilMutation } from '@/store/services/account';
import { useInitAccessToken } from '@/contexts/InitContext';
import ApiProgress from '@/components/formikElements/apiLoading/apiProgress/apiProgress';
import NavigationBar from '@/components/layouts/navigationBar/navigationBar';
import { accountEditProfilAction } from '@/store/actions/accountActions';
import CustomSquareImageUploading from '@/components/formikElements/customSquareImageUploading/customSquareImageUploading';

type FormikContentType = {
	token: string | undefined;
};

const normalizeGenderValue = (value?: string | null) => (value === 'Homme' ? 'H' : value === 'Femme' ? 'F' : value ?? '');

const FormikContent: React.FC<FormikContentType> = ({ token }) => {
	const { onSuccess, onError } = useToast();
	const { t } = useLanguage();
	const { data: profilData, isLoading: isProfilLoading } = useGetProfilQuery(undefined, { skip: !token });
	const [editProfil, { isLoading: isEditLoading }] = useEditProfilMutation();
	const dispatch = useAppDispatch();
	const [isPending, setIsPending] = useState(false);

	const formik = useFormik({
		initialValues: {
			first_name: profilData?.first_name ?? '',
			last_name: profilData?.last_name ?? '',
			gender: normalizeGenderValue(profilData?.gender),
			avatar: profilData?.avatar ?? '',
			avatar_cropped: profilData?.avatar_cropped ?? '',
			globalError: '',
		},
		enableReinitialize: true,
		validateOnMount: true,
		validationSchema: toFormikValidationSchema(profilSchema),
		onSubmit: async (data, { setFieldError }) => {
			setIsPending(true);
			const { globalError, ...payload } = data;
			void globalError;
			try {
				const response = await editProfil({ data: payload }).unwrap();
				if (response) {
					dispatch(accountEditProfilAction(response));
					onSuccess(t.settings.updateSuccess);
				}
			} catch (e) {
				onError(t.settings.updateError);
				setFormikAutoErrors({ e, setFieldError });
			} finally {
				setIsPending(false);
			}
		},
	});

	return (
		<div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
			{(isEditLoading || isPending || isProfilLoading) && <ApiProgress backdropColor="#FFFFFF" circularColor="#111827" />}
			<div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
				<section className="app-card border border-[color:var(--line-strong)] bg-[var(--surface-muted)] p-6">
					<div className="flex items-center gap-3">
						<div className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-[var(--accent)] text-white">
							<Camera className="h-5 w-5" />
						</div>
						<div>
							<p className="text-xs font-medium uppercase tracking-[0.24em] text-[var(--ink-soft)]">Identity</p>
							<h2 className="text-xl font-semibold text-[var(--ink)]">{t.settings.profile}</h2>
						</div>
					</div>
					<p className="mt-4 text-sm leading-6 text-[var(--ink-soft)]">
						Keep photo and profile data aligned across board, team, and account screens.
					</p>
					<div className="mt-6">
						<CustomSquareImageUploading
							image={formik.values.avatar}
							croppedImage={formik.values.avatar_cropped}
							onChange={(img) => formik.setFieldValue('avatar', img)}
							onCrop={(cropped) => formik.setFieldValue('avatar_cropped', cropped)}
						/>
					</div>
				</section>

				<section className="app-card border border-[color:var(--line-strong)] bg-white p-6 sm:p-8">
					<div className="flex items-start justify-between gap-4">
						<div>
							<p className="text-xs font-medium uppercase tracking-[0.24em] text-[var(--ink-soft)]">Account</p>
							<h3 className="mt-2 text-3xl font-semibold text-[var(--ink)]">{t.settings.editProfile}</h3>
						</div>
						<div className="flex h-14 w-14 items-center justify-center rounded-[8px] bg-[var(--accent)] text-white">
							<Sparkles className="h-6 w-6" />
						</div>
					</div>

					<form className="mt-6 space-y-4" onSubmit={formik.handleSubmit}>
						<CustomTextInput
							id="first_name"
							type="text"
							value={formik.values.first_name}
							onChange={formik.handleChange('first_name')}
							onBlur={formik.handleBlur('first_name')}
							helperText={formik.touched.first_name ? formik.errors.first_name : ''}
							error={formik.touched.first_name && Boolean(formik.errors.first_name)}
							fullWidth={true}
							label={t.users.lastName}
							placeholder={t.users.lastName}
							startIcon={<UserRound className="h-4 w-4" />}
						/>
						<CustomTextInput
							id="last_name"
							type="text"
							value={formik.values.last_name}
							onChange={formik.handleChange('last_name')}
							onBlur={formik.handleBlur('last_name')}
							helperText={formik.touched.last_name ? formik.errors.last_name : ''}
							error={formik.touched.last_name && Boolean(formik.errors.last_name)}
							fullWidth={true}
							label={t.users.firstName}
							placeholder={t.users.firstName}
							startIcon={<UserRound className="h-4 w-4" />}
						/>
						<CustomDropDownSelect
							id="gender"
							label={t.users.gender}
							items={genderItemsList(t)}
							onChange={(e) => formik.setFieldValue('gender', e.target.value)}
							onBlur={formik.handleBlur('gender')}
							value={formik.values.gender}
							error={formik.touched.gender && Boolean(formik.errors.gender)}
							helperText={formik.touched.gender ? formik.errors.gender : ''}
							startIcon={<UserRound className="h-4 w-4" />}
						/>
						<PrimaryLoadingButton
							buttonText={t.common.update}
							active={!isPending}
							onClick={formik.handleSubmit}
							type="submit"
							startIcon={<PencilLine className="h-4 w-4" />}
							loading={isPending}
						/>
					</form>
				</section>
			</div>
		</div>
	);
};

const EditProfilClient: React.FC<SessionProps> = ({ session }) => {
	const token = useInitAccessToken(session);
	const { t } = useLanguage();

	return (
		<NavigationBar title={t.settings.editProfile}>
			<main className="min-h-[calc(100vh-120px)]">
				<FormikContent token={token} />
			</main>
		</NavigationBar>
	);
};

export default EditProfilClient;
