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
import { openReportPdf } from '@/utils/workflow/workflowReportExport';
import { en } from '@/translations/en';

jest.mock('@/utils/workflow/workflowReportExport', () => ({
	...jest.requireActual('@/utils/workflow/workflowReportExport'),
	openReportPdf: jest.fn().mockResolvedValue(undefined),
}));

it('offers only a PDF viewer and passes the selected scope and all report data', async () => {
	const user = userEvent.setup();
	mockProfile(manager);
	render(<DesignWorkflowShell title="Time report" variant="report-time" />);
	await selectMuiOption(user, 'Project', projectSummary.name);
	expect(screen.queryByRole('button', { name: 'Export CSV' })).not.toBeInTheDocument();
	expect(screen.queryByRole('button', { name: 'Export analytics' })).not.toBeInTheDocument();
	await user.click(screen.getByRole('button', { name: en.workflow.buttons.exportPdf }));
	expect(openReportPdf).toHaveBeenCalledWith(
		expect.objectContaining({
			scopeLabel: projectSummary.name,
			timeReport: reportRows,
			workflowReport,
			copy: expect.objectContaining({
				completionHint: en.workflow.labels.reportCompletionHint,
				remainingHint: en.workflow.labels.reportRemainingHint,
			}),
		}),
	);
});
it('flags exhausted estimates on screen', () => {
	mockProfile(manager);
	mockUseGetWorkflowReportQuery.mockReturnValue({
		data: {
			...workflowReport,
			capacity: [
				{
					...workflowReport.capacity[0],
					remaining_minutes: 0,
					load_percent: null,
					forecast_days: null,
					exhausted_estimate_tasks: 1,
					risk: 'high',
				},
			],
		},
	});
	render(<DesignWorkflowShell title="Time report" variant="report-time" />);
	expect(screen.getByText(en.workflow.labels.reportReestimate)).toBeVisible();
	expect(screen.getByText(`1 ${en.workflow.labels.reportExhaustedTasks}`)).toBeVisible();
	expect(document.querySelector('.workflow-report-load')).toHaveTextContent('—');
});
it.each([
	['PDF_POPUP_BLOCKED', 'Allow pop-ups to open the PDF.'],
	['Font generation failure', 'Could not generate the PDF. Please try again.'],
])('explains the actual PDF error: %s', async (error, message) => {
	mockProfile(manager);
	jest.mocked(openReportPdf).mockRejectedValueOnce(new Error(error));
	render(<DesignWorkflowShell title="Time report" variant="report-time" />);
	await userEvent.click(screen.getByRole('button', { name: en.workflow.buttons.exportPdf }));
	await waitFor(() => expect(mockOnError).toHaveBeenCalledWith(message));
});
it.each(['time-loading', 'analytics-loading', 'time-error', 'analytics-error', 'missing-data'])(
	'prevents incomplete or stale exports during %s',
	(state) => {
		mockProfile(manager);
		mockUseGetTimeReportQuery.mockReturnValue({
			data: reportRows,
			isFetching: state === 'time-loading',
			isError: state === 'time-error',
		});
		mockUseGetWorkflowReportQuery.mockReturnValue({
			data: state === 'missing-data' ? undefined : workflowReport,
			isFetching: state === 'analytics-loading',
			isError: state === 'analytics-error',
		});
		render(<DesignWorkflowShell title="Time report" variant="report-time" />);
		expect(screen.getByRole('button', { name: en.workflow.buttons.exportPdf })).toBeDisabled();
	},
);

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
