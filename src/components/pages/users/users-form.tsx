'use client';

import React, { useMemo, useState } from 'react';
import type { ApiErrorResponseType, ResponseDataInterface, SessionProps } from '@/types/_initTypes';
import NavigationBar from '@/components/layouts/navigationBar/navigationBar';
import {
	ArrowLeft,
	BadgeCheck,
	Mail,
	PencilLine,
	Plus,
	Shield,
	TriangleAlert,
	UserRound,
	Users,
} from 'lucide-react';
import { useFormik } from 'formik';
import { toFormikValidationSchema } from 'zod-formik-adapter';
import CustomTextInput from '@/components/formikElements/customTextInput/customTextInput';
import CustomDropDownSelect from '@/components/formikElements/customDropDownSelect/customDropDownSelect';
import PrimaryLoadingButton from '@/components/htmlElements/buttons/primaryLoadingButton/primaryLoadingButton';
import ApiProgress from '@/components/formikElements/apiLoading/apiProgress/apiProgress';
import ApiAlert from '@/components/formikElements/apiLoading/apiAlert/apiAlert';
import { userSchema } from '@/utils/formValidationSchemas';
import { genderItemsList } from '@/utils/rawData';
import { setFormikAutoErrors } from '@/utils/helpers';
import { USERS_LIST, USERS_VIEW } from '@/utils/routes';
import { useRouter } from 'next/navigation';
import CustomSquareImageUploading from '@/components/formikElements/customSquareImageUploading/customSquareImageUploading';
import { useToast, useLanguage } from '@/utils/hooks';
import {
	useAddUserMutation,
	useCheckEmailMutation,
	useEditUserMutation,
	useGetUserQuery,
} from '@/store/services/account';
import { useInitAccessToken } from '@/contexts/InitContext';
import { Protected } from '@/components/layouts/protected/protected';

interface UserFormValues {
	first_name: string;
	last_name: string;
	email: string;
	gender: string;
	role: 'manager' | 'designer';
	is_active: boolean;
	is_staff: boolean;
	can_view: boolean;
	can_print: boolean;
	can_create: boolean;
	can_edit: boolean;
	can_delete: boolean;
	avatar: string | ArrayBuffer | null;
	avatar_cropped: string | ArrayBuffer | null;
	globalError: string;
}

type FormikContentProps = {
	token: string | undefined;
	id?: number;
};

const normalizeGenderValue = (value?: string | null) => (value === 'Homme' ? 'H' : value === 'Femme' ? 'F' : value ?? '');

const ToggleRow = ({
	label,
	name,
	checked,
	onChange,
}: {
	label: string;
	name: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
}) => (
	<label className="flex items-center justify-between gap-4 rounded-[8px] border border-[color:var(--line)] bg-white px-4 py-3">
		<span className="text-sm font-medium text-[var(--ink)]">{label}</span>
		<input
			id={name}
			name={name}
			type="checkbox"
			checked={checked}
			onChange={(event) => onChange(event.target.checked)}
			className="h-4 w-4 rounded border-[color:var(--line-strong)] accent-[var(--accent)]"
		/>
	</label>
);

const FormikContent: React.FC<FormikContentProps> = ({ token, id }) => {
	const { onSuccess, onError } = useToast();
	const { t } = useLanguage();
	const isEditMode = id !== undefined;
	const router = useRouter();

	const {
		data: rawData,
		isLoading: isDataLoading,
		error: dataError,
	} = useGetUserQuery({ id: id! }, { skip: !token || !isEditMode });

	const [addUser, { isLoading: isAddLoading, error: addError }] = useAddUserMutation();
	const [checkEmail, { isLoading: isCheckEmailLoading, error: checkEmailError }] = useCheckEmailMutation();
	const [editUser, { isLoading: isEditLoading, error: editError }] = useEditUserMutation();

	const error = checkEmailError || (isEditMode ? dataError || editError : addError);
	const axiosError: ResponseDataInterface<ApiErrorResponseType> | undefined = useMemo(() => {
		return error ? (error as ResponseDataInterface<ApiErrorResponseType>) : undefined;
	}, [error]);

	const [isPending, setIsPending] = useState(false);
	const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

	const formik = useFormik<UserFormValues>({
		initialValues: {
			first_name: rawData?.first_name ?? '',
			last_name: rawData?.last_name ?? '',
			email: rawData?.email ?? '',
			gender: normalizeGenderValue(rawData?.gender) || 'H',
			role: rawData?.role ?? 'designer',
			is_active: rawData?.is_active ?? true,
			is_staff: rawData?.is_staff ?? false,
			can_view: rawData?.can_view ?? false,
			can_print: rawData?.can_print ?? false,
			can_create: rawData?.can_create ?? false,
			can_edit: rawData?.can_edit ?? false,
			can_delete: rawData?.can_delete ?? false,
			avatar: rawData?.avatar ?? '',
			avatar_cropped: rawData?.avatar_cropped ?? '',
			globalError: '',
		},
		enableReinitialize: true,
		validateOnMount: true,
		validationSchema: toFormikValidationSchema(userSchema),
		onSubmit: async (data, { setFieldError }) => {
			setHasAttemptedSubmit(true);
			setIsPending(true);
			const { globalError, ...fields } = data;
			void globalError;
			try {
				if (rawData?.email !== data.email) {
					await checkEmail({ email: data.email }).unwrap();
				}
				if (isEditMode) {
					await editUser({ id: id!, data: fields }).unwrap();
					onSuccess(t.users.userUpdatedSuccess);
					router.push(USERS_VIEW(id!));
				} else {
					await addUser({ data: fields }).unwrap();
					onSuccess(t.users.userCreatedSuccess);
					router.push(USERS_LIST);
				}
			} catch (e) {
				onError(isEditMode ? t.users.userUpdateError : t.users.userCreateError);
				setFormikAutoErrors({ e, setFieldError });
			} finally {
				setIsPending(false);
			}
		},
	});

	const fieldLabels: Record<string, string> = {
		email: t.users.email,
		first_name: t.users.firstName,
		last_name: t.users.lastName,
		gender: t.users.gender,
		role: t.users.role,
		is_active: t.users.activeAccount,
		is_staff: t.users.adminAccount,
		can_view: t.users.canView,
		can_print: t.users.canPrint,
		can_create: t.users.canCreate,
		can_edit: t.users.canEdit,
		can_delete: t.users.canDelete,
	};

	const validationErrors = hasAttemptedSubmit
		? Object.entries(formik.errors).filter(([key, value]) => key !== 'globalError' && typeof value === 'string')
		: [];

	const isLoading = isAddLoading || isCheckEmailLoading || isEditLoading || isPending || (isEditMode && isDataLoading);
	const shouldShowError = (axiosError?.status ?? 0) > 400 && !isLoading;

	return (
		<div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
			<div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<button
					type="button"
					onClick={() => router.push(USERS_LIST)}
					className="app-pill inline-flex items-center gap-2 border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-medium text-[var(--ink)]"
				>
					<ArrowLeft className="h-4 w-4" />
					<span>{t.navigation.usersList}</span>
				</button>
			</div>

			{validationErrors.length > 0 ? (
				<div className="mb-5 rounded-[8px] border border-red-200 bg-red-50 p-5">
					<div className="flex items-center gap-2 text-red-700">
						<TriangleAlert className="h-5 w-5" />
						<p className="font-semibold">{t.users.validationErrorsDetected}</p>
					</div>
					<ul className="mt-3 space-y-2 text-sm text-red-600">
						{validationErrors.map(([key, err]) => (
							<li key={key}>
								{fieldLabels[key] ?? key}: {err}
							</li>
						))}
					</ul>
				</div>
			) : null}

			{formik.errors.globalError ? <span className="text-sm text-red-600">{formik.errors.globalError}</span> : null}

			{isLoading ? (
				<ApiProgress backdropColor="#FFFFFF" circularColor="#111827" />
			) : shouldShowError ? (
				<ApiAlert errorDetails={axiosError?.data.details} />
			) : (
				<form onSubmit={formik.handleSubmit} className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
					<section className="space-y-5">
						<div className="app-card border border-[color:var(--line-strong)] bg-[var(--surface-muted)] p-6">
							<div className="flex items-center gap-3">
								<div className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-[var(--accent)] text-white">
									<UserRound className="h-5 w-5" />
								</div>
								<div>
									<p className="text-xs font-medium uppercase tracking-[0.24em] text-[var(--ink-soft)]">User</p>
									<h2 className="text-xl font-semibold text-[var(--ink)]">
										{isEditMode ? t.users.editUser : t.users.createUser}
									</h2>
								</div>
							</div>
							<div className="mt-6 flex justify-center">
								<CustomSquareImageUploading
									image={formik.values.avatar}
									croppedImage={formik.values.avatar_cropped}
									onChange={(img) => formik.setFieldValue('avatar', img)}
									onCrop={(cropped) => formik.setFieldValue('avatar_cropped', cropped)}
								/>
							</div>
						</div>

						<div className="app-card border border-[color:var(--line-strong)] bg-white p-6">
							<div className="flex items-center gap-3">
								<BadgeCheck className="h-5 w-5 text-[var(--ink)]" />
								<h3 className="text-lg font-semibold text-[var(--ink)]">{t.users.accountSettings}</h3>
							</div>
							<div className="mt-4 space-y-3">
								<ToggleRow
									label={t.users.activeAccount}
									name="is_active"
									checked={formik.values.is_active}
									onChange={(checked) => formik.setFieldValue('is_active', checked)}
								/>
								<ToggleRow
									label={t.users.adminAccount}
									name="is_staff"
									checked={formik.values.is_staff}
									onChange={(checked) => formik.setFieldValue('is_staff', checked)}
								/>
							</div>
						</div>
					</section>

					<section className="space-y-5">
						<div className="app-card border border-[color:var(--line-strong)] bg-white p-6 sm:p-8">
							<div className="flex items-center gap-3">
								<Mail className="h-5 w-5 text-[var(--ink)]" />
								<h3 className="text-lg font-semibold text-[var(--ink)]">{t.users.personalInfo}</h3>
							</div>
							<div className="mt-5 grid gap-4 md:grid-cols-2">
								<div className="md:col-span-2">
									<CustomTextInput
										id="email"
										type="email"
										label={`${t.users.email} *`}
										disabled={isEditMode}
										value={formik.values.email}
										onChange={formik.handleChange('email')}
										onBlur={formik.handleBlur('email')}
										error={formik.touched.email && Boolean(formik.errors.email)}
										helperText={formik.touched.email ? formik.errors.email : ''}
										fullWidth={true}
										startIcon={<Mail className="h-4 w-4" />}
									/>
								</div>
								<CustomTextInput
									id="first_name"
									type="text"
									label={`${t.users.firstName} *`}
									value={formik.values.first_name}
									onChange={formik.handleChange('first_name')}
									onBlur={formik.handleBlur('first_name')}
									error={formik.touched.first_name && Boolean(formik.errors.first_name)}
									helperText={formik.touched.first_name ? formik.errors.first_name : ''}
									fullWidth={true}
									startIcon={<UserRound className="h-4 w-4" />}
								/>
								<CustomTextInput
									id="last_name"
									type="text"
									label={`${t.users.lastName} *`}
									value={formik.values.last_name}
									onChange={formik.handleChange('last_name')}
									onBlur={formik.handleBlur('last_name')}
									error={formik.touched.last_name && Boolean(formik.errors.last_name)}
									helperText={formik.touched.last_name ? formik.errors.last_name : ''}
									fullWidth={true}
									startIcon={<UserRound className="h-4 w-4" />}
								/>
								<div className="md:col-span-2">
									<CustomDropDownSelect
										id="gender"
										label={`${t.users.gender} *`}
										items={genderItemsList(t)}
										value={formik.values.gender}
										onChange={(e) => formik.setFieldValue('gender', e.target.value)}
										onBlur={formik.handleBlur('gender')}
										error={formik.touched.gender && Boolean(formik.errors.gender)}
										helperText={formik.touched.gender ? formik.errors.gender : ''}
										startIcon={<Users className="h-4 w-4" />}
									/>
								</div>
								<div className="md:col-span-2">
									<CustomDropDownSelect
										id="role"
										label={`${t.users.role} *`}
										items={[
											{ code: 'designer', value: t.users.designerRole },
											{ code: 'manager', value: t.users.managerRole },
										]}
										value={formik.values.role}
										onChange={(e) => formik.setFieldValue('role', e.target.value)}
										onBlur={formik.handleBlur('role')}
										error={formik.touched.role && Boolean(formik.errors.role)}
										helperText={formik.touched.role ? formik.errors.role : ''}
										startIcon={<Shield className="h-4 w-4" />}
									/>
								</div>
							</div>
						</div>

						<div className="app-card border border-[color:var(--line-strong)] bg-white p-6 sm:p-8">
							<div className="flex items-center gap-3">
								<Shield className="h-5 w-5 text-[var(--ink)]" />
								<h3 className="text-lg font-semibold text-[var(--ink)]">{t.users.permissions}</h3>
							</div>
							<div className="mt-5 grid gap-3 md:grid-cols-2">
								<ToggleRow label={t.users.canView} name="can_view" checked={formik.values.can_view} onChange={(checked) => formik.setFieldValue('can_view', checked)} />
								<ToggleRow label={t.users.canPrint} name="can_print" checked={formik.values.can_print} onChange={(checked) => formik.setFieldValue('can_print', checked)} />
								<ToggleRow label={t.users.canCreate} name="can_create" checked={formik.values.can_create} onChange={(checked) => formik.setFieldValue('can_create', checked)} />
								<ToggleRow label={t.users.canEdit} name="can_edit" checked={formik.values.can_edit} onChange={(checked) => formik.setFieldValue('can_edit', checked)} />
								<ToggleRow label={t.users.canDelete} name="can_delete" checked={formik.values.can_delete} onChange={(checked) => formik.setFieldValue('can_delete', checked)} />
							</div>
						</div>

						<div className="flex justify-end">
							<PrimaryLoadingButton
								type="submit"
								buttonText={isEditMode ? t.users.updateUser : t.users.addUser}
								active={!isPending}
								loading={isPending}
								startIcon={
									isEditMode ? <PencilLine className="h-4 w-4" /> : <Plus className="h-4 w-4" />
								}
								onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
									setHasAttemptedSubmit(true);
									if (!formik.isValid) {
										e.preventDefault();
										void formik.submitForm();
										onError(t.users.fixValidationErrors);
										if (typeof window !== 'undefined') {
											window.scrollTo({ top: 0, behavior: 'smooth' });
										}
									}
								}}
							/>
						</div>
					</section>
				</form>
			)}
		</div>
	);
};

interface Props extends SessionProps {
	id?: number;
}

const UsersFormClient: React.FC<Props> = ({ session, id }) => {
	const token = useInitAccessToken(session);
	const isEditMode = id !== undefined;
	const { t } = useLanguage();

	return (
		<NavigationBar title={isEditMode ? t.users.editUser : t.users.createUser}>
			<main className="min-h-[calc(100vh-120px)]">
				<Protected>
					<FormikContent token={token} id={id} />
				</Protected>
			</main>
		</NavigationBar>
	);
};

export default UsersFormClient;
