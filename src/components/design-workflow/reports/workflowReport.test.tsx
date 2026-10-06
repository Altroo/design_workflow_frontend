import {
	mockUseGetTimeReportQuery,
	mockUseGetWorkflowReportQuery,
	manager,
	designerA,
	projectSummary,
	mockProfile,
	selectMuiOption,
	reportRows,
	workflowReport,
	mockOnError,
} from '@/components/design-workflow/__testutils__/workflowTestSetup';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DesignWorkflowShell from '@/components/pages/design-workflow/designWorkflowShell';
import { downloadCsv, openPrintableReport } from '@/utils/workflow/workflowReportExport';
import { en } from '@/translations/en';

jest.mock('@/utils/workflow/workflowReportExport', () => ({
	...jest.requireActual('@/utils/workflow/workflowReportExport'),
	downloadCsv: jest.fn(),
	openPrintableReport: jest.fn().mockResolvedValue(undefined),
}));

it('exports time and analytics with project rows, translated labels and the selected scope', async () => {
	const user = userEvent.setup();
	mockProfile(manager);
	render(<DesignWorkflowShell title="Time report" variant="report-time" />);
	await selectMuiOption(user, 'Project', projectSummary.name);
	await user.click(screen.getByRole('button', { name: en.workflow.buttons.exportCsv }));
	expect(downloadCsv).toHaveBeenCalledWith(
		expect.stringMatching(/^flux-design-time-report-.*\.csv$/),
		expect.arrayContaining([expect.arrayContaining([projectSummary.name, reportRows[0].minutes, '3.00', '100%'])]),
	);
	await user.click(screen.getByRole('button', { name: en.workflow.buttons.exportAnalyticsCsv }));
	expect(downloadCsv).toHaveBeenLastCalledWith(
		expect.stringMatching(/^flux-design-analytics-report-.*\.csv$/),
		expect.arrayContaining([
			[en.workflow.labels.tasksSampled, workflowReport.tasks_sampled],
			[en.workflow.labels.approved, workflowReport.review_bottlenecks.approved],
		]),
	);
});

it('surfaces print failures and disables CSV exports without report data', async () => {
	const user = userEvent.setup();
	mockProfile(manager);
	mockUseGetTimeReportQuery.mockReturnValue({ data: [] });
	mockUseGetWorkflowReportQuery.mockReturnValue({ data: undefined });
	jest.mocked(openPrintableReport).mockRejectedValueOnce(new Error('Popup blocked'));
	render(<DesignWorkflowShell title="Time report" variant="report-time" />);
	expect(screen.getByRole('button', { name: en.workflow.buttons.exportCsv })).toBeDisabled();
	expect(screen.getByRole('button', { name: en.workflow.buttons.exportAnalyticsCsv })).toBeDisabled();
	const pdfButton = document.querySelector<HTMLButtonElement>('.workflow-report-actions button:last-child')!;
	await user.click(pdfButton);
	await waitFor(() => expect(mockOnError).toHaveBeenCalled());
	expect(openPrintableReport).toHaveBeenCalledWith(expect.objectContaining({ timeReport: [], totalMinutes: 0 }));
});

it('filters reports by project and user', async () => {
	const user = userEvent.setup();
	mockProfile(manager);

	render(<DesignWorkflowShell title="Time report" variant="report-time" />);
	await selectMuiOption(user, 'Project', projectSummary.name);
	await selectMuiOption(user, en.workflow.labels.reportMember, `${designerA.first_name} ${designerA.last_name}`);

	await waitFor(() => {
		expect(mockUseGetTimeReportQuery).toHaveBeenCalledWith(
			expect.objectContaining({ project: projectSummary.id, user: designerA.id }),
			expect.objectContaining({ skip: false }),
		);
		expect(mockUseGetWorkflowReportQuery).toHaveBeenCalledWith(
			expect.objectContaining({ project: projectSummary.id, user: designerA.id }),
			expect.objectContaining({ skip: false }),
		);
	});
	expect(screen.getByText(en.workflow.labels.reportPersonalTime)).toBeVisible();
	await user.click(screen.getByRole('button', { name: en.workflow.buttons.clearFilters }));
	await waitFor(() =>
		expect(mockUseGetTimeReportQuery).toHaveBeenLastCalledWith(
			expect.objectContaining({ project: undefined, user: undefined }),
			expect.anything(),
		),
	);
	expect(screen.getByText(en.workflow.labels.reportTeamTime)).toBeVisible();
});

it('shows working-day equivalents and the full team instead of only the forecast shortlist', async () => {
	mockProfile(manager);
	mockUseGetTimeReportQuery.mockReturnValue({ data: [{ ...reportRows[0], minutes: 2220 }] });
	mockUseGetWorkflowReportQuery.mockReturnValue({
		data: { ...workflowReport, designer_forecast: [], capacity: workflowReport.capacity },
	});
	render(<DesignWorkflowShell title="Time report" variant="report-time" />);
	expect(screen.getAllByText('4 d 5 h').length).toBeGreaterThan(0);
	expect(screen.getAllByText('37 h').length).toBeGreaterThan(0);
	expect(screen.getByRole('heading', { name: `${designerA.first_name} ${designerA.last_name}` })).toBeVisible();
	expect(screen.queryByRole('heading', { name: en.workflow.labels.effortCurve })).not.toBeInTheDocument();
	await userEvent.click(screen.getByText(en.workflow.labels.reportTimeRules));
	expect(screen.getByText(en.workflow.labels.reportSchedule)).toBeVisible();
});
