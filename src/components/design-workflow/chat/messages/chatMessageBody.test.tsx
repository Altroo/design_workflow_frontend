import { boardTask, designerA, projectSummary } from '@/components/design-workflow/__testutils__/workflowTestSetup';
import { render, screen } from '@testing-library/react';
import { renderLinkedMessageBody } from './chatMessageBody';
import { DASHBOARD_PROJECT_VIEW, DASHBOARD_TASK_VIEW } from '@/utils/routes';

it('renders known mentions and project/card references with their destination links', () => {
	render(
		<p>
			{renderLinkedMessageBody(
				'Ask @dina about #T501 and #showroom-refresh',
				[designerA],
				[boardTask],
				[projectSummary],
			)}
		</p>,
	);
	expect(screen.getByText('@Dina Designer')).toBeInTheDocument();
	expect(screen.getByRole('link', { name: `#${boardTask.title}` })).toHaveAttribute('href', DASHBOARD_TASK_VIEW(501));
	expect(screen.getByRole('link', { name: `#${projectSummary.name}` })).toHaveAttribute(
		'href',
		DASHBOARD_PROJECT_VIEW(101),
	);
});
it('leaves unknown references and HTML as inert text', () => {
	const { container } = render(
		<p>{renderLinkedMessageBody('<strong>Untrusted</strong> @unknown #T999', [], [], [])}</p>,
	);
	expect(container).toHaveTextContent('<strong>Untrusted</strong> @unknown #T999');
	expect(container.querySelector('strong')).toBeNull();
	expect(screen.queryByRole('link')).not.toBeInTheDocument();
});
