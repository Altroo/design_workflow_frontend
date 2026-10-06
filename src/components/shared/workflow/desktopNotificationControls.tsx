'use client';

import { BellRing, Volume2 } from 'lucide-react';
import type { WorkflowCopy } from '@/types/workflowUiTypes';
import type { useDesktopNotifications } from '@/utils/workflow/hooks/useDesktopNotifications';

export const DesktopNotificationControls = ({
	controls,
	copy,
}: {
	controls: ReturnType<typeof useDesktopNotifications>;
	copy: WorkflowCopy;
}) => {
	const { labels } = copy;
	const unavailable = controls.permission === 'unsupported' || controls.permission === 'denied';
	return (
		<section aria-label={labels.desktopTitle} className="rounded-xl border border-(--line) bg-(--surface-muted) p-3">
			<p className="flex items-center gap-2 text-sm font-bold text-(--ink)">
				<BellRing size={16} className="shrink-0 text-(--accent-strong)" />
				{labels.desktopTitle}
			</p>
			<p className="mt-2 text-xs leading-relaxed text-(--ink-soft)">
				{controls.permission === 'denied'
					? labels.desktopBlocked
					: controls.permission === 'unsupported'
						? labels.desktopUnsupported
						: labels.desktopHelp}
			</p>
			{!unavailable && (
				<div className="mt-3 flex flex-wrap items-center gap-2">
					<button
						type="button"
						disabled={controls.requesting}
						onClick={controls.enabled ? controls.disable : controls.enable}
						className="workflow-focus-ring rounded-lg border border-(--line) bg-(--surface) px-3 py-2 text-xs font-bold text-(--accent-strong) disabled:opacity-50"
					>
						{controls.enabled ? labels.desktopDisable : labels.desktopEnable}
					</button>
					{controls.enabled && (
						<button
							type="button"
							onClick={controls.test}
							className="workflow-focus-ring rounded-lg px-3 py-2 text-xs font-bold text-(--accent-strong)"
						>
							{labels.desktopTest}
						</button>
					)}
				</div>
			)}
			{controls.enabled && (
				<>
					<label className="mt-3 flex cursor-pointer items-center gap-2 text-xs font-semibold text-(--ink)">
						<input
							type="checkbox"
							checked={controls.sound}
							onChange={(event) => controls.setSound(event.target.checked)}
							className="h-4 w-4 shrink-0 accent-(--accent-strong)"
						/>
						<Volume2 size={15} className="shrink-0 text-(--accent-strong)" />
						{labels.desktopSound}
					</label>
					<p className="mt-2 text-xs leading-relaxed text-(--ink-soft)">{labels.desktopSoundHelp}</p>
				</>
			)}
			{controls.failed && (
				<p role="alert" className="mt-2 text-xs leading-relaxed text-red-600 dark:text-red-400">
					{labels.desktopError}
				</p>
			)}
		</section>
	);
};
