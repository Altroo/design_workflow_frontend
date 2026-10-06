import { message, owner, peer, thread } from '@/components/design-workflow/__testutils__/chatTestSetup';
import {
	dedupeMessages,
	detectDueDate,
	extractReferenceIds,
	fileIconLabel,
	formatAudioDuration,
	formatDayLabel,
	formatTime,
	isAudioAttachment,
	isImageAttachment,
	isSocketRecord,
	mentionTokenFor,
	linkedReferencesForBody,
	readableReferenceText,
	referenceSlugFor,
	resolveMediaUrl,
	scrollToMessage,
	sectionForThread,
	threadPreview,
	threadTitle,
	tomorrowIsoDate,
	userLabel,
} from './chatHelpers';
import type { ProjectSummary, TaskCard } from '@/types/designWorkflowTypes';

it('formats audio durations safely and identifies file types', () => {
	expect([NaN, Infinity, -1, 0, 65.9].map(formatAudioDuration)).toEqual(['0:00', '0:00', '0:00', '0:00', '1:05']);
	expect(isAudioAttachment('', 'recording.M4A')).toBe(true);
	expect(isImageAttachment('image/png', 'render')).toBe(true);
	expect(isImageAttachment('', 'plan.pdf')).toBe(false);
	expect(fileIconLabel('presentation.pdf')).toBe('PDF');
	expect(resolveMediaUrl('blob:preview')).toBe('blob:preview');
	expect(resolveMediaUrl('https://example.test/a.png')).toBe('https://example.test/a.png');
});

it('builds readable names and stable reference tokens', () => {
	expect(userLabel({ ...owner, first_name: '', last_name: '' })).toBe(owner.email);
	expect(mentionTokenFor(owner)).toBe('owner');
	expect(referenceSlugFor('Étage / Plans !')).toBe('etage-plans');
	expect(referenceSlugFor('!!!')).toBe('reference');
	expect(extractReferenceIds('Please see #T12 and #p7')).toEqual({ taskIds: [12], projectIds: [7] });
	expect(isSocketRecord(null)).toBe(false);
	expect(isSocketRecord({ type: 'chat.message' })).toBe(true);
});

it('uses current-user-aware thread titles and previews', () => {
	expect(threadTitle(thread(10, 'private'), owner.id)).toBe('Peer Local');
	expect(sectionForThread(thread(10, 'project'))).toBe('projects');
	expect(sectionForThread(thread(10, 'private'))).toBe('direct');
	const labels = { deleted: 'Deleted', photo: 'Photo', attachment: 'File', noMessage: 'Empty', you: 'You' };
	expect(threadPreview(thread(10, 'public'), owner.id, labels).text).toBe('Empty');
	expect(threadPreview({ ...thread(10, 'public'), last_message: message(1, 'Hello') }, owner.id, labels).text).toBe(
		'You: Hello',
	);
	expect(
		threadPreview(
			{ ...thread(10, 'public'), last_message: { ...message(1, 'Secret'), sender: peer, is_deleted: true } },
			owner.id,
			labels,
		).text,
	).toBe('Deleted');
});

it('deduplicates messages by id without changing the first snapshot or input order', () => {
	const items = [message(1, 'new'), message(2, 'second'), message(1, 'old')];
	expect(dedupeMessages(items).map((item) => item.body)).toEqual(['new', 'second']);
	expect(items).toHaveLength(3);
});

it('handles localized relative dates and clears the temporary scroll highlight', () => {
	jest.useFakeTimers().setSystemTime(new Date('2026-10-06T12:00:00Z'));
	const element = document.createElement('div');
	element.id = 'chat-message-1';
	document.body.append(element);
	try {
		expect(detectDueDate('Pour demain')).toBe('2026-10-07');
		expect(detectDueDate('Deadline 2026-11-05')).toBe('2026-11-05');
		expect(formatDayLabel('2026-10-06T10:00:00Z', 'Today', 'Yesterday', 'en')).toBe('Today');
		scrollToMessage(1);
		expect(element).toHaveClass('is-highlighted');
		jest.advanceTimersByTime(1500);
		expect(element).not.toHaveClass('is-highlighted');
	} finally {
		element.remove();
		jest.useRealTimers();
	}
});

it('resolves both legacy IDs and named references without replacing unknown references', () => {
	const tasks = [{ id: 12, title: 'Étage Plans' }] as TaskCard[];
	const projects = [{ id: 7, name: 'New Villa' }] as ProjectSummary[];
	expect(extractReferenceIds('#etage-plans #NEW-VILLA #unknown #T12 #P7', tasks, projects)).toEqual({
		taskIds: [12, 12],
		projectIds: [7, 7],
	});
	expect(readableReferenceText('  #T12\n #P7 #etage-plans #new-villa #T999 #unknown  ', tasks, projects)).toBe(
		'Étage Plans New Villa Étage Plans New Villa #T999 #unknown',
	);
	expect(readableReferenceText('#T12 #P7')).toBe('#T12 #P7');
	expect(linkedReferencesForBody('#T12 #etage-plans #new-villa', tasks, projects)).toEqual({ tasks, projects });
	expect(linkedReferencesForBody('No references', tasks, projects)).toEqual({ tasks: [], projects: [] });
	expect(referenceSlugFor('a'.repeat(100))).toHaveLength(64);
});

it('provides titles and accordion sections for all room kinds and missing peers', () => {
	expect(threadTitle(thread(1, 'public'), owner.id, 'Public room')).toBe('Public room');
	expect(threadTitle({ ...thread(1, 'project'), project: { id: 7, name: 'Villa' } as ProjectSummary }, owner.id)).toBe(
		'Villa',
	);
	expect(threadTitle({ ...thread(1, 'task'), task: { id: 12, title: 'Plans' } as TaskCard }, owner.id)).toBe('Plans');
	for (const kind of ['project', 'task', 'private'] as const) {
		const room = { ...thread(1, kind), participants: [], project: null, task: null, title: 'Custom room' };
		expect(threadTitle(room, owner.id)).toBe('Custom room');
		expect(threadTitle({ ...room, title: '' }, owner.id, 'Public', 'Private', 'Project', 'Task')).toBe(
			{ project: 'Project', task: 'Task', private: 'Private' }[kind],
		);
	}
	expect(sectionForThread(null)).toBe('studio');
	expect(sectionForThread(thread(1, 'task'))).toBe('studio');
});

it('previews photos, generic files, blank bodies and readable task references', () => {
	const labels = { deleted: 'Deleted', photo: 'Photo', attachment: 'File', noMessage: 'Empty', you: 'You' };
	const preview = (changes: Partial<ReturnType<typeof message>>) =>
		threadPreview({ ...thread(1, 'public'), last_message: { ...message(1, ''), ...changes } }, owner.id, labels, [
			{ id: 12, title: 'Plans' },
		] as TaskCard[]);
	expect(preview({ body: ' #T12 ' })).toEqual({ text: 'You: Plans', kind: 'text' });
	expect(preview({ sender: peer })).toEqual({ text: 'Empty', kind: 'text' });
	const attachment = {
		id: 1,
		name: 'picture.PNG',
		mime_type: '',
		file: '/picture.PNG',
		file_url: null,
		size: 1,
		created_at: '',
		updated_at: '',
	};
	expect(preview({ attachments: [attachment] })).toEqual({ text: 'You: Photo', kind: 'photo' });
	expect(
		preview({ attachments: [{ ...attachment, name: 'brief.pdf', file_url: '/brief.pdf' }], sender: peer }),
	).toEqual({ text: 'File', kind: 'attachment' });
	expect(preview({ attachments: [attachment], is_deleted: true })).toEqual({ text: 'You: Deleted', kind: 'text' });
});

it('handles media fallbacks and rejects primitive socket payloads', () => {
	const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
	expect(resolveMediaUrl(null)).toBe('');
	expect(resolveMediaUrl('media/photo.png')).toBe(`${apiUrl}/media/photo.png`);
	expect(resolveMediaUrl('/media/photo.png')).toBe(`${apiUrl}/media/photo.png`);
	expect(resolveMediaUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
	expect(isImageAttachment('', '', '/photo.JPG')).toBe(true);
	expect(isImageAttachment('', '')).toBe(false);
	expect(isAudioAttachment('audio/webm', '')).toBe(true);
	expect(isAudioAttachment('', '', '/voice.ogg')).toBe(true);
	expect(isAudioAttachment('', '')).toBe(false);
	expect(fileIconLabel('')).toBe('FILE');
	for (const value of [undefined, 'message', 1, false]) expect(isSocketRecord(value)).toBe(false);
});

it('formats localized times, yesterday and older dates, including tomorrow across year-end', () => {
	jest.useFakeTimers().setSystemTime(new Date(2026, 11, 31, 12));
	try {
		expect(tomorrowIsoDate()).toBe('2027-01-01');
		expect(detectDueDate('TOMORROW')).toBe('2027-01-01');
		expect(detectDueDate('No deadline')).toBeNull();
		expect(formatDayLabel(new Date(2026, 11, 30, 12).toISOString(), 'Today', 'Yesterday', 'en')).toBe('Yesterday');
		const older = new Date(2026, 11, 1, 12).toISOString();
		expect(formatDayLabel(older, 'Today', 'Yesterday', 'fr')).toBe(
			new Intl.DateTimeFormat('fr', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(older)),
		);
		expect(formatTime(older, 'fr')).toBe(
			new Intl.DateTimeFormat('fr', { hour: '2-digit', minute: '2-digit' }).format(new Date(older)),
		);
		expect(() => scrollToMessage(999)).not.toThrow();
		expect(jest.getTimerCount()).toBe(0);
	} finally {
		jest.useRealTimers();
	}
});
