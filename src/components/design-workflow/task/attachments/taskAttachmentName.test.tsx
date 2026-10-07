import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { en } from '@/translations/en';
import { fr } from '@/translations/fr';
import { TaskAttachmentName } from './taskAttachmentName';

const mockRename = jest.fn();
const mockSuccess = jest.fn();
const mockError = jest.fn();
let mockLoading = false;
let mockTranslation = en;
jest.mock('@/store/services/designWorkflow', () => ({
	useRenameTaskAttachmentMutation: () => [mockRename, { isLoading: mockLoading }],
}));
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({ t: mockTranslation }),
	useToast: () => ({ onSuccess: mockSuccess, onError: mockError }),
}));
const props = {
	taskId: 12,
	attachment: { id: 5, name: 'original.pdf' },
	href: '/media/original.pdf',
	mutable: true,
};
beforeEach(() => {
	jest.clearAllMocks();
	mockLoading = false;
	mockTranslation = en;
	mockRename.mockReturnValue({ unwrap: () => Promise.resolve({ name: 'Final brief' }) });
});

it('prefills the current name and submits a trimmed label without changing the download link', async () => {
	const user = userEvent.setup();
	render(<TaskAttachmentName {...props} />);
	expect(screen.getByRole('link')).toHaveAttribute('href', props.href);
	await user.click(screen.getByRole('button', { name: 'Rename attachment: original.pdf' }));
	const input = screen.getByRole('textbox', { name: 'Attachment name' });
	expect(input).toHaveValue('original.pdf');
	expect(input).toHaveFocus();
	expect(input).toHaveAttribute('maxlength', '255');
	await user.clear(input);
	await user.type(input, '  Final brief  {Enter}');
	await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith(en.workflow.labels.attachmentRenamed));
	expect(mockRename).toHaveBeenCalledWith({ id: 12, attachmentId: 5, name: 'Final brief' });
	expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
	expect(screen.getByRole('link')).toHaveAttribute('href', props.href);
});

it('cancels with Escape without closing the parent card or sending a request', async () => {
	const user = userEvent.setup();
	const parentKey = jest.fn();
	render(
		<div onKeyDown={parentKey}>
			<TaskAttachmentName {...props} />
		</div>,
	);
	await user.click(screen.getByRole('button', { name: /Rename attachment/ }));
	await user.clear(screen.getByRole('textbox'));
	await user.type(screen.getByRole('textbox'), 'Draft');
	parentKey.mockClear();
	await user.keyboard('{Escape}');
	expect(parentKey).not.toHaveBeenCalled();
	expect(mockRename).not.toHaveBeenCalled();
	expect(screen.getByRole('link')).toHaveTextContent('original.pdf');
});

it('blocks empty names and treats unchanged names as a no-op', async () => {
	const user = userEvent.setup();
	render(<TaskAttachmentName {...props} />);
	await user.click(screen.getByRole('button', { name: /Rename attachment/ }));
	await user.clear(screen.getByRole('textbox'));
	await user.type(screen.getByRole('textbox'), '   ');
	expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
	await user.clear(screen.getByRole('textbox'));
	await user.type(screen.getByRole('textbox'), 'original.pdf');
	await user.click(screen.getByRole('button', { name: 'Save' }));
	expect(mockRename).not.toHaveBeenCalled();
	expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});

it('keeps the draft on errors and on live refresh, and permits a retry', async () => {
	const user = userEvent.setup();
	mockRename.mockReturnValueOnce({ unwrap: () => Promise.reject({ status: 500 }) });
	const { rerender } = render(<TaskAttachmentName {...props} />);
	await user.click(screen.getByRole('button', { name: /Rename attachment/ }));
	await user.clear(screen.getByRole('textbox'));
	await user.type(screen.getByRole('textbox'), 'My draft');
	rerender(<TaskAttachmentName {...props} attachment={{ id: 5, name: 'Remote rename' }} />);
	expect(screen.getByRole('textbox')).toHaveValue('My draft');
	await user.click(screen.getByRole('button', { name: 'Save' }));
	expect(mockError).toHaveBeenCalledWith(en.workflow.labels.attachmentRenameError);
	expect(screen.getByRole('textbox')).toHaveValue('My draft');
	await user.click(screen.getByRole('button', { name: 'Save' }));
	expect(mockRename).toHaveBeenCalledTimes(2);
	await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument());
});

it('locks repeat submissions until the save resolves', async () => {
	let resolve!: () => void;
	mockRename.mockReturnValue({
		unwrap: () =>
			new Promise<void>((done) => {
				resolve = done;
			}),
	});
	const user = userEvent.setup();
	render(<TaskAttachmentName {...props} />);
	await user.click(screen.getByRole('button', { name: /Rename attachment/ }));
	const input = screen.getByRole('textbox');
	await user.clear(input);
	await user.type(input, 'Pending');
	fireEvent.submit(input.closest('form')!);
	fireEvent.submit(input.closest('form')!);
	expect(mockRename).toHaveBeenCalledTimes(1);
	await user.click(screen.getByRole('button', { name: 'Cancel' }));
	expect(input).toBeInTheDocument();
	await act(async () => resolve());
	expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});

it('hides editing for read-only users, including when access is removed mid-edit', async () => {
	const user = userEvent.setup();
	const { rerender } = render(<TaskAttachmentName {...props} />);
	await user.click(screen.getByRole('button', { name: /Rename attachment/ }));
	rerender(<TaskAttachmentName {...props} mutable={false} />);
	expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
	expect(screen.queryByRole('button')).not.toBeInTheDocument();
	expect(screen.getByRole('link')).toHaveAttribute('href', props.href);
});

it('uses French labels and disables fields while saving', async () => {
	mockTranslation = fr;
	const user = userEvent.setup();
	const { rerender } = render(<TaskAttachmentName {...props} />);
	await user.click(screen.getByRole('button', { name: 'Renommer la pièce jointe: original.pdf' }));
	expect(screen.getByRole('textbox', { name: 'Nom de la pièce jointe' })).toBeInTheDocument();
	mockLoading = true;
	rerender(<TaskAttachmentName {...props} />);
	expect(screen.getByRole('textbox')).toBeDisabled();
	expect(screen.getByRole('button', { name: fr.workflow.buttons.saving })).toBeDisabled();
	expect(screen.getByRole('button', { name: fr.common.cancel })).toBeDisabled();
});
