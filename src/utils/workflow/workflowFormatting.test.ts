import { en } from '@/translations/en';
import {
	businessDaysBetween,
	cn,
	formatDate,
	formatDateTime,
	formatFileSize,
	formatLabel,
	formatMinutes,
	formatWorkDays,
	getApiErrorMessage,
	getDueDeliveryInfo,
	getWorkflowLabel,
	getWorkflowRiskLabel,
	isBusinessDay,
	isImageAttachment,
	normalizeUsers,
	parseLocalCalendarDate,
	resolveMediaUrl,
	startOfLocalDay,
} from './workflowFormatting';

describe('workflow labels and values', () => {
	it('resolves translated labels in precedence order and humanizes unknown keys', () => {
		const copy = {
			...en.workflow,
			statuses: { same: 'Status' },
			priorities: { same: 'Priority', high: 'High' },
			activities: { changed: 'Changed' },
			labels: { risk_high: 'High risk', same: 'Label', custom: 'Custom' },
		};
		expect(getWorkflowLabel(copy, 'same')).toBe('Status');
		expect(getWorkflowLabel(copy, 'high')).toBe('High');
		expect(getWorkflowLabel(copy, 'changed')).toBe('Changed');
		expect(getWorkflowLabel(copy, 'custom')).toBe('Custom');
		expect(getWorkflowLabel(copy, 'new_status')).toBe('New Status');
		expect(getWorkflowRiskLabel(copy, 'high')).toBe('High risk');
		expect(getWorkflowRiskLabel(copy, 'same')).toBe('Label');
		expect(getWorkflowRiskLabel({ ...copy, labels: {} }, 'high')).toBe('High');
		expect(getWorkflowRiskLabel(copy, 'changed')).toBe('Changed');
		expect(formatLabel(null)).toBe('');
		expect(cn('card', false, null, undefined, '', 'active')).toBe('card active');
	});

	it.each([
		[0, '0m'],
		[45, '45m'],
		[60, '1h'],
		[125, '2h 5m'],
		[480, '1d'],
		[960, '2d'],
	])('formats %s working minutes', (minutes, expected) => {
		expect(formatMinutes(minutes as number)).toBe(expected);
	});

	it('formats fractional work days and clamps negative totals', () => {
		expect(formatWorkDays(480)).toBe('1 days');
		expect(formatWorkDays(600, 'Jours')).toBe('1.3 jours');
		expect(formatWorkDays(-10, 'Jours')).toBe('0 jours');
	});

	it.each([
		[0, ''],
		[512, '512 B'],
		[1024, '1 KB'],
		[1536, '2 KB'],
		[1048576, '1 MB'],
		[1572864, '1.5 MB'],
	])('formats a %s-byte file', (bytes, expected) => {
		expect(formatFileSize(bytes as number)).toBe(expected);
	});
});

describe('calendar formatting', () => {
	it('uses explicit locales and empty-date labels', () => {
		const value = '2026-10-06T12:30:00Z';
		expect(formatDate(null)).toBe('No date');
		expect(formatDate('', 'Sans date', 'fr')).toBe('Sans date');
		expect(formatDate(value, '', 'fr')).toBe(new Date(value).toLocaleDateString('fr'));
		expect(formatDateTime(undefined, 'Sans date')).toBe('Sans date');
		expect(formatDateTime(value, '', 'en')).toBe(
			new Date(value).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' }),
		);
	});

	it('parses calendar dates without shifting their day and rejects rolled-over dates', () => {
		expect(parseLocalCalendarDate('2024-02-29T23:59:00Z')).toEqual(new Date(2024, 1, 29));
		for (const invalid of [undefined, null, '', 'not-a-date', '2026-02-29', '2026-13-01', '2026-00-10', '2026-01-00']) {
			expect(parseLocalCalendarDate(invalid)).toBeNull();
		}
		expect(startOfLocalDay(new Date(2026, 9, 6, 18, 30))).toEqual(new Date(2026, 9, 6));
		expect(isBusinessDay(new Date(2026, 9, 10))).toBe(true);
		expect(isBusinessDay(new Date(2026, 9, 11))).toBe(false);
		expect(businessDaysBetween(new Date(2026, 9, 6), new Date(2026, 9, 6, 18))).toBe(0);
	});

	it('distinguishes due today, soon, later and overdue deadlines, excluding Sunday', () => {
		jest.useFakeTimers().setSystemTime(new Date(2026, 9, 9, 12));
		try {
			const cases = [
				['2026-10-08', 'urgent', '1 work days overdue'],
				['2026-10-09', 'urgent', 'Due today'],
				['2026-10-10', 'warning', '1 work days left'],
				['2026-10-12', 'warning', '2 work days left'],
				['2026-10-13', 'neutral', '3 work days left'],
			];
			for (const [due_date, tone, label] of cases)
				expect(getDueDeliveryInfo({ status: 'todo', due_date }, {})).toEqual({ tone, label });
			expect(getDueDeliveryInfo({ status: 'done', due_date: '2026-10-08' }, {})).toEqual({
				tone: 'progress',
				label: 'Completed',
			});
		} finally {
			jest.useRealTimers();
		}
	});
});

describe('media and API response normalization', () => {
	it('resolves relative media paths without modifying absolute or preview URLs', () => {
		const original = process.env.NEXT_PUBLIC_API_URL;
		process.env.NEXT_PUBLIC_API_URL = 'https://api.example.test';
		try {
			expect(resolveMediaUrl()).toBe('');
			expect(resolveMediaUrl('/media/file.png')).toBe('https://api.example.test/media/file.png');
			expect(resolveMediaUrl('media/file.png')).toBe('https://api.example.test/media/file.png');
			for (const url of [
				'https://example.test/file',
				'http://example.test/file',
				'blob:preview',
				'data:image/png;base64,abc',
			])
				expect(resolveMediaUrl(url)).toBe(url);
			Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_API_URL');
			expect(resolveMediaUrl('media/file.png')).toBe('/media/file.png');
		} finally {
			if (original === undefined) Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_API_URL');
			else process.env.NEXT_PUBLIC_API_URL = original;
		}
	});

	it('recognizes image MIME types and file extensions', () => {
		expect(isImageAttachment({ mime_type: 'image/png', name: 'render' })).toBe(true);
		expect(isImageAttachment({ mime_type: '', name: 'render.AVIF' })).toBe(true);
		expect(isImageAttachment({ mime_type: 'application/pdf', name: 'brief.pdf' })).toBe(false);
	});

	it('normalizes plain and paginated users, rejects incomplete records and prioritizes avatars', () => {
		const user = {
			id: 1,
			first_name: 'Marie',
			last_name: 'Test',
			email: 'marie@example.test',
			avatar: '/photo.png',
			avatar_cropped: '/crop.png',
		};
		const expected = { ...user, role: 'designer', is_active: true, avatar: '/photo.png' };
		delete (expected as Partial<typeof expected>).avatar_cropped;
		for (const response of [[user], { results: [user] }, { data: [user] }])
			expect(normalizeUsers(response)).toEqual([expected]);
		expect(normalizeUsers()).toEqual([]);
		expect(normalizeUsers({})).toEqual([]);
		expect(normalizeUsers([{ ...user, email: undefined }])).toEqual([]);
		expect(normalizeUsers([{ ...user, avatar: null, is_staff: true, is_active: false }])[0]).toMatchObject({
			avatar: '/crop.png',
			role: 'manager',
			is_active: false,
		});
		expect(normalizeUsers([{ ...user, avatar: null, avatar_cropped: null, role: 'manager' }])[0]).toMatchObject({
			avatar: null,
			role: 'manager',
		});
	});

	it('formats nested validation details and safely falls back for unusable or recursive errors', () => {
		expect(
			getApiErrorMessage(
				{
					data: {
						details: { due_date: ['Required', 'Invalid'], non_field_errors: ['Conflict'], detail: ' Retry ' },
						message: 'Generic',
					},
				},
				'Fallback',
			),
		).toBe('Due Date: Required Invalid Conflict Retry');
		expect(getApiErrorMessage({ data: { details: [{ title: ['Too long'] }, null, 5, 'Try again'] } }, 'Fallback')).toBe(
			'Title: Too long Try again',
		);
		expect(getApiErrorMessage({ data: { message: 'Server unavailable' } }, 'Fallback')).toBe('Server unavailable');
		expect(getApiErrorMessage({ data: 'Unavailable' }, 'Fallback')).toBe('Unavailable');
		const recursive: Record<string, unknown> = {};
		recursive.self = recursive;
		for (const error of [
			null,
			'error',
			{},
			{ data: null },
			{ data: ' ' },
			{ data: { message: ' ' } },
			{ data: { details: recursive } },
		])
			expect(getApiErrorMessage(error, 'Fallback')).toBe('Fallback');
	});
});

describe('task completion display', () => {
	it('handles calendar days over daylight-saving changes in both directions', () => {
		const before = new Date(2026, 2, 27);
		const after = new Date(2026, 2, 30);
		expect(businessDaysBetween(before, after)).toBe(2);
		expect(businessDaysBetween(after, before)).toBe(-2);
	});

	it('handles invalid dates without entering a loop', () => {
		expect(businessDaysBetween(new Date('invalid'), new Date())).toBe(0);
		expect(getDueDeliveryInfo({ status: 'todo', due_date: '2026-99-99' }, en.workflow.labels)).toBeNull();
	});

	it('uses done status even for tasks with stale legacy completion flags', () => {
		expect(getDueDeliveryInfo({ status: 'done', due_date: '2000-01-01' }, en.workflow.labels)).toEqual({
			tone: 'progress',
			label: en.workflow.labels.completed,
		});
	});

	it('shows overdue dates again when a task is reopened', () => {
		expect(getDueDeliveryInfo({ status: 'todo', due_date: '2000-01-01' }, en.workflow.labels)?.tone).toBe('urgent');
	});

	it('does not invent a deadline for an undated card', () => {
		expect(getDueDeliveryInfo({ status: 'done', due_date: null }, en.workflow.labels)).toBeNull();
	});
});
