'use client';

import React from 'react';
import Image from 'next/image';
import FlagGB from '../../../../public/assets/images/flags/gb.svg';
import FlagFR from '../../../../public/assets/images/flags/fr.svg';
import Logo from '../../../../public/assets/images/design-workflow-logo.svg';
import DesignBoardSVG from '../../../../public/assets/images/auth_illu/design-board.svg';
import MaterialsSVG from '../../../../public/assets/images/auth_illu/materials.svg';
import WorkflowCardSVG from '../../../../public/assets/images/auth_illu/workflow-card.svg';
import { useLanguage } from '@/utils/hooks';

type Props = {
	children?: React.ReactNode;
};

const AuthLayout = ({ children }: Props) => {
	const { language, setLanguage, t } = useLanguage();
	const previewColumns = [
		{
			tone: 'indigo',
			status: t.workflow.statuses.in_progress,
			image: DesignBoardSVG,
			title: t.workflow.sections.boardFilters.title,
			description: t.workflow.sections.boardFilters.description,
		},
		{
			tone: 'amber',
			status: t.workflow.labels.review,
			image: MaterialsSVG,
			title: t.workflow.labels.deliveryChecklist,
			description: t.workflow.labels.deliveryChecklistHint,
		},
		{
			tone: 'green',
			status: t.workflow.statuses.completed,
			image: WorkflowCardSVG,
			title: t.workflow.sections.projectTasks.title,
			description: t.workflow.sections.projectTasks.description,
		},
	];

	return (
		<main className="auth-shell min-h-screen bg-white p-3 sm:p-5">
			<div className="auth-frame mx-auto grid min-h-[calc(100vh-2.5rem)] max-w-[1480px] overflow-hidden rounded-3xl border border-[color:var(--line)] bg-white shadow-(--shadow-lg) lg:grid-cols-[200px_minmax(0,1fr)]">
				<aside className="auth-rail hidden border-r border-[color:var(--line)] bg-white p-4 lg:flex lg:flex-col">
					<div className="flex items-center gap-3 border-b border-[color:var(--line)] pb-4">
						<Image src={Logo} alt={t.common.appLogo} width={34} height={34} className="h-9 w-auto" priority />
						<div className="min-w-0">
							<p className="text-[10px] font-bold uppercase tracking-[0.22em] text-(--ink-muted)">Design Workflow</p>
							<p className="truncate text-sm font-bold text-(--ink)">{t.workflow.labels.board}</p>
						</div>
					</div>
					<nav className="mt-5 grid gap-2">
						{[
							t.navigation.overview,
							t.workflow.statuses.backlog,
							t.workflow.statuses.in_progress,
							t.workflow.labels.review,
							t.workflow.statuses.completed,
						].map((item, index) => (
							<div key={item} className={['auth-rail-pill', index === 0 ? 'auth-rail-pill-active' : ''].join(' ')}>
								<span className="auth-rail-dot" />
								<span>{item}</span>
								<span className="ml-auto">{index === 0 ? '+' : ''}</span>
							</div>
						))}
					</nav>
					<div className="auth-rail-user mt-auto">
						<p className="text-[10px] font-bold uppercase tracking-[0.18em] text-(--ink-muted)">{t.settings.security}</p>
						<p className="mt-1 text-sm font-bold text-(--ink)">Casa Di Lusso</p>
					</div>
				</aside>

				<section className="auth-board relative min-h-[calc(100vh-2.5rem)] overflow-hidden bg-white">
					<div className="auth-board-header">
						<div>
							<p className="text-[11px] font-bold uppercase tracking-[0.18em] text-(--ink-muted)">{t.navigation.workspace}</p>
							<h1 className="text-2xl font-extrabold text-(--ink)">Design Workflow</h1>
						</div>
						<div className="flex items-center gap-2">
							<span className="auth-top-pill auth-top-pill-decorator">+</span>
							<button
								type="button"
								onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
								aria-label={language === 'fr' ? 'Passer en anglais' : 'Switch to French'}
								className="auth-top-pill auth-top-pill-primary inline-flex items-center gap-2"
							>
								<Image
									src={language === 'fr' ? FlagFR : FlagGB}
									alt=""
									width={22}
									height={15}
									aria-hidden="true"
									className="workflow-language-flag"
								/>
								<span>{language === 'fr' ? 'FR' : 'EN'}</span>
							</button>
							<span className="auth-top-pill auth-top-pill-decorator">+</span>
						</div>
					</div>

					<div className="auth-board-tabs">
						{[t.workflow.labels.board, t.workflow.labels.manager, t.workflow.labels.dueDate, t.workflow.labels.priority].map((item) => (
							<span key={item}>{item}</span>
						))}
					</div>

					<div className="auth-board-grid">
						{previewColumns.map((column, index) => (
							<div key={column.status} className="auth-board-column" data-tone={column.tone}>
								<div className="auth-column-pill"><b>{column.status}</b><em>+</em></div>
								<div className={index === 0 ? 'auth-preview-card' : 'auth-mini-card'}>
									<Image
										src={column.image}
										alt=""
										fill
										priority={index === 0}
										className={index === 0 ? 'object-contain p-3' : 'object-contain p-4'}
										sizes={index === 0 ? '260px' : '220px'}
									/>
								</div>
								<div className="auth-mini-card">
									<p>{column.title}</p>
									<span>{column.description}</span>
									<div className="auth-avatar-row" />
								</div>
							</div>
						))}
					</div>

					<section className="auth-login-dock">
						{children}
					</section>
				</section>
			</div>
		</main>
	);
};

export default AuthLayout;
