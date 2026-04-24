'use client';

import React from 'react';
import Image from 'next/image';
import Logo from '../../../../public/assets/images/reservation-logo.png';
import BlueprintSVG from '../../../../public/assets/images/auth_illu/blueprint.svg';
import SignatureSVG from '../../../../public/assets/images/auth_illu/signature.svg';
import HandshakeSVG from '../../../../public/assets/images/auth_illu/handshake.svg';
import BuildingSVG from '../../../../public/assets/images/auth_illu/building.svg';
import { useLanguage } from '@/utils/hooks';

type Props = {
	children?: React.ReactNode;
};

const AuthLayout = ({ children }: Props) => {
	const { t } = useLanguage();

	return (
		<main className="min-h-screen px-4 py-4 sm:px-6 sm:py-6">
			<div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1480px] overflow-hidden rounded-[8px] border border-[color:var(--line-strong)] bg-white shadow-[var(--shadow-lg)] lg:grid-cols-[1.08fr_0.92fr]">
				<section className="relative hidden overflow-hidden border-r border-[color:var(--line)] bg-[var(--surface-muted)] p-8 lg:block xl:p-10">
					<div className="relative z-10 flex h-full flex-col justify-between">
						<div className="app-pill inline-flex w-fit items-center gap-3 px-4 py-3">
							<Image src={Logo} alt={t.common.appLogo} width={38} height={38} className="h-10 w-auto grayscale" priority />
							<div>
								<p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--ink-soft)]">
									Design Workflow
								</p>
								<p className="text-base font-semibold text-[var(--ink)]">Studio board system</p>
							</div>
						</div>

						<div className="max-w-[520px]">
							<h1 className="mt-4 text-5xl font-semibold leading-[1.05] text-[var(--ink)]">
								Design
								<br />
								Workflow
								<br />
								Board
							</h1>
							<p className="mt-6 max-w-[420px] text-base leading-7 text-[var(--ink-soft)]">
								Architectural task management for studio teams.
							</p>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="app-card-muted relative min-h-[220px] overflow-hidden p-5">
								<Image
									src={BlueprintSVG}
									alt=""
									fill
									className="object-contain p-6 grayscale"
									sizes="(max-width: 1400px) 30vw, 420px"
								/>
							</div>
							<div className="grid gap-4">
								<div className="app-card-muted relative min-h-[102px] overflow-hidden">
									<Image src={SignatureSVG} alt="" fill className="object-contain p-4 grayscale" sizes="240px" />
								</div>
								<div className="app-card-muted relative min-h-[102px] overflow-hidden">
									<Image src={HandshakeSVG} alt="" fill className="object-contain p-4 grayscale" sizes="240px" />
								</div>
							</div>
						</div>
					</div>

					<div className="pointer-events-none absolute inset-0">
						<div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,24,39,0.04)_1px,transparent_1px),linear-gradient(180deg,rgba(17,24,39,0.04)_1px,transparent_1px)] bg-[length:28px_28px]" />
						<div className="absolute left-12 top-1/2 h-px w-48 bg-[var(--line-strong)]" />
						<div className="absolute right-12 top-24 h-44 w-44 rounded-[8px] border border-[color:var(--line)] bg-white/70" />
						<div className="absolute right-16 top-28 h-36 w-36">
							<Image src={BuildingSVG} alt="" fill className="object-contain opacity-55 grayscale" sizes="144px" />
						</div>
					</div>
				</section>

				<section className="relative flex min-h-[calc(100vh-2rem)] items-center justify-center bg-white px-4 py-8 sm:px-8 lg:px-10">
					<div className="absolute inset-x-0 top-0 h-40 bg-[var(--accent-tint)]" />
					<div className="relative z-10 w-full max-w-[460px]">{children}</div>
				</section>
			</div>
		</main>
	);
};

export default AuthLayout;
