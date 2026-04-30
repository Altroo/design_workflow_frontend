'use client';

import React from 'react';
import Image from 'next/image';
import Logo from '../../../../public/assets/images/reservation-logo.png';
import DesignBoardSVG from '../../../../public/assets/images/auth_illu/design-board.svg';
import MaterialsSVG from '../../../../public/assets/images/auth_illu/materials.svg';
import WorkflowCardSVG from '../../../../public/assets/images/auth_illu/workflow-card.svg';
import { useLanguage } from '@/utils/hooks';

type Props = {
	children?: React.ReactNode;
};

const AuthLayout = ({ children }: Props) => {
	const { t } = useLanguage();

	return (
		<main className="auth-shell min-h-screen bg-white p-3 sm:p-5">
			<div className="auth-frame mx-auto grid min-h-[calc(100vh-2.5rem)] max-w-[1480px] overflow-hidden rounded-3xl border border-[color:var(--line)] bg-white shadow-(--shadow-lg) lg:grid-cols-[200px_minmax(0,1fr)]">
				<aside className="auth-rail hidden border-r border-[color:var(--line)] bg-white p-4 lg:flex lg:flex-col">
					<div className="flex items-center gap-3 border-b border-[color:var(--line)] pb-4">
						<Image src={Logo} alt={t.common.appLogo} width={34} height={34} className="h-9 w-auto" priority />
						<div className="min-w-0">
							<p className="text-[10px] font-bold uppercase tracking-[0.22em] text-(--ink-muted)">Design Workflow</p>
							<p className="truncate text-sm font-bold text-(--ink)">Kanban access</p>
						</div>
					</div>
					<nav className="mt-5 grid gap-2">
						{['Dashboard', 'Backlog', 'In progress', 'Review', 'Completed'].map((item, index) => (
							<div key={item} className={['auth-rail-pill', index === 0 ? 'auth-rail-pill-active' : ''].join(' ')}>
								<span className="auth-rail-dot" />
								<span>{item}</span>
								<span className="ml-auto">{index === 0 ? '+' : ''}</span>
							</div>
						))}
					</nav>
					<div className="auth-rail-user mt-auto">
						<p className="text-[10px] font-bold uppercase tracking-[0.18em] text-(--ink-muted)">Secure studio</p>
						<p className="mt-1 text-sm font-bold text-(--ink)">Casa Di Lusso</p>
					</div>
				</aside>

				<section className="auth-board relative min-h-[calc(100vh-2.5rem)] overflow-hidden bg-white">
					<div className="auth-board-header">
						<div>
							<p className="text-[11px] font-bold uppercase tracking-[0.18em] text-(--ink-muted)">Workspace</p>
							<h1 className="text-2xl font-extrabold text-(--ink)">Design Workflow</h1>
						</div>
						<div className="flex items-center gap-2">
							<span className="auth-top-pill">+</span>
							<span className="auth-top-pill auth-top-pill-primary">Login</span>
							<span className="auth-top-pill">+</span>
						</div>
					</div>

					<div className="auth-board-tabs">
						{['Task board', 'Owner', 'Due date', 'Priority'].map((item) => (
							<span key={item}>{item}</span>
						))}
					</div>

					<div className="auth-board-grid">
						<div className="auth-board-column" data-tone="indigo">
							<div className="auth-column-pill"><b>In Progress</b><em>+</em></div>
							<div className="auth-preview-card">
								<Image src={DesignBoardSVG} alt="" fill className="object-contain p-3" sizes="260px" />
							</div>
							<div className="auth-mini-card">
								<p>UI/UX Design in the age of AI</p>
								<span>Lorem ipsum dolor sit amet.</span>
								<div className="auth-avatar-row" />
							</div>
						</div>
						<div className="auth-board-column" data-tone="amber">
							<div className="auth-column-pill"><b>Reviewed</b><em>+</em></div>
							<div className="auth-mini-card">
								<Image src={MaterialsSVG} alt="" fill className="object-contain p-4" sizes="220px" />
							</div>
							<div className="auth-mini-card">
								<p>Material choices</p>
								<span>Review palette and approvals.</span>
								<div className="auth-avatar-row" />
							</div>
						</div>
						<div className="auth-board-column" data-tone="green">
							<div className="auth-column-pill"><b>Completed</b><em>+</em></div>
							<div className="auth-mini-card">
								<Image src={WorkflowCardSVG} alt="" fill className="object-contain p-4" sizes="220px" />
							</div>
							<div className="auth-mini-card">
								<p>Delivery card</p>
								<span>Files, status, timing.</span>
								<div className="auth-avatar-row" />
							</div>
						</div>
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
