'use client';

import { Line } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';
import type { DashboardSummary } from '@/types/designWorkflowTypes';
import type { WorkflowCopy } from '@/types/workflowUiTypes';
import { EmptyState } from '@/components/shared/workflow/workflowFields';
import { formatReportDate } from '@/utils/workflow/workflowReportFormatting';

export const WorkflowActivityChart = ({
	summary,
	loading,
	labels,
	locale,
	textColor,
}: {
	summary?: DashboardSummary;
	loading?: boolean;
	labels: WorkflowCopy['labels'];
	locale: string;
	textColor: string;
}) => {
	const days = summary?.daily_activity ?? [];
	const created = days.reduce((total, day) => total + day.created, 0);
	const completed = days.reduce((total, day) => total + day.completed, 0);
	const data: ChartData<'line', number[], string> = {
		labels: days.map((day) => formatReportDate(day.date, locale)),
		datasets: [
			{
				label: labels.overviewCreated,
				data: days.map((day) => day.created),
				borderColor: '#6366f1',
				backgroundColor: '#6366f1',
				tension: 0,
				pointRadius: 3,
				pointHitRadius: 10,
			},
			{
				label: labels.overviewFinished,
				data: days.map((day) => day.completed),
				borderColor: '#10b981',
				backgroundColor: '#10b981',
				borderDash: [6, 3],
				tension: 0,
				pointRadius: 3,
				pointHitRadius: 10,
			},
		],
	};
	const options: ChartOptions<'line'> = {
		responsive: true,
		maintainAspectRatio: false,
		animation: false,
		interaction: { mode: 'index', intersect: false },
		plugins: { legend: { position: 'bottom', labels: { color: textColor, usePointStyle: true, padding: 18 } } },
		scales: {
			x: { grid: { display: false }, ticks: { color: textColor, maxTicksLimit: 7, maxRotation: 0 } },
			y: { beginAtZero: true, grid: { color: 'rgba(148, 163, 184, 0.18)' }, ticks: { color: textColor, precision: 0 } },
		},
	};
	return (
		<section className="workflow-overview-chart-card workflow-activity-card" aria-labelledby="workflow-activity-title">
			<header>
				<h2 id="workflow-activity-title">{labels.overviewActivity}</h2>
				<p>{labels.overviewActivityPeriod}</p>
			</header>
			<p className="workflow-overview-explanation">{labels.overviewActivityWhy}</p>
			{!days.length ? (
				<p role="status">{loading ? labels.overviewLoading : labels.overviewDataUnavailable}</p>
			) : created || completed ? (
				<>
					<div className="workflow-activity-totals">
						<span>
							{labels.overviewCreated}
							<strong>{created}</strong>
						</span>
						<span>
							{labels.overviewFinished}
							<strong>{completed}</strong>
						</span>
					</div>
					<div className="workflow-activity-chart">
						<Line data={data} options={options} role="img" aria-label={labels.overviewActivity} />
					</div>
				</>
			) : (
				<EmptyState title={labels.overviewNoActivity} description={labels.overviewNoActivityHint} />
			)}
			<p className="workflow-overview-explanation">{labels.overviewActivityScope}</p>
			{days.length ? (
				<details className="workflow-activity-details">
					<summary>{labels.overviewDailyDetails}</summary>
					<table>
						<thead>
							<tr>
								<th scope="col">{labels.overviewDate}</th>
								<th scope="col">{labels.overviewCreated}</th>
								<th scope="col">{labels.overviewFinished}</th>
							</tr>
						</thead>
						<tbody>
							{days.map((day) => (
								<tr key={day.date}>
									<th scope="row">{formatReportDate(day.date, locale)}</th>
									<td>{day.created}</td>
									<td>{day.completed}</td>
								</tr>
							))}
						</tbody>
					</table>
				</details>
			) : null}
		</section>
	);
};
