import type { CSSProperties } from 'react';
import Image from 'next/image';
import { Archive, Bell, CalendarDays, CheckCircle2, ChevronDown, Clock3, FolderKanban, Menu, PanelLeftClose, Paperclip, Plus, RefreshCcw, Shield, SlidersHorizontal, Table2, UserRound } from 'lucide-react';
import FlagGB from '../../../../public/assets/images/flags/gb.svg';
import FlagFR from '../../../../public/assets/images/flags/fr.svg';
import { BOARD_STATUS_META, STATUS_COLUMNS } from '@/components/shared/workflow/boardAppearance';
import { getWorkflowNavigation, getWorkflowUtilities, type WorkflowNavItem } from '@/components/shared/workflow/workflowNavigation';
import { WorkflowPageHero } from '@/components/shared/workflow/workflowPrimitives';
import type { Language, TranslationDictionary } from '@/types/languageTypes';
import { DASHBOARD_BOARD } from '@/utils/routes';

// Public, decorative content only. This view never loads authenticated workspace data.
const AuthWorkspaceBackdrop = ({ t, language }: { t: TranslationDictionary; language: Language }) => {
	const { workflow } = t;
	const cardTitles = [workflow.sections.projectTasks.title, workflow.labels.deliveryChecklist, workflow.sections.boardFilters.title];
	const renderNavItem = (item: WorkflowNavItem) => (
		<div
			key={item.path}
			aria-current={item.path === DASHBOARD_BOARD ? 'page' : undefined}
			className="app-pill workflow-nav-link flex w-full items-center gap-3 px-3 py-2.5 text-sm font-semibold"
		>
			<span className="text-(--ink-soft)">{item.icon}</span>
			<span className="workflow-nav-text min-w-0 flex-1 truncate">{item.label}</span>
		</div>
	);

	return (
		<div className="auth-workspace-backdrop" aria-hidden="true" inert>
			<div className="workflow-shell workflow-shell-expanded">
				<aside className="workflow-rail workflow-rail-expanded app-card hidden flex-col bg-white p-3 lg:flex">
					<div className="flex w-full items-center justify-between gap-3 border-b border-[color:var(--line)] pb-4">
						<div className="workflow-rail-title min-w-0 flex-1">
							<p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-(--ink-muted)">{t.navigation.productName}</p>
							<p className="truncate text-base font-semibold text-(--ink)">{t.navigation.board}</p>
						</div>
						<span className="app-pill flex h-10 w-10 shrink-0 items-center justify-center text-(--ink)"><PanelLeftClose size={18} /></span>
					</div>
					<nav className="mt-5 flex w-full flex-1 flex-col items-stretch gap-2">
						<p className="workflow-nav-section px-2 text-[11px] font-bold uppercase tracking-[0.18em] text-(--accent-strong)">{t.navigation.workspace}</p>
						{getWorkflowNavigation(t, true).map(renderNavItem)}
						<div className="mt-5 w-full border-t border-[color:var(--line)] pt-4">
							<p className="workflow-nav-section mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-(--ink-muted)">{t.navigation.users}</p>
							<div className="flex flex-col items-center gap-2">{getWorkflowUtilities(t, true).map(renderNavItem)}</div>
						</div>
					</nav>
					<div className="workflow-rail-user mt-5 rounded-lg border border-[color:var(--line)] bg-(--accent-tint) p-3">
						<p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-(--ink-muted)">{t.navigation.signedIn}</p>
						<p className="mt-1 truncate text-sm font-semibold text-(--ink)">{t.navigation.productName}</p>
						<p className="mt-1 text-xs text-(--ink-soft)">{workflow.labels.manager}</p>
					</div>
				</aside>

				<div className="workflow-main">
					<header className="workflow-topbar workflow-commandbar app-card overflow-visible bg-white px-3 py-3 sm:px-4">
						<div className="flex flex-wrap items-center gap-3">
							<span className="app-pill flex h-10 w-10 items-center justify-center lg:hidden"><Menu size={18} /></span>
							<div className="workflow-topbar-controls ml-auto flex items-center gap-2">
								<span className="workflow-topbar-icon flex h-10 w-10 items-center justify-center"><Bell size={18} /></span>
								<span className="workflow-topbar-control hidden items-center gap-2 px-3 py-2 text-sm font-bold xl:inline-flex"><Shield size={16} />{t.navigation.administration}</span>
								<span className="workflow-topbar-control workflow-language-toggle inline-flex items-center gap-2 px-3 py-2 text-sm font-bold">
									<Image src={language === 'fr' ? FlagFR : FlagGB} alt="" width={22} height={15} className="workflow-language-flag" />
									{language === 'fr' ? 'FR' : 'EN'}
								</span>
								<span className="workflow-topbar-profile flex items-center gap-3 px-3 py-2">
									<span className="workflow-topbar-avatar flex h-10 w-10 items-center justify-center rounded-full"><UserRound size={18} /></span>
									<span className="text-xs">{t.navigation.welcomeNeutral}</span><ChevronDown size={14} />
								</span>
							</div>
						</div>
					</header>
					<div className="workflow-content-frame workflow-content-frame-with-topbar mx-auto flex w-full max-w-[1520px] flex-col gap-4">
						<div className="workflow-kanban-page">
							<WorkflowPageHero
								className="workflow-kanban-header"
								title={workflow.pageTitles.board}
								actionsWrapper={false}
								actions={<>
									<div className="workflow-kanban-header-metrics">
										<span>{workflow.labels.visible} <strong>10</strong></span>
										<span>{workflow.labels.overdue} <strong>0</strong></span>
										<span>{workflow.labels.blocked} <strong>0</strong></span>
									</div>
									<div className="workflow-kanban-actions">
										<div className="workflow-board-segment">
											<button type="button" className="is-active"><FolderKanban size={14} />{workflow.labels.board}</button>
											<button type="button"><Table2 size={14} />{workflow.labels.table}</button>
											<button type="button"><CalendarDays size={14} />{workflow.labels.calendar}</button>
										</div>
										<button type="button" className="app-pill workflow-board-filter-toggle"><SlidersHorizontal size={16} />{workflow.labels.search}</button>
										<button type="button" className="app-pill grid h-10 w-10 place-items-center" aria-label={workflow.buttons.resetFilters}><RefreshCcw size={16} /></button>
										<div className="workflow-board-segment">
											<button type="button" className="is-active">{workflow.labels.activeCards}</button>
											<button type="button"><Archive size={14} />{workflow.buttons.archive}</button>
										</div>
									</div>
								</>}
							/>
							<section className="workflow-board-surface overflow-x-auto">
								<div className="workflow-board-layout">
									<div className="workflow-board-lanes flex gap-4 overflow-x-auto pb-2">
										{STATUS_COLUMNS.map((status, columnIndex) => {
											const meta = BOARD_STATUS_META[status];
											const count = [2, 3, 2, 1, 0, 2][columnIndex];
											const style = {
												'--status-accent': meta.accent, '--status-soft': meta.soft, '--status-text': meta.text,
												'--card-cover-accent': meta.accent, '--card-cover-soft': meta.soft, '--card-cover-text': meta.text,
											} as CSSProperties;
											return (
												<div key={status} data-status={status} style={style} className="workflow-column flex h-full min-h-[420px] min-w-[320px] flex-col">
													<div className="workflow-column-header">
														<div className="flex min-w-0 items-center gap-2">
															<span className="workflow-column-icon">{meta.icon}</span>
															<div className="min-w-0"><p className="truncate text-sm font-bold">{workflow.statuses[status]}</p><p className="text-[11px] font-semibold uppercase">{count} {workflow.labels.cards}</p></div>
														</div>
														<div className="workflow-column-count">{count}</div>
													</div>
													<div className="workflow-column-stats"><span><Clock3 size={12} />{count * 2}h</span><span><CheckCircle2 size={12} />0/{count * 3}</span></div>
													<div className="workflow-column-cards flex flex-1 flex-col gap-3 overflow-y-auto p-3">
														{Array.from({ length: count }, (_, index) => (
															<div key={index} className="workflow-board-card-shell">
																<div className="workflow-trello-board-card" data-status={status}>
																	<div className="workflow-trello-card-body">
																		<div className="workflow-trello-card-title-row"><p>{cardTitles[(columnIndex + index) % cardTitles.length]}</p></div>
																		<span className="workflow-trello-card-project">{t.navigation.productName}</span>
																		<p className="workflow-trello-card-description">{workflow.labels.deliveryChecklistHint}</p>
																		<div className="workflow-trello-card-footer"><div className="workflow-trello-card-badges"><span><CheckCircle2 size={12} />0/3</span><span><Paperclip size={12} />1</span></div><UserRound size={18} /></div>
																	</div>
																</div>
															</div>
														))}
														<button type="button" className="workflow-column-add-card"><Plus size={18} /><span>{workflow.labels.addCard}</span></button>
													</div>
												</div>
											);
										})}
									</div>
								</div>
							</section>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default AuthWorkspaceBackdrop;
