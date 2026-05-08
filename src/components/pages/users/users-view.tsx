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
import { WorkflowIconPill, WorkflowPageHero } from '@/components/shared/workflow/workflowPrimitives';
import { WorkflowAvatar } from '@/components/shared/workflow/workflowAvatar';

interface InfoRowProps {
	label: string;
	value: string | number | null | undefined;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => (
	<div className="workflow-user-detail-info-row">
		<span>{label}</span>
		<strong>{value && String(value).length > 0 ? value : '-'}</strong>
	</div>
);

const BoolBadge = ({ value, yes, no }: { value?: boolean; yes: string; no: string }) => (
	<span className="workflow-user-detail-badge" data-active={value}>
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

	return (
		<div className="min-h-screen">
			<NavigationBar title={t.users.userDetails}>
				<Protected>
					<div className="workflow-user-detail-shell">
						<WorkflowPageHero
							element="div"
							className="workflow-user-detail-hero"
							eyebrow={t.users.usersStudio}
							title={t.users.userDetails}
							description={userData ? ([userData.first_name, userData.last_name].filter(Boolean).join(' ') || userData.email) : undefined}
							actionsClassName="workflow-user-detail-actions"
							actions={
								<>
									<button
										type="button"
										onClick={() => router.push(USERS_LIST)}
										className="workflow-user-detail-back"
									>
										<ArrowLeft className="h-4 w-4" />
										<span>{t.navigation.usersList}</span>
									</button>
									{!isLoading && !error && userData ? (
										<>
											<button
												type="button"
												onClick={() => router.push(USERS_EDIT(id))}
												className="workflow-user-detail-action workflow-user-detail-edit"
											>
												<PencilLine className="h-4 w-4" />
												<span>{t.common.edit}</span>
											</button>
											<button
												type="button"
												onClick={() => setShowDeleteModal(true)}
												className="workflow-user-detail-action workflow-user-detail-delete"
											>
												<Trash2 className="h-4 w-4" />
												<span>{t.common.delete}</span>
											</button>
										</>
									) : null}
								</>
							}
						/>

						{isLoading ? (
							<ApiProgress backdropColor="#FFFFFF" circularColor="var(--accent)" />
						) : (axiosError?.status as number) > 400 ? (
							<ApiAlert errorDetails={axiosError?.data.details} />
						) : !userData ? (
							<div className="workflow-user-detail-empty">
								{t.users.userNotFound}
							</div>
						) : (
							<div className="workflow-user-detail-content">
								<section className="workflow-user-detail-profile-card">
									<div className="workflow-user-detail-profile">
										<WorkflowAvatar
											user={{
												first_name: userData.first_name,
												last_name: userData.last_name,
												email: userData.email,
												avatar: typeof (userData.avatar_cropped || userData.avatar) === 'string' ? (userData.avatar_cropped || userData.avatar) as string : null,
											}}
											size={80}
											avatarClassName="workflow-user-detail-avatar"
											label={[userData.first_name, userData.last_name].filter(Boolean).join(' ') || userData.email}
										/>
										<div className="workflow-user-detail-profile-copy">
											<p>{t.users.userDetails}</p>
											<h2>
												{[userData.first_name, userData.last_name].filter(Boolean).join(' ') || userData.email}
											</h2>
											<div className="workflow-user-detail-badges">
												<span className="workflow-user-detail-badge">
													ID: {userData.id}
												</span>
												<BoolBadge value={userData.is_staff} yes={t.users.admin} no={t.common.no} />
												<BoolBadge value={userData.is_active} yes={t.users.active} no={t.users.inactive} />
											</div>
										</div>
									</div>
								</section>

								<section className="workflow-user-detail-grid">
									<div className="workflow-user-detail-panel">
										<WorkflowIconPill icon={<Mail className="h-4 w-4" />} label={t.users.generalInfo} />
										<div className="workflow-user-detail-info-grid">
											<InfoRow label={t.users.email} value={userData.email} />
											<InfoRow label={t.users.gender} value={userData.gender} />
											<InfoRow label={t.users.admin} value={userData.is_staff ? t.common.yes : t.common.no} />
											<InfoRow label={t.users.active} value={userData.is_active ? t.common.yes : t.common.no} />
										</div>
									</div>

									<div className="workflow-user-detail-panel">
										<WorkflowIconPill icon={<CalendarClock className="h-4 w-4" />} label={t.users.lastUpdate} />
										<div className="workflow-user-detail-info-grid">
											<InfoRow label={t.users.registrationDate} value={formatDate(userData.date_joined)} />
											<InfoRow label={t.users.lastUpdate} value={formatDate(userData.date_updated)} />
											<InfoRow label={t.users.lastLogin} value={formatDate(userData.last_login)} />
										</div>
									</div>
								</section>

								<section className="workflow-user-detail-panel workflow-user-detail-permissions">
									<WorkflowIconPill icon={<Shield className="h-4 w-4" />} label={t.users.permissions} />
									<div className="workflow-user-detail-permission-grid">
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
