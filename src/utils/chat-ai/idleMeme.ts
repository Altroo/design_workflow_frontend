import type { IdleMemeProgress } from '@/types/chatAiTypes';

export const IDLE_MEME_DELAY = 30 * 60 * 1000;
export const IDLE_MEME_VIDEOS = ['TBgFtfw3_ZE', 'MXuq7B_OYKw'] as const;
const minute = 60_000;
const hour = 60 * minute;
const moroccoClock = new Intl.DateTimeFormat('en-GB', {
	timeZone: 'Africa/Casablanca',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	weekday: 'short',
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23',
});

const localClock = (at: number) => {
	const parts = moroccoClock.formatToParts(at);
	const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
	return {
		hour: Number(value('hour')),
		minute: Number(value('minute')),
		weekday: value('weekday'),
		date: `${value('year')}-${value('month')}-${value('day')}`,
	};
};
export const isMoroccoWorkTime = (at: number) => {
	const clock = localClock(at);
	return (
		clock.weekday !== 'Sun' &&
		((clock.hour >= 9 && clock.hour < 13) || (clock.weekday !== 'Sat' && clock.hour >= 14 && clock.hour < 18))
	);
};
export const nextMinuteAt = (at: number) => Math.floor(at / minute) * minute + minute;
export const nextMoroccoWorkTime = (at: number) => {
	// Check local hours instead of adding 24h: Morocco's UTC offset changes during Ramadan.
	while (!isMoroccoWorkTime(at)) at = Math.floor(at / hour) * hour + hour;
	return at;
};

/** Lunch pauses the counter; a new local workday starts a fresh interval. */
export const idleMemeDeadline = (activityAt: number, now = activityAt) => {
	const today = localClock(now);
	let at =
			localClock(activityAt).date === today.date
				? activityAt
				: Math.floor(now / minute) * minute + (9 * 60 - today.hour * 60 - today.minute) * minute,
		remaining = IDLE_MEME_DELAY;
	for (;;) {
		const next = nextMoroccoWorkTime(at);
		if (localClock(next).date !== localClock(at).date) remaining = IDLE_MEME_DELAY;
		at = next;
		if (remaining === 0) return at;
		const span = Math.min(remaining, nextMinuteAt(at) - at);
		at += span;
		remaining -= span;
	}
};

export const idleMemeKey = (userId: number) => `workflow:assistant-idle:${userId}`;
export const idleActivityKey = (userId: number) => `${idleMemeKey(userId)}:activity`;
export const readIdleMemeProgress = (userId: number): IdleMemeProgress => {
	try {
		const value = JSON.parse(localStorage.getItem(idleMemeKey(userId)) ?? 'null');
		if (
			value &&
			[0, 1, 2].includes(value.shown) &&
			typeof value.disabled === 'boolean' &&
			Number.isFinite(value.lastShownAt) &&
			value.lastShownAt >= 0
		)
			return value;
	} catch {
		/* Storage is optional; an unavailable store disables the surprise. */
	}
	return { shown: 0, disabled: false, lastShownAt: 0 };
};
export const saveIdleMemeProgress = (userId: number, progress: IdleMemeProgress) => {
	try {
		localStorage.setItem(idleMemeKey(userId), JSON.stringify(progress));
		return true;
	} catch {
		return false;
	}
};
export const readIdleActivity = (userId: number) => {
	try {
		const value = Number(localStorage.getItem(idleActivityKey(userId)));
		return Number.isFinite(value) && value > 0 ? value : 0;
	} catch {
		return 0;
	}
};
export const saveIdleActivity = (userId: number, at: number) => {
	try {
		localStorage.setItem(idleActivityKey(userId), String(at));
	} catch {
		/* No activity is sent to the server. */
	}
};
