'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Eye, PencilLine, Plus, Search, ShieldCheck, Trash2, Users, XCircle } from 'lucide-react';
import { useInitAccessToken } from '@/contexts/InitContext';
import NavigationBar from '@/components/layouts/navigationBar/navigationBar';
import { useDeleteUserMutation, useGetUsersListQuery, useBulkDeleteUsersMutation } from '@/store/services/account';
import { USERS_VIEW, USERS_EDIT, USERS_ADD } from '@/utils/routes';
import type { PaginationResponseType, SessionProps } from '@/types/_initTypes';
import ActionModals from '@/components/htmlElements/modals/actionModal/actionModals';
import type { UserClass } from '@/models/classes';
import { formatDate, extractApiErrorMessage } from '@/utils/helpers';
import { Protected } from '@/components/layouts/protected/protected';
import { useToast, useLanguage } from '@/utils/hooks';
import ApiAlert from '@/components/formikElements/apiLoading/apiAlert/apiAlert';
import ApiProgress from '@/components/formikElements/apiLoading/apiProgress/apiProgress';

const DANGER_COLOR = '#ef4444';

const resolveMediaUrl = (value?: string | ArrayBuffer | null) => {
	if (typeof value !== 'string' || !value) return null;
	if (value.startsWith('data:') || value.startsWith('blob:') || /^https?:\/\//.test(value)) return value;
	const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
	return `${apiUrl}${value.startsWith('/') ? value : `/${value}`}`;
};

const UsersListClient: React.FC<SessionProps> = ({ session }) => {
	const router = useRouter();
	const { onSuccess, onError } = useToast();
	const { t } = useLanguage();
	const token = useInitAccessToken(session);

	const [paginationModel, setPaginationModel] = useState<{ page: number; pageSize: number }>({
		page: 0,
		pageSize: 10,
	});
	const [searchTerm, setSearchTerm] = useState('');
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
	const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
	const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

	const {
		data: rawData,
		isLoading,
		error,
		refetch,
	} = useGetUsersListQuery(
		{
			with_pagination: true,
			page: paginationModel.page + 1,
			pageSize: paginationModel.pageSize,
			search: searchTerm,
		},
		{ skip: !token },
	);

	const data = rawData as PaginationResponseType<UserClass> | undefined;
	const [deleteRecord] = useDeleteUserMutation();
	const [bulkDeleteUsers] = useBulkDeleteUsersMutation();

	const rows = data?.results ?? [];
	const totalUsers = data?.count ?? 0;
	const activeUsers = rows.filter((user) => user.is_active).length;
	const adminUsers = rows.filter((user) => user.is_staff).length;
	const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / paginationModel.pageSize));
	const allVisibleSelected = rows.length > 0 && rows.every((user) => selectedUserIds.includes(user.id));

	const pageLabel = useMemo(() => `${paginationModel.page + 1} / ${totalPages}`, [paginationModel.page, totalPages]);

	const deleteHandler = async () => {
		try {
			await deleteRecord({ id: selectedUserId! }).unwrap();
			onSuccess(t.users.userDeletedSuccess);
			refetch();
		} catch (err) {
			onError(extractApiErrorMessage(err, t.users.userDeleteError));
		} finally {
			setShowDeleteModal(false);
		}
	};

	const bulkDeleteHandler = async () => {
		try {
			await bulkDeleteUsers({ ids: selectedUserIds }).unwrap();
			onSuccess(t.users.bulkUserDeletedSuccess(selectedUserIds.length));
		} catch (err) {
			onError(extractApiErrorMessage(err, t.users.userDeleteError));
		} finally {
			setSelectedUserIds([]);
			setShowBulkDeleteModal(false);
			refetch();
		}
	};

	const toggleVisibleRows = () => {
		if (allVisibleSelected) {
			setSelectedUserIds((prev) => prev.filter((id) => !rows.some((user) => user.id === id)));
			return;
		}

		setSelectedUserIds((prev) => {
			const next = new Set(prev);
			rows.forEach((user) => next.add(user.id));
			return Array.from(next);
		});
	};

	const initialsFor = (user: UserClass) =>
		(`${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.trim() || user.email?.[0] || 'U').toUpperCase();

	const fullNameFor = (user: UserClass) => [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email;

	const userAvatar = (user: UserClass) => {
		const avatarUrl = resolveMediaUrl(user.avatar_cropped || user.avatar);
		return (
			<div className="workflow-users-avatar">
				{avatarUrl ? (
					<Image src={avatarUrl} alt={fullNameFor(user)} width={42} height={42} unoptimized className="h-full w-full object-cover" />
				) : (
					<span>{initialsFor(user)}</span>
				)}
			</div>
		);
	};

	const statusIcon = (enabled: boolean, label: string) => (
		<span className="workflow-users-status-icon" data-active={enabled} title={label} aria-label={label}>
			{enabled ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
		</span>
	);

	return (
		<div className="min-h-screen">
			<NavigationBar title={t.navigation.usersList}>
				<Protected>
					<div className="workflow-users-shell">
						<div className="workflow-users-hero">
							<div>
								<p>{t.users.usersStudio}</p>
								<h1>{t.navigation.usersList}</h1>
								<span>{t.users.usersListDescription}</span>
							</div>
							<div className="workflow-users-hero-actions">
								<button type="button" onClick={() => router.push(USERS_ADD)} className="app-button">
									<Plus className="h-4 w-4" />
									<span>{t.users.newUser}</span>
								</button>
								{selectedUserIds.length > 0 ? (
									<button
										type="button"
										onClick={() => setShowBulkDeleteModal(true)}
										className="workflow-users-danger-outline"
									>
										<Trash2 className="h-4 w-4" />
										<span>
											{t.common.delete} ({selectedUserIds.length})
										</span>
									</button>
								) : null}
							</div>
						</div>

						<div className="workflow-users-metrics">
							<div className="workflow-users-metric" data-tone="indigo">
								<Users size={18} />
								<span>{t.users.totalUsers}</span>
								<strong>{totalUsers}</strong>
							</div>
							<div className="workflow-users-metric" data-tone="green">
								<CheckCircle2 size={18} />
								<span>{t.users.activeUsers}</span>
								<strong>{activeUsers}</strong>
							</div>
							<div className="workflow-users-metric" data-tone="cyan">
								<ShieldCheck size={18} />
								<span>{t.users.adminUsers}</span>
								<strong>{adminUsers}</strong>
							</div>
							<div className="workflow-users-metric" data-tone="rose">
								<Trash2 size={18} />
								<span>{t.users.selectedUsers}</span>
								<strong>{selectedUserIds.length}</strong>
							</div>
						</div>

						<div className="workflow-users-board">
							<div className="workflow-users-board-head">
								<div>
									<p>{t.users.usersRegister}</p>
									<h2>{t.navigation.usersList}</h2>
								</div>
								<span>{totalUsers} {t.users.totalUsers}</span>
							</div>
							<div className="workflow-users-toolbar">
								<div className="relative w-full max-w-md">
									<Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-(--ink-soft)" />
									<input
										value={searchTerm}
										onChange={(event) => {
											setSearchTerm(event.target.value);
											setPaginationModel((prev) => ({ ...prev, page: 0 }));
										}}
										placeholder={t.users.searchUsers}
										className="app-input w-full pl-11"
									/>
								</div>
								<div className="flex flex-wrap items-center gap-2">
									<button
										type="button"
										onClick={toggleVisibleRows}
										className="app-pill inline-flex items-center gap-2 border border-[color:var(--line)] bg-(--surface-muted) px-4 py-2 text-sm font-medium text-(--ink)"
									>
										<Users className="h-4 w-4" />
										<span>{allVisibleSelected ? t.users.unselectPage : t.users.selectPage}</span>
									</button>
									<span className="workflow-users-page-pill">{t.users.page} {pageLabel}</span>
									<button
										type="button"
										onClick={() =>
											setPaginationModel((prev) => ({ ...prev, page: Math.max(0, prev.page - 1) }))
										}
										disabled={paginationModel.page <= 0}
										className="app-pill border border-[color:var(--line)] px-3 py-2 text-sm disabled:opacity-50"
									>
										{t.users.previous}
									</button>
									<button
										type="button"
										onClick={() =>
											setPaginationModel((prev) => ({ ...prev, page: Math.min(totalPages - 1, prev.page + 1) }))
										}
										disabled={paginationModel.page >= totalPages - 1}
										className="app-pill border border-[color:var(--line)] px-3 py-2 text-sm disabled:opacity-50"
									>
										{t.users.next}
									</button>
								</div>
							</div>

							<div className="workflow-users-table-wrap">
								{isLoading ? (
									<ApiProgress backdropColor="#FFFFFF" circularColor="var(--accent)" />
								) : error ? (
									<ApiAlert errorDetails={undefined} />
								) : (
									<table className="workflow-users-table min-w-full text-left text-sm">
										<thead className="border-b border-[color:var(--line)] text-(--ink-soft)">
											<tr>
												<th className="px-4 py-3">
													<input type="checkbox" checked={allVisibleSelected} onChange={toggleVisibleRows} className="app-check" />
												</th>
												<th className="px-4 py-3 font-medium">{t.users.user}</th>
												<th className="px-4 py-3 font-medium">{t.users.email}</th>
												<th className="px-4 py-3 font-medium">{t.users.gender}</th>
												<th className="px-4 py-3 font-medium">{t.users.active}</th>
												<th className="px-4 py-3 font-medium">{t.users.admin}</th>
												<th className="px-4 py-3 font-medium">{t.users.registrationDate}</th>
												<th className="px-4 py-3 font-medium">{t.common.actions}</th>
											</tr>
										</thead>
										<tbody>
											{rows.map((user) => {
												const checked = selectedUserIds.includes(user.id);
												return (
													<tr key={user.id} className="border-b border-[color:var(--line)] last:border-b-0 hover:bg-(--surface-muted)">
														<td className="px-4 py-4">
															<input
																type="checkbox"
																checked={checked}
																className="app-check"
																onChange={(event) => {
																	setSelectedUserIds((prev) =>
																		event.target.checked
																			? [...prev, user.id]
																			: prev.filter((id) => id !== user.id),
																	);
																}}
															/>
														</td>
														<td className="px-4 py-4">
															<div className="workflow-users-person">
																{userAvatar(user)}
																<div className="min-w-0">
																	<p className="font-medium text-(--ink)">
																		{fullNameFor(user)}
																	</p>
																	<p className="text-xs text-(--ink-soft)">#{user.id}</p>
																</div>
															</div>
														</td>
														<td className="px-4 py-4 text-(--ink)">{user.email}</td>
														<td className="px-4 py-4 text-(--ink)">{user.gender || '-'}</td>
														<td className="px-4 py-4">
															{statusIcon(user.is_active, user.is_active ? t.common.yes : t.common.no)}
														</td>
														<td className="px-4 py-4">
															{statusIcon(user.is_staff, user.is_staff ? t.common.yes : t.common.no)}
														</td>
														<td className="px-4 py-4 text-(--ink-soft)">{formatDate(user.date_joined)}</td>
														<td className="px-4 py-4">
															<div className="workflow-users-row-actions">
																<button
																	type="button"
																	onClick={() => router.push(USERS_VIEW(user.id))}
																	className="workflow-users-icon-button"
																	title={t.common.view}
																	aria-label={t.common.view}
																>
																	<Eye className="h-4 w-4" />
																</button>
																<button
																	type="button"
																	onClick={() => router.push(USERS_EDIT(user.id))}
																	className="workflow-users-icon-button"
																	title={t.common.edit}
																	aria-label={t.common.edit}
																>
																	<PencilLine className="h-4 w-4" />
																</button>
																<button
																	type="button"
																	onClick={() => {
																		setSelectedUserId(user.id);
																		setShowDeleteModal(true);
																	}}
																	className="workflow-users-icon-button workflow-users-icon-button-danger"
																	title={t.common.delete}
																	aria-label={t.common.delete}
																>
																	<Trash2 className="h-4 w-4" />
																</button>
															</div>
														</td>
													</tr>
												);
											})}
											{rows.length === 0 ? (
												<tr>
													<td colSpan={8} className="px-4 py-12 text-center text-sm text-(--ink-soft)">
														{t.users.noUsersFound}
													</td>
												</tr>
											) : null}
										</tbody>
									</table>
								)}
							</div>
							<div className="workflow-users-mobile-list">
								{isLoading ? (
									<ApiProgress backdropColor="#FFFFFF" circularColor="var(--accent)" />
								) : error ? (
									<ApiAlert errorDetails={undefined} />
								) : rows.length ? (
									rows.map((user) => {
										const checked = selectedUserIds.includes(user.id);
										return (
											<article key={user.id} className="workflow-users-mobile-card">
												<div className="workflow-users-mobile-card-head">
													<input
														type="checkbox"
														checked={checked}
														className="app-check"
														onChange={(event) => {
															setSelectedUserIds((prev) =>
																event.target.checked ? [...prev, user.id] : prev.filter((id) => id !== user.id),
															);
														}}
													/>
													{userAvatar(user)}
													<div className="min-w-0">
														<h3>{fullNameFor(user)}</h3>
														<p>{user.email}</p>
													</div>
												</div>
												<div className="workflow-users-mobile-meta">
													<span>{t.users.gender}: <b>{user.gender || '-'}</b></span>
													<span>{t.users.active}: <b>{statusIcon(user.is_active, user.is_active ? t.common.yes : t.common.no)}</b></span>
													<span>{t.users.admin}: <b>{statusIcon(user.is_staff, user.is_staff ? t.common.yes : t.common.no)}</b></span>
													<span>{t.users.registrationDate}: <b>{formatDate(user.date_joined)}</b></span>
												</div>
												<div className="workflow-users-mobile-actions">
													<button type="button" onClick={() => router.push(USERS_VIEW(user.id))} className="workflow-users-icon-button" title={t.common.view} aria-label={t.common.view}>
														<Eye className="h-4 w-4" />
													</button>
													<button type="button" onClick={() => router.push(USERS_EDIT(user.id))} className="workflow-users-icon-button" title={t.common.edit} aria-label={t.common.edit}>
														<PencilLine className="h-4 w-4" />
													</button>
													<button
														type="button"
														onClick={() => {
															setSelectedUserId(user.id);
															setShowDeleteModal(true);
														}}
														className="workflow-users-icon-button workflow-users-icon-button-danger"
														title={t.common.delete}
														aria-label={t.common.delete}
													>
														<Trash2 className="h-4 w-4" />
													</button>
												</div>
											</article>
										);
									})
								) : (
									<div className="workflow-users-empty">{t.users.noUsersFound}</div>
								)}
							</div>
						</div>
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
							onClick: deleteHandler,
							icon: <Trash2 className="h-4 w-4" />,
							color: DANGER_COLOR,
						},
					]}
					titleIcon={<Trash2 className="h-5 w-5" />}
					titleIconColor={DANGER_COLOR}
				/>
			) : null}

			{showBulkDeleteModal ? (
				<ActionModals
					title={t.users.deleteUsers(selectedUserIds.length)}
					body={t.users.bulkDeleteUserBody(selectedUserIds.length)}
					actions={[
						{
							text: t.common.cancel,
							active: false,
							onClick: () => setShowBulkDeleteModal(false),
							icon: <ArrowLeft className="h-4 w-4" />,
							color: 'var(--ink-soft)',
						},
						{
							text: `${t.common.delete} (${selectedUserIds.length})`,
							active: true,
							onClick: bulkDeleteHandler,
							icon: <Trash2 className="h-4 w-4" />,
							color: DANGER_COLOR,
						},
					]}
					titleIcon={<Trash2 className="h-5 w-5" />}
					titleIconColor={DANGER_COLOR}
				/>
			) : null}
		</div>
	);
};

export default UsersListClient;
