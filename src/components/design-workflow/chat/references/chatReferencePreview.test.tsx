import { boardTask, projectSummary } from '@/components/design-workflow/__testutils__/workflowTestSetup';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { en } from '@/translations/en';
import { ChatReferencePreview } from './chatReferencePreview';
import { DASHBOARD_PROJECT_VIEW, DASHBOARD_TASK_VIEW } from '@/utils/routes';

it('links task and project previews to their own detail pages and closes independently', async () => {
	const model = {
		t: en,
		setPreviewTarget: jest.fn(),
		statusLabelFor: String,
		previewTask: boardTask,
		previewProject: undefined,
	};
	const { rerender } = render(<ChatReferencePreview model={model} />);
	expect(screen.getByRole('link', { name: en.workflow.buttons.open })).toHaveAttribute(
		'href',
		DASHBOARD_TASK_VIEW(boardTask.id),
	);
	await userEvent.setup().click(screen.getByRole('button', { name: en.common.close }));
	expect(model.setPreviewTarget).toHaveBeenCalledWith(null);
	rerender(<ChatReferencePreview model={{ ...model, previewTask: undefined, previewProject: projectSummary }} />);
	expect(screen.getByRole('link', { name: en.workflow.buttons.open })).toHaveAttribute(
		'href',
		DASHBOARD_PROJECT_VIEW(projectSummary.id),
	);
});
it('renders nothing if a previously selected reference is removed remotely', () => {
	const { container } = render(
		<ChatReferencePreview
			model={{
				t: en,
				setPreviewTarget: jest.fn(),
				statusLabelFor: String,
				previewTask: undefined,
				previewProject: undefined,
			}}
		/>,
	);
	expect(container).toBeEmptyDOMElement();
});
