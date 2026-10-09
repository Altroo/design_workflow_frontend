import {
	IDLE_MEME_DELAY,
	IDLE_MEME_VIDEOS,
	idleActivityKey,
	idleMemeDeadline,
	idleMemeKey,
	isMoroccoLunch,
	nextMinuteAt,
	readIdleActivity,
	readIdleMemeProgress,
	saveIdleActivity,
	saveIdleMemeProgress,
} from './idleMeme';

beforeEach(() => localStorage.clear());
afterEach(() => jest.restoreAllMocks());

it('defines exactly two videos, in the requested order', () => {
	expect(IDLE_MEME_VIDEOS).toEqual(['TBgFtfw3_ZE', 'MXuq7B_OYKw']);
});

it.each([
	['2026-10-09T08:01:23.456Z', '2026-10-09T08:31:23.456Z'],
	// October: Morocco UTC+1. Twelve fifty-five -> fourteen twenty-five, lunch excluded.
	['2026-10-09T11:55:00Z', '2026-10-09T13:25:00Z'],
	['2026-10-09T11:30:00Z', '2026-10-09T13:00:00Z'],
	['2026-10-09T12:30:00Z', '2026-10-09T13:30:00Z'],
	['2026-10-09T11:59:59.500Z', '2026-10-09T13:29:59.500Z'],
	// Ramadan: Morocco UTC+0, do not hard-code a fixed UTC offset.
	['2026-02-25T12:55:00Z', '2026-02-25T14:25:00Z'],
])('counts thirty non-lunch minutes after %s', (start, expected) => {
	expect(idleMemeDeadline(Date.parse(start))).toBe(Date.parse(expected));
});

it('checks local lunch boundaries and the next whole minute', () => {
	expect(isMoroccoLunch(Date.parse('2026-10-09T11:59:59Z'))).toBe(false);
	expect(isMoroccoLunch(Date.parse('2026-10-09T12:00:00Z'))).toBe(true);
	expect(isMoroccoLunch(Date.parse('2026-10-09T13:00:00Z'))).toBe(false);
	expect(nextMinuteAt(65_001)).toBe(120_000);
	expect(IDLE_MEME_DELAY).toBe(1_800_000);
});

it('persists completion and disable choice separately for each account', () => {
	const progress = { shown: 2 as const, disabled: true, lastShownAt: 123 };
	expect(saveIdleMemeProgress(1, progress)).toBe(true);
	expect(readIdleMemeProgress(1)).toEqual(progress);
	expect(readIdleMemeProgress(2)).toEqual({ shown: 0, disabled: false, lastShownAt: 0 });
	saveIdleActivity(1, 500);
	expect(readIdleActivity(1)).toBe(500);
	expect(readIdleActivity(2)).toBe(0);
});

it.each(['broken', 'null', '{"shown":3}', '{"shown":1,"disabled":false,"lastShownAt":-1}'])(
	'ignores corrupt progress %s',
	(value) => {
		localStorage.setItem(idleMemeKey(1), value);
		expect(readIdleMemeProgress(1)).toEqual({ shown: 0, disabled: false, lastShownAt: 0 });
	},
);

it('handles invalid activity and unavailable storage without crashing', () => {
	localStorage.setItem(idleActivityKey(1), 'NaN');
	expect(readIdleActivity(1)).toBe(0);
	jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
		throw new Error('unavailable');
	});
	jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
		throw new Error('unavailable');
	});
	expect(readIdleActivity(1)).toBe(0);
	expect(readIdleMemeProgress(1).shown).toBe(0);
	expect(saveIdleMemeProgress(1, { shown: 1, disabled: false, lastShownAt: 1 })).toBe(false);
	expect(() => saveIdleActivity(1, 1)).not.toThrow();
});
