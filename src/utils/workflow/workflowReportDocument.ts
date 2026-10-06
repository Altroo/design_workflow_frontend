import type { Content, ContentTable, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { TimeReportRow, WorkflowAnalyticsReport } from '@/types/designWorkflowTypes';
import type { PrintableReportCopy } from '@/types/workflowUiTypes';
import { BOARD_STATUS_META, STATUS_COLUMNS } from '@/components/shared/workflow/boardAppearance';
import {
	formatReportElapsedDuration,
	formatReportHours,
	formatReportWorkDuration,
	reportRemainingLabel,
	reportVarianceLabel,
} from './workflowReportFormatting';
import { REPORT_PDF_COLORS as colors, REPORT_PDF_STYLES, REPORT_PDF_TABLE_LAYOUT } from './workflowReportPdfTheme';
import { WORK_DAY_MINUTES } from '@/utils/rawData';

export const formatExportDateTime = (value: string, locale: string) => {
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value;
	return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
};

export const buildReportPdfDocument = ({
	dateWindow,
	scopeLabel,
	generatedAt,
	locale,
	totalMinutes,
	timeReport,
	workflowReport,
	copy,
	labelFor,
	riskLabelFor,
}: {
	dateWindow: string;
	scopeLabel: string;
	generatedAt: string;
	locale: string;
	totalMinutes: number;
	timeReport: TimeReportRow[];
	workflowReport?: WorkflowAnalyticsReport;
	copy: PrintableReportCopy;
	labelFor: (value: string) => string;
	riskLabelFor: (risk: string) => string;
}): TDocumentDefinitions => {
	const generatedLabel = formatExportDateTime(generatedAt, locale);
	const workDuration = (minutes: number) =>
		Math.abs(minutes) < WORK_DAY_MINUTES
			? formatReportHours(minutes)
			: `${formatReportWorkDuration(minutes, locale)} (${formatReportHours(minutes)})`;
	const note = (text: string): Content => ({ text, style: 'note' });
	const heading = (text: string): Content => ({ text, style: 'section', headlineLevel: 1 });
	const table = (headers: string[], rows: TableCell[][], widths: ContentTable['table']['widths']): ContentTable => ({
		table: {
			headerRows: 1,
			keepWithHeaderRows: 1,
			dontBreakRows: true,
			widths,
			body: [headers.map((text) => ({ text, style: 'tableHeader' })), ...rows],
		},
		layout: REPORT_PDF_TABLE_LAYOUT,
		fontSize: 8,
	});
	const metric = (label: string, value: string, detail: string, color: string): TableCell => ({
		stack: [
			{ text: label, style: 'label' },
			{ text: value, style: 'metric', color },
			{ text: detail, fontSize: 7.5, color: colors.muted },
		],
		fillColor: colors.soft,
	});
	const done = workflowReport?.status_counts.done ?? 0;
	const completion = (kind: 'lead' | 'cycle') => {
		const days = workflowReport?.[`${kind}_time_days`];
		const count = workflowReport?.[`${kind}_time_sample_size`] ?? 0;
		return metric(
			kind === 'lead' ? copy.leadTime : copy.cycleTime,
			count && days != null ? formatReportElapsedDuration(days * 1440, locale) : copy.missingDates,
			`${count} / ${done} ${copy.documentedTasks}`,
			kind === 'lead' ? colors.cyan : colors.green,
		);
	};
	const review = workflowReport?.review_bottlenecks;
	const estimate = workflowReport?.estimate_vs_actual;
	const capacity = workflowReport?.capacity ?? [];
	const reviewRows = [
		[copy.needsReview, String(review?.needs_review ?? 0)],
		[copy.reviewUnrequested, String(review?.in_review_without_request ?? 0)],
		[copy.changesRequested, String(review?.changes_requested ?? 0)],
		[copy.approved, String(review?.approved ?? 0)],
		[
			copy.pendingReviewMinutes,
			review?.pending_review_minutes == null ? '-' : formatReportElapsedDuration(review.pending_review_minutes, locale),
		],
	];
	const estimateRows = [
		[copy.estimatedMinutes, workDuration(estimate?.estimated_minutes ?? 0)],
		[copy.actualMinutes, workDuration(estimate?.actual_minutes ?? 0)],
		[
			estimate ? reportVarianceLabel(estimate, copy.estimateLabels) : copy.varianceMinutes,
			estimate?.estimated_minutes ? workDuration(Math.abs(estimate.variance_minutes)) : '-',
		],
	];
	const projectRows: TableCell[][] = timeReport.map((row) => [
		row.project.name,
		`${row.project.manager.first_name} ${row.project.manager.last_name}`.trim() || row.project.manager.email,
		labelFor(row.project.status),
		workDuration(row.minutes),
		new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(
			totalMinutes ? row.minutes / totalMinutes : 0,
		),
	]);
	const capacityRows: TableCell[][] = capacity.map((row) => [
		{
			stack: [
				{ text: `${row.user.first_name} ${row.user.last_name}`.trim() || row.user.email, bold: true },
				...(row.exhausted_estimate_tasks
					? [
							{
								text: `${row.exhausted_estimate_tasks} ${copy.exhaustedTasks}`,
								fontSize: 7.5,
								color: colors.amber,
								margin: [0, 4, 0, 0] as [number, number, number, number],
							},
						]
					: []),
				...(row.unestimated_tasks
					? [
							{
								text: `${row.unestimated_tasks} ${copy.unestimatedTasks}`,
								fontSize: 7.5,
								color: colors.amber,
								margin: [0, 4, 0, 0] as [number, number, number, number],
							},
						]
					: []),
			],
		},
		String(row.open_tasks),
		String(row.overdue_tasks),
		row.load_percent == null
			? reportRemainingLabel(row, locale, copy.minimum, copy.reestimate)
			: workDuration(row.remaining_minutes),
		row.load_percent == null
			? '-'
			: new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(row.load_percent / 100),
		{
			text: riskLabelFor(row.risk),
			bold: true,
			color:
				row.risk === 'high'
					? colors.rose
					: row.risk === 'unknown' || row.risk === 'medium'
						? colors.amber
						: colors.green,
		},
	]);
	const capacityTable = table(
		[copy.designer, copy.openTasks, copy.overdueTasks, copy.remainingMinutes, copy.loadPercent, copy.risk],
		capacityRows,
		['*', 42, 42, 95, 42, 46],
	);
	// Keep the title, explanation and first member together; repeat them on continued pages.
	capacityTable.table.headerRows = 3;
	capacityTable.layout = { ...REPORT_PDF_TABLE_LAYOUT, hLineWidth: (index) => (index < 2 ? 0 : 0.5) };
	capacityTable.table.body.unshift(
		[
			{
				text: copy.designerForecast,
				style: 'section',
				colSpan: 6,
				border: [false, false, false, false],
				fillColor: '#ffffff',
			},
			{},
			{},
			{},
			{},
			{},
		],
		[
			{
				text: `${copy.capacityHint} ${copy.remainingHint}`,
				style: 'note',
				colSpan: 6,
				border: [false, false, false, false],
				fillColor: '#ffffff',
			},
			{},
			{},
			{},
			{},
			{},
		],
	);
	return {
		info: { title: copy.title, author: copy.brand, subject: `${scopeLabel} - ${dateWindow}`, creator: copy.brand },
		pageSize: 'A4',
		pageMargins: [32, 32, 32, 42],
		defaultStyle: { font: 'Roboto', fontSize: 9, color: colors.ink, lineHeight: 1.15 },
		styles: REPORT_PDF_STYLES,
		footer: (page, pages) => ({
			columns: [
				{ text: `${copy.brand} - ${generatedLabel}`, width: '*' },
				{ text: `${page} / ${pages}`, alignment: 'right' },
			],
			margin: [32, 14, 32, 0],
			fontSize: 7.5,
			color: colors.muted,
		}),
		pageBreakBefore: (node, following) => node.headlineLevel === 1 && following.getFollowingNodesOnPage().length === 0,
		content: [
			{ text: copy.brand, style: 'brand' },
			{ text: copy.title, style: 'title' },
			{ text: `${copy.generatedOn} ${generatedLabel}`, style: 'note', margin: [0, 0, 0, 12] },
			table(
				[copy.scope, copy.period, copy.tasksSampled],
				[[scopeLabel, dateWindow, String(workflowReport?.tasks_sampled ?? 0)]],
				['*', '*', 75],
			),
			{
				table: {
					widths: ['*', '*', '*'],
					body: [
						[
							metric(
								copy.trackedTime,
								workDuration(totalMinutes),
								`${timeReport.length} ${copy.projectsIncluded}`,
								colors.brand,
							),
							completion('lead'),
							completion('cycle'),
						],
					],
				},
				layout: REPORT_PDF_TABLE_LAYOUT,
				margin: [0, 12, 0, 0],
			},
			note(copy.workdayBasis),
			note(copy.calendarHint),
			note(copy.completionHint),
			heading(copy.statusDistribution),
			{
				table: {
					widths: STATUS_COLUMNS.map(() => '*'),
					body: [
						[
							...STATUS_COLUMNS.map((status) =>
								metric(
									labelFor(status),
									String(workflowReport?.status_counts[status] ?? 0),
									'',
									BOARD_STATUS_META[status].accent,
								),
							),
						],
					],
				},
				layout: REPORT_PDF_TABLE_LAYOUT,
			},
			{
				columns: [
					{
						width: '*',
						stack: [
							heading(copy.reviewBottlenecks),
							table([copy.metric, copy.value], reviewRows, ['*', 65]),
							note(copy.reviewHint),
						],
					},
					{
						width: '*',
						stack: [
							heading(copy.estimateVsActual),
							table([copy.metric, copy.workDuration], estimateRows, ['*', 85]),
							note(copy.estimateHint),
						],
					},
				],
				columnGap: 14,
				unbreakable: true,
			},
			heading(copy.projectTime),
			projectRows.length
				? table([copy.project, copy.manager, copy.status, copy.workDuration, copy.share], projectRows, [
						'*',
						105,
						55,
						95,
						40,
					])
				: note(copy.noProjectTimeWindow),
			capacityRows.length ? capacityTable : [heading(copy.designerForecast), note(copy.noForecastRows)],
			heading(copy.reportStudio),
			note(copy.schedule),
			note(copy.trackingHint),
			note(copy.collaborationHint),
			note(copy.periodHint),
		],
	};
};
