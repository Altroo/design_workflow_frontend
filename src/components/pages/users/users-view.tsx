'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ApiErrorResponseType, ResponseDataInterface, SessionProps } from '@/types/_initTypes';
import { useInitAccessToken } from '@/contexts/InitContext';
import { useGetUserQuery, useDeleteUserMutation } from '@/store/services/account';
import NavigationBar from '@/components/layouts/navigationBar/navigationBar';
import {
	ArrowLeft,
	CalendarClock,
	Mail,
	PencilLine,
	Shield,
	Trash2,
} from 'lucide-react';
import { USERS_LIST, USERS_EDIT } from '@/utils/routes';
import ApiProgress from '@/components/formikElements/apiLoading/apiProgress/apiProgress';
import { formatDate, extractApiErrorMessage } from '@/utils/helpers';
import { useToast, useLanguage } from '@/utils/hooks';
import ActionModals from '@/components/htmlElements/modals/actionModal/actionModals';
import { Protected } from '@/components/layouts/protected/protected';
import ApiAlert from '@/components/formikElements/apiLoading/apiAlert/apiAlert';

interface InfoRowProps {
	label: string;
	value: string | number | null | undefined;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => (
	<div className="flex flex-col gap-1 rounded-[8px] border border-[color:var(--line)] bg-white px-4 py-3 shadow-[var(--shadow-sm)]">
		<span className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--ink-soft)]">{label}</span>
		<span className="text-sm font-medium text-[var(--ink)]">{value && String(value).length > 0 ? value : '-'}</span>
	</div>
);

const BoolBadge = ({ value, yes, no }: { value?: boolean; yes: string; no: string }) => (
	<span
		className={[
			'inline-flex rounded-full px-3 py-1 text-xs font-semibold',
			value ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-muted)] text-[var(--ink)]',
		].join(' ')}
	>
		{value ? yes : no}
	</span>
);

interface Props extends SessionProps {
	id: number;
}

const UsersViewClient: React.FC<Props> = ({ session, id }) => {
	const router = useRouter();
	const token = useInitAccessToken(session);
	const { data: userData, isLoading, error } = useGetUserQuery({ id }, { skip: !token });
	const axiosError = useMemo(
		() => (error ? (error as ResponseDataInterface<ApiErrorResponseType>) : undefined),
		[error],
	);

	const [deleteRecord] = useDeleteUserMutation();
	const { onSuccess, onError } = useToast();
	const { t } = useLanguage();
	const [showDeleteModal, setShowDeleteModal] = useState(false);

	const handleDelete = async () => {
		try {
			await deleteRecord({ id }).unwrap();
			onSuccess(t.users.userDeletedSuccess);
			router.push(USERS_LIST);
		} catch (err) {
			onError(extractApiErrorMessage(err, t.users.userDeleteError));
		} finally {
			setShowDeleteModal(false);
		}
	};

	const initials = `${userData?.first_name?.[0] ?? ''}${userData?.last_name?.[0] ?? ''}`.trim() || 'U';

	return (
		<div className="min-h-screen">
			<NavigationBar title={t.users.userDetails}>
				<Protected>
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
							{!isLoading && !error && userData ? (
								<div className="flex flex-wrap gap-2">
									<button
										type="button"
										onClick={() => router.push(USERS_EDIT(id))}
										className="app-pill inline-flex items-center gap-2 border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-medium text-[var(--ink)]"
									>
										<PencilLine className="h-4 w-4" />
										<span>{t.common.edit}</span>
									</button>
									<button
										type="button"
										onClick={() => setShowDeleteModal(true)}
										className="app-pill inline-flex items-center gap-2 border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-medium text-[var(--ink)]"
									>
										<Trash2 className="h-4 w-4" />
										<span>{t.common.delete}</span>
									</button>
								</div>
							) : null}
						</div>

						{isLoading ? (
							<ApiProgress backdropColor="#FFFFFF" circularColor="var(--accent)" />
						) : (axiosError?.status as number) > 400 ? (
							<ApiAlert errorDetails={axiosError?.data.details} />
						) : !userData ? (
							<div className="app-card border border-[color:var(--line)] bg-white p-6 text-sm text-[var(--ink-soft)]">
								{t.users.userNotFound}
							</div>
						) : (
							<div className="space-y-5">
								<section className="app-card border border-[color:var(--line-strong)] bg-white p-6 sm:p-8">
									<div className="flex flex-col gap-5 sm:flex-row sm:items-center">
										<div className="flex h-24 w-24 items-center justify-center rounded-[8px] bg-[var(--accent)] text-2xl font-semibold text-white">
											{initials}
										</div>
										<div className="flex-1">
											<p className="text-xs font-medium uppercase tracking-[0.24em] text-[var(--ink-soft)]">
												{t.users.userDetails}
											</p>
											<h2 className="mt-2 text-3xl font-semibold text-[var(--ink)]">
												{[userData.first_name, userData.last_name].filter(Boolean).join(' ') || userData.email}
											</h2>
											<div className="mt-3 flex flex-wrap gap-2">
												<span className="app-pill border border-[color:var(--line)] bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--ink)]">
													ID: {userData.id}
												</span>
												<BoolBadge value={userData.is_staff} yes={t.users.admin} no={t.common.no} />
												<BoolBadge value={userData.is_active} yes={t.users.active} no={t.users.inactive} />
											</div>
										</div>
									</div>
								</section>

								<section className="grid gap-5 lg:grid-cols-2">
									<div className="app-card border border-[color:var(--line-strong)] bg-white p-6">
										<div className="mb-4 flex items-center gap-3">
											<Mail className="h-5 w-5 text-[var(--ink)]" />
											<h3 className="text-lg font-semibold text-[var(--ink)]">{t.users.generalInfo}</h3>
										</div>
										<div className="grid gap-3">
											<InfoRow label={t.users.email} value={userData.email} />
											<InfoRow label={t.users.gender} value={userData.gender} />
											<InfoRow label={t.users.admin} value={userData.is_staff ? t.common.yes : t.common.no} />
											<InfoRow label={t.users.active} value={userData.is_active ? t.common.yes : t.common.no} />
										</div>
									</div>

									<div className="app-card border border-[color:var(--line-strong)] bg-white p-6">
										<div className="mb-4 flex items-center gap-3">
											<CalendarClock className="h-5 w-5 text-[var(--ink)]" />
											<h3 className="text-lg font-semibold text-[var(--ink)]">Timeline</h3>
										</div>
										<div className="grid gap-3">
											<InfoRow label={t.users.registrationDate} value={formatDate(userData.date_joined)} />
											<InfoRow label={t.users.lastUpdate} value={formatDate(userData.date_updated)} />
											<InfoRow label={t.users.lastLogin} value={formatDate(userData.last_login)} />
										</div>
									</div>
								</section>

								<section className="app-card border border-[color:var(--line-strong)] bg-white p-6">
									<div className="mb-4 flex items-center gap-3">
										<Shield className="h-5 w-5 text-[var(--ink)]" />
										<h3 className="text-lg font-semibold text-[var(--ink)]">{t.users.permissions}</h3>
									</div>
									<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
										<InfoRow label={t.users.canView} value={userData.can_view ? t.common.yes : t.common.no} />
										<InfoRow label={t.users.canPrint} value={userData.can_print ? t.common.yes : t.common.no} />
										<InfoRow label={t.users.canCreate} value={userData.can_create ? t.common.yes : t.common.no} />
										<InfoRow label={t.users.canEdit} value={userData.can_edit ? t.common.yes : t.common.no} />
										<InfoRow label={t.users.canDelete} value={userData.can_delete ? t.common.yes : t.common.no} />
									</div>
								</section>
							</div>
						)}
					</div>
				</Protected>
			</NavigationBar>
			{showDeleteModal ? (
				<ActionModals
					title={t.users.deleteUser}
					body={t.users.deleteUserConfirm}
					actions={[
						{
							text: t.common.cancel,
							active: false,
							onClick: () => setShowDeleteModal(false),
							icon: <ArrowLeft className="h-4 w-4" />,
							color: 'var(--ink-soft)',
						},
						{
							text: t.common.delete,
							active: true,
							onClick: handleDelete,
							icon: <Trash2 className="h-4 w-4" />,
							color: 'var(--accent)',
						},
					]}
					titleIcon={<Trash2 className="h-5 w-5" />}
					titleIconColor="var(--accent)"
				/>
			) : null}
		</div>
	);
};

export default UsersViewClient;
