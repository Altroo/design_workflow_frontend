'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, PencilLine, Plus, Search, Trash2, Users } from 'lucide-react';
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
		`${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.trim() || user.email?.[0]?.toUpperCase() || 'U';

	return (
		<div className="min-h-screen">
			<NavigationBar title={t.navigation.usersList}>
				<Protected>
					<div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
						<div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
							<div>
								<p className="text-xs font-medium uppercase tracking-[0.24em] text-[var(--ink-soft)]">Admin</p>
								<h2 className="mt-2 text-3xl font-semibold text-[var(--ink)]">{t.navigation.usersList}</h2>
							</div>
							<div className="flex flex-wrap gap-2">
								<button type="button" onClick={() => router.push(USERS_ADD)} className="app-button">
									<Plus className="h-4 w-4" />
									<span>{t.users.newUser}</span>
								</button>
								{selectedUserIds.length > 0 ? (
									<button
										type="button"
										onClick={() => setShowBulkDeleteModal(true)}
										className="app-pill inline-flex items-center gap-2 border border-[color:var(--line)] bg-white px-4 py-3 text-sm font-medium text-[var(--ink)]"
									>
										<Trash2 className="h-4 w-4" />
										<span>
											{t.common.delete} ({selectedUserIds.length})
										</span>
									</button>
								) : null}
							</div>
						</div>

						<div className="app-card border border-[color:var(--line-strong)] bg-white p-4 sm:p-5">
							<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
								<div className="relative w-full max-w-md">
									<Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-soft)]" />
									<input
										value={searchTerm}
										onChange={(event) => {
											setSearchTerm(event.target.value);
											setPaginationModel((prev) => ({ ...prev, page: 0 }));
										}}
										placeholder="Search users"
										className="app-input w-full pl-11"
									/>
								</div>
								<div className="flex flex-wrap items-center gap-2">
									<button
										type="button"
										onClick={toggleVisibleRows}
										className="app-pill inline-flex items-center gap-2 border border-[color:var(--line)] bg-[var(--surface-muted)] px-4 py-2 text-sm font-medium text-[var(--ink)]"
									>
										<Users className="h-4 w-4" />
										<span>{allVisibleSelected ? 'Unselect page' : 'Select page'}</span>
									</button>
									<span className="text-sm text-[var(--ink-soft)]">{pageLabel}</span>
									<button
										type="button"
										onClick={() =>
											setPaginationModel((prev) => ({ ...prev, page: Math.max(0, prev.page - 1) }))
										}
										disabled={paginationModel.page <= 0}
										className="app-pill border border-[color:var(--line)] px-3 py-2 text-sm disabled:opacity-50"
									>
										Prev
									</button>
									<button
										type="button"
										onClick={() =>
											setPaginationModel((prev) => ({ ...prev, page: Math.min(totalPages - 1, prev.page + 1) }))
										}
										disabled={paginationModel.page >= totalPages - 1}
										className="app-pill border border-[color:var(--line)] px-3 py-2 text-sm disabled:opacity-50"
									>
										Next
									</button>
								</div>
							</div>

							<div className="mt-4 overflow-x-auto">
								{isLoading ? (
									<ApiProgress backdropColor="#FFFFFF" circularColor="#111827" />
								) : error ? (
									<ApiAlert errorDetails={undefined} />
								) : (
									<table className="min-w-full text-left text-sm">
										<thead className="border-b border-[color:var(--line)] text-[var(--ink-soft)]">
											<tr>
												<th className="px-4 py-3">
													<input type="checkbox" checked={allVisibleSelected} onChange={toggleVisibleRows} />
												</th>
												<th className="px-4 py-3 font-medium">User</th>
												<th className="px-4 py-3 font-medium">Email</th>
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
													<tr key={user.id} className="border-b border-[color:var(--line)] last:border-b-0 hover:bg-[var(--surface-muted)]">
														<td className="px-4 py-4">
															<input
																type="checkbox"
																checked={checked}
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
															<div className="flex items-center gap-3">
																<div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[var(--accent)] text-sm font-semibold text-white">
																	{initialsFor(user)}
																</div>
																<div>
																	<p className="font-medium text-[var(--ink)]">
																		{[user.first_name, user.last_name].filter(Boolean).join(' ')}
																	</p>
																	<p className="text-xs text-[var(--ink-soft)]">#{user.id}</p>
																</div>
															</div>
														</td>
														<td className="px-4 py-4 text-[var(--ink)]">{user.email}</td>
														<td className="px-4 py-4 text-[var(--ink)]">{user.gender || '-'}</td>
														<td className="px-4 py-4">
															<span className={user.is_active ? 'rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-white' : 'rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--ink)]'}>
																{user.is_active ? t.common.yes : t.common.no}
															</span>
														</td>
														<td className="px-4 py-4">
															<span className={user.is_staff ? 'rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-white' : 'rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--ink)]'}>
																{user.is_staff ? t.common.yes : t.common.no}
															</span>
														</td>
														<td className="px-4 py-4 text-[var(--ink-soft)]">{formatDate(user.date_joined)}</td>
														<td className="px-4 py-4">
															<div className="flex flex-wrap gap-2">
																<button
																	type="button"
																	onClick={() => router.push(USERS_VIEW(user.id))}
																	className="app-pill inline-flex items-center gap-2 border border-[color:var(--line)] px-3 py-2 text-sm"
																>
																	<Eye className="h-4 w-4" />
																	<span>{t.common.view}</span>
																</button>
																<button
																	type="button"
																	onClick={() => router.push(USERS_EDIT(user.id))}
																	className="app-pill inline-flex items-center gap-2 border border-[color:var(--line)] px-3 py-2 text-sm"
																>
																	<PencilLine className="h-4 w-4" />
																	<span>{t.common.edit}</span>
																</button>
																<button
																	type="button"
																	onClick={() => {
																		setSelectedUserId(user.id);
																		setShowDeleteModal(true);
																	}}
																	className="app-pill inline-flex items-center gap-2 border border-[color:var(--line)] px-3 py-2 text-sm"
																>
																	<Trash2 className="h-4 w-4" />
																	<span>{t.common.delete}</span>
																</button>
															</div>
														</td>
													</tr>
												);
											})}
											{rows.length === 0 ? (
												<tr>
													<td colSpan={8} className="px-4 py-12 text-center text-sm text-[var(--ink-soft)]">
														No users found.
													</td>
												</tr>
											) : null}
										</tbody>
									</table>
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
							color: '#4b5563',
						},
						{
							text: t.common.delete,
							active: true,
							onClick: deleteHandler,
							icon: <Trash2 className="h-4 w-4" />,
							color: '#111827',
						},
					]}
					titleIcon={<Trash2 className="h-5 w-5" />}
					titleIconColor="#111827"
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
							color: '#4b5563',
						},
						{
							text: `${t.common.delete} (${selectedUserIds.length})`,
							active: true,
							onClick: bulkDeleteHandler,
							icon: <Trash2 className="h-4 w-4" />,
							color: '#111827',
						},
					]}
					titleIcon={<Trash2 className="h-5 w-5" />}
					titleIconColor="#111827"
				/>
			) : null}
		</div>
	);
};

export default UsersListClient;
