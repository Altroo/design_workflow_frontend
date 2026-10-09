import type { IdleMemeProgress } from '@/types/chatAiTypes';

export const IDLE_MEME_DELAY = 15 * 60 * 1000;
export const IDLE_MEME_VIDEOS = ['TBgFtfw3_ZE', 'MXuq7B_OYKw'] as const;
const minute = 60_000;
const moroccoClock = new Intl.DateTimeFormat('en-GB', {
	timeZone: 'Africa/Casablanca',
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23',
});

const localClock = (at: number) => {
	const parts = moroccoClock.formatToParts(at);
	return {
		hour: Number(parts.find((part) => part.type === 'hour')?.value),
		minute: Number(parts.find((part) => part.type === 'minute')?.value),
	};
};
export const isMoroccoLunch = (at: number) => localClock(at).hour === 13;
export const nextMinuteAt = (at: number) => Math.floor(at / minute) * minute + minute;
export const lunchEndsAt = (at: number) => Math.floor(at / minute) * minute + (60 - localClock(at).minute) * minute;

/** Walk at most 15 counted minutes, skipping the entire local lunch hour. */
export const idleMemeDeadline = (activityAt: number) => {
	let at = activityAt,
		remaining = IDLE_MEME_DELAY;
	while (remaining > 0) {
		if (isMoroccoLunch(at)) at = lunchEndsAt(at);
		const span = Math.min(remaining, nextMinuteAt(at) - at);
		at += span;
		remaining -= span;
	}
	return isMoroccoLunch(at) ? lunchEndsAt(at) : at;
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
