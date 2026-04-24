'use client';

import React from 'react';
import Image from 'next/image';
import { Wrench } from 'lucide-react';
import { useAppSelector, useLanguage } from '@/utils/hooks';
import { getWSMaintenanceState } from '@/store/selectors';
import Logo from '../../../../public/assets/images/reservation-logo.png';
import IlluSVG from '../../../../public/assets/images/auth_illu/handshake.svg';

const Maintenance: React.FC = () => {
	const maintenance = useAppSelector(getWSMaintenanceState);
	const { t } = useLanguage();

	if (!maintenance) {
		return null;
	}

	return (
		<div
			data-testid="maintenance-gate"
			className="fixed inset-0 z-[140] overflow-y-auto bg-white"
		>
			<div className="grid min-h-screen md:grid-cols-[minmax(280px,32%)_1fr]">
				<div className="hidden flex-col justify-between overflow-hidden bg-[var(--surface-muted)] p-10 md:flex">
					<Image
						src={Logo}
						alt={t.common.appLogo}
						priority
						style={{ width: '150px', height: 'auto' }}
					/>
					<div className="w-full max-w-[420px]">
						<Image src={IlluSVG} alt="" priority style={{ width: '100%', height: 'auto' }} />
					</div>
				</div>

				<main
					role="alertdialog"
					aria-live="assertive"
					aria-labelledby="maintenance-title"
					aria-describedby="maintenance-description"
					className="flex min-h-screen items-center justify-center bg-white px-4 py-8 sm:px-8 md:px-12"
				>
					<div className="w-full max-w-xl">
						<div className="mb-6 flex justify-center md:hidden">
						<Image
							src={Logo}
							alt={t.common.appLogo}
							priority
							style={{ width: '88px', height: 'auto' }}
						/>
						</div>

						<div className="app-card border border-[color:var(--line-strong)] bg-white p-6 sm:p-8">
							<div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line-strong)] bg-[var(--surface-muted)] px-4 py-2 text-sm font-medium text-[var(--ink)]">
								<Wrench className="h-4 w-4" />
								<span>{t.errors.maintenanceChip}</span>
							</div>

							<div className="mt-5 space-y-3">
								<h1 id="maintenance-title" className="text-4xl font-semibold leading-none text-[var(--ink)] sm:text-5xl">
									{t.errors.maintenanceTitle}
								</h1>
								<p id="maintenance-description" className="text-base leading-7 text-[var(--ink-soft)]">
									{t.errors.maintenanceText}
								</p>
							</div>

							<div className="my-6 h-px bg-[var(--line)]" />

							<div className="space-y-2">
								<p className="text-base font-semibold text-[var(--ink)]">{t.errors.maintenanceSuspended}</p>
								<p className="text-sm leading-7 text-[var(--ink-soft)]">{t.errors.maintenanceThanks}</p>
							</div>
						</div>
					</div>
				</main>
			</div>
		</div>
	);
};

export default Maintenance;
