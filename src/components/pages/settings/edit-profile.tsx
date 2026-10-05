'use client';

import {runWithCleanup} from '@/utils/runWithCleanup';
import {useEffect, useEffectEvent, useRef, useState, type FC} from 'react';
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
import { WorkflowIconPill, WorkflowPageHero } from '@/components/shared/workflow/workflowPrimitives';
import { mergeLiveDraft } from '@/utils/liveDraft';
import type { UserClass } from '@/models/classes';

type FormikContentType = {
	token: string | undefined;
};

const normalizeGenderValue = (value?: string | null) => (value === 'Homme' ? 'H' : value === 'Femme' ? 'F' : value ?? '');

const profileFormValues = (profile?: Partial<UserClass>) => ({
	first_name: profile?.first_name ?? '',
	last_name: profile?.last_name ?? '',
	gender: normalizeGenderValue(profile?.gender),
	avatar: profile?.avatar ?? '',
	avatar_cropped: profile?.avatar_cropped ?? '',
	globalError: '',
});
type ProfileFormValues = ReturnType<typeof profileFormValues>;

const FormikContent: FC<FormikContentType> = ({ token }) => {
	const { onSuccess, onError } = useToast();
	const { t, language } = useLanguage();
	const { data: profilData, isLoading: isProfilLoading } = useGetProfilQuery(undefined, { skip: !token });
	const [editProfil, { isLoading: isEditLoading }] = useEditProfilMutation();
	const dispatch = useAppDispatch();
	const [isPending, setIsPending] = useState(false);
	const serverValues = useRef(profileFormValues(profilData));
	const [conflictedFields, setConflictedFields] = useState<Array<keyof ProfileFormValues>>([]);

	const formik = useFormik({
		initialValues: profileFormValues(profilData),
		enableReinitialize: false,
		validateOnMount: true,
		validationSchema: toFormikValidationSchema(profilSchema),
		onSubmit: async (data, { setFieldError }) => {
			setIsPending(true);
			const { globalError, ...fields } = data;
			void globalError;
			const payload = Object.fromEntries(Object.entries(fields).filter(([key, value]) => value !== serverValues.current[key as keyof ProfileFormValues]));
			await runWithCleanup(
			  async () => {
			    try {
			      const response = await editProfil({data: payload}).unwrap();
			      if (response) {
			        const savedValues = profileFormValues(response);
			        serverValues.current = savedValues;
			        setConflictedFields([]);
			        // Preserve any typing that happened while the save was in flight.
			        void formik.setValues((current) => mergeLiveDraft(current, data, savedValues), false);
			        dispatch(accountEditProfilAction(response));
			        onSuccess(t.settings.updateSuccess);
			      }
			    } catch (e) {
			      onError(t.settings.updateError);
			      setFormikAutoErrors({e, setFieldError});
			    }
			  },
			  () => {
			    setIsPending(false);
			  },
			);
		},
	});

	const refreshServerValues = useEffectEvent(() => {
		if (!profilData) return;
		const next = profileFormValues(profilData);
		const previous = serverValues.current;
		const draft = formik.values;
		const conflicts = (Object.keys(next) as Array<keyof ProfileFormValues>).filter((key) =>
			key !== 'globalError' && next[key] !== previous[key] && draft[key] !== previous[key] && draft[key] !== next[key],
		);
		setConflictedFields((current) => [...new Set([...current, ...conflicts])].filter((key) => draft[key] !== next[key]));
		serverValues.current = next;
		void formik.setValues(mergeLiveDraft(draft, previous, next), false);
	});
	useEffect(() => { refreshServerValues(); }, [profilData]);
	const hasRemoteConflict = conflictedFields.some((key) => formik.values[key] !== profileFormValues(profilData)[key]);

	return (
		<div className="workflow-user-form-shell workflow-profile-shell">
			{(isEditLoading || isPending || isProfilLoading) && <ApiProgress backdropColor="#FFFFFF" circularColor="var(--accent)" />}
			<WorkflowPageHero element="div" className="workflow-user-form-hero" eyebrow={t.settings.profileStudio} title={t.navigation.myProfile} />
			{hasRemoteConflict ? (
				<div role="status" className="workflow-user-form-alert text-sm text-[color:var(--muted)]">
					{language === 'en'
						? 'Your profile was changed elsewhere. Your edits are kept. Check them before saving; saving replaces the changed fields.'
						: 'Votre profil a été modifié ailleurs. Vos saisies sont conservées. Vérifiez-les avant d’enregistrer : les champs modifiés seront remplacés.'}
				</div>
			) : null}
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
								onChange={(img) => void formik.setFieldValue('avatar', img)}
								onCrop={(cropped) => void formik.setFieldValue('avatar_cropped', cropped)}
							/>
						</div>
					</div>
				</section>

				<section className="workflow-user-form-main">
					<div className="workflow-user-form-panel">
						<WorkflowIconPill tone="indigo" icon={<UserRound className="h-4 w-4" />} label={t.settings.editProfile} />
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
								onChange={(e) => void formik.setFieldValue('gender', e.target.value)}
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

const EditProfilClient: FC<SessionProps> = ({ session }) => {
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
