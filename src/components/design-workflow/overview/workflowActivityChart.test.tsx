import { summary } from '@/components/design-workflow/__testutils__/workflowTestSetup';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fr } from '@/translations/fr';
import { WorkflowActivityChart } from './workflowActivityChart';

const props = { labels: fr.workflow.labels, locale: 'fr-FR', textColor: '#475569' };

it('shows real totals and exposes the underlying daily numbers', async () => {
	render(<WorkflowActivityChart {...props} summary={summary} />);
	expect(screen.getByText('4')).toBeVisible();
	expect(screen.getByText('3', { selector: 'strong' })).toBeVisible();
	expect(screen.getByTestId('line-chart')).toBeVisible();
	await userEvent.click(screen.getByText(fr.workflow.labels.overviewDailyDetails));
	const table = screen.getByRole('table');
	expect(within(table).getAllByRole('row')).toHaveLength(3);
	expect(within(table).getByText('22 avr. 2026')).toBeVisible();
	expect(screen.getByText(fr.workflow.labels.overviewActivityWhy)).toBeVisible();
});

it('distinguishes unavailable, loading and genuinely empty activity', () => {
	const { rerender } = render(<WorkflowActivityChart {...props} loading />);
	expect(screen.getByRole('status')).toHaveTextContent(fr.workflow.labels.overviewLoading);
	rerender(<WorkflowActivityChart {...props} />);
	expect(screen.getByRole('status')).toHaveTextContent(fr.workflow.labels.overviewDataUnavailable);
	rerender(
		<WorkflowActivityChart
			{...props}
			summary={{ ...summary, daily_activity: [{ date: '2026-10-06', created: 0, completed: 0 }] }}
		/>,
	);
	expect(screen.getByText(fr.workflow.labels.overviewNoActivity)).toBeVisible();
	expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
});
