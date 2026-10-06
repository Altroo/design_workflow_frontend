'use client';

import { useGetTaskTimeEntriesQuery } from '@/store/services/designWorkflow';
import { useLanguage } from '@/utils/hooks';
import { Clock3 } from 'lucide-react';
import { useState } from 'react';
import { AvatarBadge, EmptyState, HistoryPager, Surface } from '@/components/shared/workflow/workflowFields';
import { formatDateTime, formatMinutes } from '@/utils/workflow/workflowFormatting';

export const TaskTimeHistory = ({ taskId }: { taskId: number }) => {
	const { t, language } = useLanguage();
	const { workflow } = t;
	const [page, setPage] = useState(1);
	const { currentData, isFetching, isError, refetch } = useGetTaskTimeEntriesQuery({ id: taskId, page });
	return (
		<Surface className="workflow-task-detail-panel workflow-task-time-panel" {...workflow.sections.timeEntries}>
			<div className="app-card-muted flex items-start gap-3 p-4">
				<div className="mt-0.5 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-emerald-700">
					<Clock3 size={16} />
				</div>
				<div className="min-w-0">
					<p className="text-sm font-semibold text-(--ink)">{workflow.labels.timeEntries}</p>
					<p className="mt-1 text-sm leading-6 text-(--ink-soft)">{workflow.labels.timeAutomationHint}</p>
				</div>
			</div>
			<div className="mt-4 space-y-3" aria-busy={isFetching}>
				{isError ? (
					<div role="alert">
						<p>{t.errors.serviceUnavailable}</p>
						<button type="button" className="app-button app-button-secondary" onClick={() => void refetch()}>
							{language === 'fr' ? 'Réessayer' : 'Retry'}
						</button>
					</div>
				) : null}
				{isFetching && !currentData ? <p role="status">{t.common.loading}</p> : null}
				{currentData?.results.map((entry) => (
					<div key={entry.id} className="app-card-muted p-4">
						<div className="flex items-start gap-3">
							<AvatarBadge user={entry.user} size={34} />
							<div className="min-w-0 flex-1">
								<p className="text-sm font-semibold text-(--ink)">
									{entry.user.first_name} {entry.user.last_name} • {formatMinutes(entry.minutes)}
								</p>
								<p className="mt-1 text-xs uppercase tracking-[0.14em] text-(--ink-soft)">
									{formatDateTime(entry.created_at, workflow.labels.noDate, language === 'fr' ? 'fr-FR' : 'en-US')}
								</p>
								<p className="mt-2 text-sm leading-6 text-(--ink-soft)">{entry.note || workflow.labels.optionalNote}</p>
							</div>
						</div>
					</div>
				))}
				{currentData?.count === 0 ? <EmptyState {...workflow.emptyStates.noTime} /> : null}
				<HistoryPager
					page={page}
					totalPages={Math.max(page, Math.ceil((currentData?.count ?? 0) / 5))}
					onChangeAction={setPage}
				/>
			</div>
		</Surface>
	);
};
