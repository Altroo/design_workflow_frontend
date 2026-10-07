import {
	mockUpdateTaskReview,
	mockCreateTaskVersion,
	mockCreateAttachmentAnnotation,
	mockUseGetAttachmentAnnotationsQuery,
	mockUseGetTaskQuery,
	manager,
	taskDetail,
	reviewAttachment,
	reviewTaskDetail,
	reviewAnnotations,
	mockProfile,
	mockRenameTaskAttachment,
} from '@/components/design-workflow/__testutils__/workflowTestSetup';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DesignWorkflowShell from '@/components/pages/design-workflow/designWorkflowShell';

it('renames attachments from the full task page', async () => {
	const user = userEvent.setup();
	mockProfile(manager);
	mockUseGetTaskQuery.mockReturnValue({ data: reviewTaskDetail, isLoading: false });
	render(<DesignWorkflowShell title="Task detail" variant="task-detail" taskId={taskDetail.id} />);
	await user.click(screen.getByRole('button', { name: `Rename attachment: ${reviewAttachment.name}` }));
	const input = screen.getByRole('textbox', { name: 'Attachment name' });
	await user.clear(input);
	await user.type(input, 'Approved materials{Enter}');
	await waitFor(() =>
		expect(mockRenameTaskAttachment).toHaveBeenCalledWith({
			id: taskDetail.id,
			attachmentId: reviewAttachment.id,
			name: 'Approved materials',
		}),
	);
});

it('covers task review versions and file annotations', async () => {
	const user = userEvent.setup();
	mockProfile(manager);
	mockUseGetTaskQuery.mockReturnValue({ data: reviewTaskDetail, isLoading: false });
	mockUseGetAttachmentAnnotationsQuery.mockReturnValue({ data: reviewAnnotations });

	render(<DesignWorkflowShell title="Task detail" variant="task-detail" taskId={taskDetail.id} />);

	await user.click(screen.getByRole('tab', { name: 'Review' }));
	const reviewSection = screen.getByText('Approval state stays separate from board status.').closest('section');
	expect(reviewSection).not.toBeNull();
	expect(within(reviewSection as HTMLElement).getByText('Artifact versions')).toBeInTheDocument();
	expect(within(reviewSection as HTMLElement).getByText('v1')).toBeInTheDocument();

	const reviewNotes = within(reviewSection as HTMLElement).getAllByLabelText('Optional note');
	await user.type(reviewNotes[0], 'Needs final swatches');
	await user.click(within(reviewSection as HTMLElement).getByRole('button', { name: 'Request changes' }));

	await waitFor(() => {
		expect(mockUpdateTaskReview).toHaveBeenCalledWith({
			id: taskDetail.id,
			review_state: 'changes_requested',
			notes: 'Needs final swatches',
		});
	});

	await user.type(reviewNotes[1], 'Second upload for handoff');
	await user.click(within(reviewSection as HTMLElement).getByRole('button', { name: 'Add version' }));

	await waitFor(() => {
		expect(mockCreateTaskVersion).toHaveBeenCalledWith({
			id: taskDetail.id,
			attachment_id: reviewAttachment.id,
			notes: 'Second upload for handoff',
			approval_state: 'pending',
		});
	});

	await user.click(screen.getByRole('tab', { name: 'Files' }));
	const filesSection = screen.getByText('Review pins stay linked to the selected file and version.').closest('section');
	expect(filesSection).not.toBeNull();
	expect(within(filesSection as HTMLElement).getByText('material-board.png')).toBeInTheDocument();
	expect(within(filesSection as HTMLElement).getByText('Tighten palette contrast.')).toBeInTheDocument();

	await user.clear(within(filesSection as HTMLElement).getByLabelText('X %'));
	await user.type(within(filesSection as HTMLElement).getByLabelText('X %'), '35');
	await user.clear(within(filesSection as HTMLElement).getByLabelText('Y %'));
	await user.type(within(filesSection as HTMLElement).getByLabelText('Y %'), '48');
	await user.type(
		within(filesSection as HTMLElement).getByLabelText('Add comment'),
		'Align callout with fabric sample.',
	);
	await user.click(within(filesSection as HTMLElement).getByRole('button', { name: 'Add annotation' }));

	await waitFor(() => {
		expect(mockCreateAttachmentAnnotation).toHaveBeenCalledWith({
			attachmentId: reviewAttachment.id,
			version_id: null,
			x_percent: '35',
			y_percent: '48',
			body: 'Align callout with fabric sample.',
			resolved: false,
		});
	});
});
