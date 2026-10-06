import {
	mockSend,
	mockMutation,
	mockProjects,
	mockThreads,
	message,
	thread,
	peer,
	owner,
} from '@/components/design-workflow/__testutils__/chatTestSetup';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import DesignWorkflowChat from '@/components/pages/design-workflow/designWorkflowChat';
import { useChatController } from './useChatController';
import type { ProjectSummary } from '@/types/designWorkflowTypes';
import { WORK_DAY_MINUTES } from '@/utils/rawData';

describe('chat actions', () => {
	beforeEach(() => {
		mockMutation.mockImplementation(() => ({ unwrap: async () => ({}) }));
	});

	it('ignores an empty message, sends trimmed replies and clears only successful submissions', async () => {
		const { result } = renderHook(useChatController);
		mockMutation.mockClear();
		await act(() => result.current.submit());
		expect(mockMutation).not.toHaveBeenCalled();
		act(() => {
			result.current.setBody('  Ready  ');
			result.current.setReplyTarget(message(100, 'Original'));
		});
		await act(() => result.current.submit());
		const payload = mockMutation.mock.calls[0][0] as unknown as { threadId: number; data: FormData };
		expect(payload.threadId).toBe(10);
		expect(payload.data.get('body')).toBe('Ready');
		expect(payload.data.get('reply_to_id')).toBe('100');
		expect(result.current.body).toBe('');
		expect(result.current.replyTarget).toBeNull();
		act(() => result.current.setBody('Retry later'));
		mockMutation.mockReturnValueOnce({
			unwrap: async () => {
				throw new Error('Unavailable');
			},
		});
		await act(() => result.current.submit());
		expect(result.current.body).toBe('Retry later');
	});

	it('inserts mention and reference tokens and translates status labels', () => {
		const { result } = renderHook(useChatController);
		act(() => result.current.setBody('Hello @pe'));
		act(() => result.current.insertMention(peer));
		expect(result.current.body).toBe('Hello @peer ');
		act(() => result.current.setBody('See #pl'));
		act(() => result.current.insertReference({ kind: 'task', id: 12, title: 'Étage Plans' }));
		expect(result.current.body).toBe('See #etage-plans ');
		expect(result.current.statusLabelFor('done')).toBe(result.current.t.workflow.statuses.done);
		expect(result.current.statusLabelFor('custom')).toBe('custom');
		expect(result.current.statusLabelFor(null)).toBe('');
	});

	it('reuses existing private rooms, prevents self-chat and creates missing rooms', async () => {
		const { result } = renderHook(useChatController);
		mockMutation.mockClear();
		await act(() => result.current.startPrivateThread(owner));
		expect(mockMutation).not.toHaveBeenCalled();
		await act(() => result.current.startPrivateThread(peer));
		expect(result.current.selectedThread?.id).toBe(20);
		expect(mockMutation).not.toHaveBeenCalled();
		const newPeer = { ...peer, id: 3 };
		mockMutation.mockReturnValueOnce({
			unwrap: async () => ({ ...thread(30, 'private'), participants: [owner, newPeer] }),
		});
		await act(() => result.current.startPrivateThread(newPeer));
		expect(mockMutation).toHaveBeenCalledWith({ kind: 'private', recipient_id: 3 });
		expect(result.current.selectedThread?.id).toBe(30);
	});

	it('reuses existing project rooms and creates missing project rooms', async () => {
		const project = { id: 7, name: 'Villa' } as ProjectSummary;
		mockThreads.push({ ...thread(40, 'project'), project });
		const { result } = renderHook(useChatController);
		mockMutation.mockClear();
		await act(() => result.current.startProjectThread(project));
		expect(result.current.selectedThread?.id).toBe(40);
		expect(mockMutation).not.toHaveBeenCalled();
		mockMutation.mockReturnValueOnce({
			unwrap: async () => ({ ...thread(50, 'project'), project: { ...project, id: 8 } }),
		});
		await act(() => result.current.startProjectThread({ ...project, id: 8 }));
		expect(mockMutation).toHaveBeenCalledWith({ kind: 'project', project_id: 8 });
		expect(result.current.selectedThread?.id).toBe(50);
	});

	it('validates edited messages and deletes only a confirmed live message', async () => {
		const { result } = renderHook(useChatController);
		mockMutation.mockClear();
		await act(() => result.current.submitEdit());
		await act(() => result.current.confirmDeleteMessage());
		expect(mockMutation).not.toHaveBeenCalled();
		act(() => {
			result.current.setEditingMessage(message(100, 'Old'));
			result.current.setEditText(' ');
		});
		await act(() => result.current.submitEdit());
		expect(mockMutation).not.toHaveBeenCalled();
		act(() => result.current.setEditText(' New body '));
		await act(() => result.current.submitEdit());
		expect(mockMutation).toHaveBeenCalledWith({ id: 100, body: 'New body' });
		expect(result.current.editingMessage).toBeNull();
		act(() => result.current.setDeleteTargetMessage({ ...message(100, 'Old'), is_deleted: true }));
		mockMutation.mockClear();
		await act(() => result.current.confirmDeleteMessage());
		expect(mockMutation).not.toHaveBeenCalled();
		act(() => result.current.setDeleteTargetMessage(message(100, 'Old')));
		await act(() => result.current.confirmDeleteMessage());
		expect(mockMutation).toHaveBeenCalledWith(100);
		expect(result.current.deleteTargetMessage).toBeNull();
	});

	it('submits selected reminder dates and resets the dialog after success', async () => {
		const { result } = renderHook(useChatController);
		act(() => result.current.openReminder(message(100, 'Call client')));
		expect(result.current.reminderDraft.note).toBe('');
		act(() =>
			result.current.setReminderDraft({ taskId: '12', remindDate: '2026-10-08', remindTime: '09:30', note: 'Call' }),
		);
		await act(() => result.current.submitReminder());
		expect(mockMutation).toHaveBeenCalledWith({
			id: 100,
			task_id: 12,
			remind_at: new Date('2026-10-08T09:30').toISOString(),
			note: 'Call',
		});
		expect(result.current.reminderMessage).toBeNull();
		expect(result.current.reminderDraft).toEqual({ taskId: '', remindDate: '', remindTime: '', note: '' });
	});

	it('requires a writable project and title to create a task, uses one working day and links the source', async () => {
		mockProjects.push({ id: 7, name: 'Villa', can_work: true, archived: false } as ProjectSummary);
		const { result } = renderHook(useChatController);
		act(() => result.current.openCreateTaskFromMessage(message(100, 'Prepare plans')));
		expect(result.current.taskDraft).toEqual({ title: '', description: '', projectId: '' });
		mockMutation.mockClear();
		await act(() => result.current.submitTaskFromMessage());
		expect(mockMutation).not.toHaveBeenCalled();
		act(() => result.current.setTaskDraft({ title: ' Plans ', description: ' For 2026-10-08 ', projectId: '999' }));
		await act(() => result.current.submitTaskFromMessage());
		expect(mockMutation).not.toHaveBeenCalled();
		act(() => result.current.setTaskDraft({ title: ' Plans ', description: ' For 2026-10-08 ', projectId: '7' }));
		mockMutation.mockReturnValueOnce({ unwrap: async () => ({ id: 12, title: 'Plans' }) });
		await act(() => result.current.submitTaskFromMessage());
		expect(mockMutation).toHaveBeenCalledWith(
			expect.objectContaining({
				project_id: 7,
				title: 'Plans',
				description: 'For 2026-10-08',
				current_assignee_id: owner.id,
				source_chat_message_id: 100,
				estimated_minutes: WORK_DAY_MINUTES,
				due_date: '2026-10-08',
			}),
		);
		expect(result.current.taskModalOpen).toBe(false);
		expect(result.current.body).toBe('#plans ');
	});
});

describe('voice recording lifecycle', () => {
	const originalDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
	const originalRecorder = Object.getOwnPropertyDescriptor(globalThis, 'MediaRecorder');
	const originalCreateUrl = URL.createObjectURL;
	const originalRevokeUrl = URL.revokeObjectURL;
	const stopTrack = jest.fn();
	const stream = { getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream;
	const getUserMedia = jest.fn();
	const recorders: FakeRecorder[] = [];
	class FakeRecorder {
		state = 'inactive';
		mimeType = 'audio/webm';
		ondataavailable: ((event: { data: Blob }) => void) | null = null;
		onstop: (() => void) | null = null;
		constructor(public stream: MediaStream) {
			recorders.push(this);
		}
		start() {
			this.state = 'recording';
		}
		stop() {
			this.state = 'inactive';
			this.ondataavailable?.({ data: new Blob(['audio'], { type: this.mimeType }) });
			this.onstop?.();
		}
	}
	beforeEach(() => {
		recorders.length = 0;
		getUserMedia.mockReset().mockResolvedValue(stream);
		Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
		Object.defineProperty(globalThis, 'MediaRecorder', { configurable: true, value: FakeRecorder });
		URL.createObjectURL = jest.fn((file: Blob) => `blob:${(file as File).name}`);
		URL.revokeObjectURL = jest.fn();
	});
	afterEach(() => {
		cleanup();
		if (originalDevices) Object.defineProperty(navigator, 'mediaDevices', originalDevices);
		else Reflect.deleteProperty(navigator, 'mediaDevices');
		if (originalRecorder) Object.defineProperty(globalThis, 'MediaRecorder', originalRecorder);
		else Reflect.deleteProperty(globalThis, 'MediaRecorder');
		URL.createObjectURL = originalCreateUrl;
		URL.revokeObjectURL = originalRevokeUrl;
	});

	it('creates one preview per recording and preserves existing file previews under Strict Mode', async () => {
		render(
			<StrictMode>
				<DesignWorkflowChat />
			</StrictMode>,
		);
		const input = document.querySelector<HTMLInputElement>('.workflow-chat-composer input[type="file"]')!;
		fireEvent.change(input, { target: { files: [new File(['image'], 'image.png', { type: 'image/png' })] } });
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: /voice note/i }));
		});
		fireEvent.click(screen.getByRole('button', { name: /finish/i }));
		expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
		expect(URL.revokeObjectURL).not.toHaveBeenCalled();
		expect(stopTrack).toHaveBeenCalledTimes(1);
		expect(document.querySelector('.workflow-chat-voice-draft audio')).toBeInTheDocument();
	});

	it('stops the microphone and discards unfinished recording when changing conversations', async () => {
		render(
			<StrictMode>
				<DesignWorkflowChat />
			</StrictMode>,
		);
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: /voice note/i }));
		});
		fireEvent.click(screen.getByRole('button', { name: /Peer Local/ }));
		expect(stopTrack).toHaveBeenCalledTimes(1);
		expect(recorders[0].state).toBe('inactive');
		expect(document.querySelector('.workflow-chat-recording-strip')).not.toBeInTheDocument();
		expect(URL.createObjectURL).not.toHaveBeenCalled();
		expect(mockSend).toHaveBeenCalledWith({ type: 'chat.recording', thread_id: 10, is_recording: false });
	});

	it('stops the microphone when unmounted', async () => {
		const { unmount } = render(<DesignWorkflowChat />);
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: /voice note/i }));
		});
		unmount();
		expect(stopTrack).toHaveBeenCalledTimes(1);
		expect(URL.createObjectURL).not.toHaveBeenCalled();
	});

	it('deduplicates permission requests and releases a late microphone stream after unmount', async () => {
		let resolve!: (value: MediaStream) => void;
		getUserMedia.mockReturnValueOnce(
			new Promise<MediaStream>((done) => {
				resolve = done;
			}),
		);
		const { unmount } = render(<DesignWorkflowChat />);
		fireEvent.click(screen.getByRole('button', { name: /voice note/i }));
		fireEvent.click(screen.getByRole('button', { name: /voice note/i }));
		expect(getUserMedia).toHaveBeenCalledTimes(1);
		unmount();
		await act(async () => {
			resolve(stream);
		});
		expect(stopTrack).toHaveBeenCalledTimes(1);
		expect(recorders).toHaveLength(0);
	});
});
