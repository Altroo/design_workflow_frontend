import {
	mockUploadTaskAttachment,
	mockUseGetTaskQuery,
	mockUseGetTasksQuery,
	designerB,
	designerA,
	boardTask,
	reviewAttachment,
	reviewTaskDetail,
	mockProfile,
} from '@/components/design-workflow/__testutils__/workflowTestSetup';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DesignWorkflowShell from '@/components/pages/design-workflow/designWorkflowShell';

it('uses thumbnails for the file list and annotation workspace', async () => {
	const user = userEvent.setup();
	mockProfile(designerA);
	mockUseGetTaskQuery.mockReturnValue({ data: reviewTaskDetail, isLoading: false });
	render(<DesignWorkflowShell title="Task detail" variant="task-detail" taskId={reviewTaskDetail.id} />);
	await user.click(screen.getByRole('tab', { name: 'Files' }));
	const panel = document.querySelector('.workflow-files-panel') as HTMLElement;
	const images = within(panel).getAllByRole('img', { name: reviewAttachment.name });
	expect(images).toHaveLength(2);
	for (const image of images)
		expect(image).toHaveAttribute('src', expect.stringContaining(reviewAttachment.thumbnail_url));
});

it('does not expose upload controls to a designer viewing someone else’s task', async () => {
	const user = userEvent.setup();
	mockProfile(designerB);
	mockUseGetTasksQuery.mockReturnValue({ data: [{ ...boardTask, can_edit: false }], isLoading: false });
	mockUseGetTaskQuery.mockReturnValue({ data: { ...reviewTaskDetail, can_edit: false }, isLoading: false });
	render(<DesignWorkflowShell title="Board" variant="board" />);
	await user.click(screen.getByTestId(`board-task-${boardTask.id}`));
	expect(within(screen.getByRole('dialog')).getByRole('link', { name: reviewAttachment.name })).toBeInTheDocument();
	expect(within(screen.getByRole('dialog')).queryByRole('button', { name: /^Attachments$/ })).not.toBeInTheDocument();
	expect(screen.queryByTestId('task-attachment-picker')).not.toBeInTheDocument();
	expect(mockUploadTaskAttachment).not.toHaveBeenCalled();
});
