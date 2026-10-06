import { render, screen } from '@testing-library/react';
import { WorkflowReportDuration } from './workflowReportDuration';

it('shows equivalent days with exact hours alongside', () => {
	render(<WorkflowReportDuration minutes={2220} locale="fr" />);
	expect(screen.getByText('4 j 5 h')).toBeVisible();
	expect(screen.getByText('37 h')).toBeVisible();
});

it('does not duplicate short durations and preserves negative differences', () => {
	const { rerender } = render(<WorkflowReportDuration minutes={240} locale="fr" />);
	expect(screen.getAllByText('4 h')).toHaveLength(1);
	rerender(<WorkflowReportDuration minutes={-540} locale="en" />);
	expect(screen.getByText('−1 d 1 h')).toBeVisible();
	expect(screen.getByText('−9 h')).toBeVisible();
});
