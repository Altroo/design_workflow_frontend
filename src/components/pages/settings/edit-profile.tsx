'use client';

import React, { useState } from 'react';
import { Camera, PencilLine, UserRound } from 'lucide-react';
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
		<div className="workflow-user-form-shell workflow-profile-shell">
			{(isEditLoading || isPending || isProfilLoading) && <ApiProgress backdropColor="#FFFFFF" circularColor="var(--accent)" />}
			<div className="workflow-user-form-hero">
				<div>
					<p>{t.settings.profileStudio}</p>
					<h1>{t.navigation.myProfile}</h1>
				</div>
			</div>
			<form className="workflow-user-form-grid workflow-profile-grid" onSubmit={formik.handleSubmit}>
				<section className="workflow-user-form-side">
					<div className="workflow-user-form-panel workflow-user-form-profile">
						<div className="workflow-user-form-panel-head">
							<div className="workflow-user-form-icon">
								<Camera className="h-5 w-5" />
							</div>
							<div>
								<p>{t.settings.identity}</p>
								<h2>{t.settings.profile}</h2>
							</div>
						</div>
						<div className="workflow-user-form-avatar">
							<CustomSquareImageUploading
								image={formik.values.avatar}
								croppedImage={formik.values.avatar_cropped}
								onChange={(img) => formik.setFieldValue('avatar', img)}
								onCrop={(cropped) => formik.setFieldValue('avatar_cropped', cropped)}
							/>
						</div>
					</div>
				</section>

				<section className="workflow-user-form-main">
					<div className="workflow-user-form-panel">
						<div className="workflow-user-form-panel-pill" data-tone="indigo">
							<UserRound className="h-4 w-4" />
							<b>{t.settings.editProfile}</b>
						</div>
						<div className="workflow-profile-fields">
							<CustomTextInput
								id="first_name"
								type="text"
								value={formik.values.first_name}
								onChange={formik.handleChange('first_name')}
								onBlur={formik.handleBlur('first_name')}
								helperText={formik.touched.first_name ? formik.errors.first_name : ''}
								error={formik.touched.first_name && Boolean(formik.errors.first_name)}
								fullWidth={true}
								label={t.users.firstName}
								placeholder={t.users.firstName}
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
								label={t.users.lastName}
								placeholder={t.users.lastName}
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
						</div>
					</div>
					<div className="workflow-user-form-submit">
						<PrimaryLoadingButton
							buttonText={t.common.update}
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
