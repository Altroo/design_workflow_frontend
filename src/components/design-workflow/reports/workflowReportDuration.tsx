import { WORK_DAY_MINUTES } from '@/utils/rawData';
import { formatReportHours, formatReportWorkDuration } from '@/utils/workflow/workflowReportFormatting';

export const WorkflowReportDuration = ({ minutes, locale }: { minutes: number; locale: string }) => (
	<span className="workflow-report-duration">
		<span>{formatReportWorkDuration(minutes, locale)}</span>
		{Math.abs(minutes) >= WORK_DAY_MINUTES ? <small>{formatReportHours(minutes)}</small> : null}
	</span>
);
