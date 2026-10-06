import { render, screen } from '@testing-library/react';
import {
	WorkflowIconPill,
	WorkflowMetricCard,
	WorkflowPageHero,
	WorkflowPanelPill,
	WorkflowSimpleMetric,
} from './workflowPrimitives';

it('preserves semantic heading levels and interactive page actions', () => {
	render(
		<WorkflowPageHero
			className="hero"
			title="Projects"
			titleElement="h2"
			description="All projects"
			actions={<button>New project</button>}
		/>,
	);
	expect(screen.getByRole('heading', { level: 2, name: 'Projects' })).toBeInTheDocument();
	expect(screen.getByRole('button', { name: 'New project' })).toBeInTheDocument();
});

it('renders metric values and semantic tones without dropping zero values', () => {
	const { container } = render(
		<>
			<WorkflowMetricCard icon={<span />} label="Open" value={0} tone="green" />
			<WorkflowSimpleMetric className="simple" icon={<span />} label="Hours" value={2} tone="amber" />
			<WorkflowPanelPill label="People" value={3} />
			<WorkflowIconPill label="Active" icon={<span />} tone="green" />
		</>,
	);
	expect(screen.getByText('0')).toBeInTheDocument();
	expect(container.querySelector('[data-tone="green"]')).toBeInTheDocument();
	expect(screen.getByText('People')).toBeInTheDocument();
	expect(screen.getByText('Active')).toBeInTheDocument();
});
