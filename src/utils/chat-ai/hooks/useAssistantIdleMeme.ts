'use client';

import { useEffect, useEffectEvent, useState } from 'react';
import type { IdleMemeProgress } from '@/types/chatAiTypes';
import {
	idleActivityKey,
	idleMemeDeadline,
	idleMemeKey,
	isMoroccoWorkTime,
	nextMoroccoWorkTime,
	nextMinuteAt,
	readIdleActivity,
	readIdleMemeProgress,
	saveIdleActivity,
	saveIdleMemeProgress,
} from '@/utils/chat-ai/idleMeme';

export const useAssistantIdleMeme = ({
	enabled,
	userId,
	blocked,
	onIdleAction,
	verifyEligibilityAction,
}: {
	enabled: boolean;
	userId?: number;
	blocked: boolean;
	onIdleAction: () => void;
	verifyEligibilityAction: () => Promise<boolean>;
}) => {
	const [video, setVideo] = useState<0 | 1 | null>(null);
	const [progress, setProgress] = useState<IdleMemeProgress>({ shown: 0, disabled: false, lastShownAt: 0 });
	const isBlocked = useEffectEvent(() => blocked);
	const hasVideo = useEffectEvent(() => video !== null);
	const show = useEffectEvent((index: 0 | 1) => {
		setVideo(index);
		onIdleAction();
	});
	const verify = useEffectEvent(verifyEligibilityAction);

	useEffect(() => {
		setVideo(null);
		if (!enabled || !userId) return;
		const startedAt = Date.now();
		let lastActivity = startedAt,
			lastShownHere = 0,
			disposed = false,
			checking = false;
		let timer: ReturnType<typeof setTimeout> | undefined;
		let activityFlush: ReturnType<typeof setTimeout> | undefined;
		setProgress(readIdleMemeProgress(userId));
		saveIdleActivity(userId, startedAt);
		const syncProgress = () => {
			const next = readIdleMemeProgress(userId);
			setProgress((previous) =>
				previous.shown === next.shown &&
				previous.disabled === next.disabled &&
				previous.lastShownAt === next.lastShownAt
					? previous
					: next,
			);
			return next;
		};
		const deadline = (current: IdleMemeProgress) =>
			idleMemeDeadline(Math.max(startedAt, lastActivity, readIdleActivity(userId), current.lastShownAt), Date.now());
		const schedule = (at: number) => {
			clearTimeout(timer);
			if (!disposed) timer = setTimeout(() => void check(), Math.max(1, at - Date.now()));
		};
		const check = async () => {
			if (disposed || checking) return;
			const current = syncProgress();
			const now = Date.now();
			if (current.disabled) {
				setVideo(null);
				return;
			}
			if (!isMoroccoWorkTime(now)) {
				setVideo(null);
				if (current.shown < 2) schedule(nextMoroccoWorkTime(now));
				return;
			}
			if (current.shown === 2) {
				if (hasVideo()) schedule(nextMinuteAt(now));
				return;
			}
			const due = deadline(current);
			if (due > now) {
				schedule(Math.min(due, nextMinuteAt(now)));
				return;
			}
			if (isBlocked()) {
				schedule(now + 1000);
				return;
			}
			checking = true;
			const claim = async () => {
				// Recheck the authenticated account immediately before the surprise.
				if (!(await verify()) || disposed) return;
				const fresh = readIdleMemeProgress(userId);
				const at = Date.now();
				if (fresh.disabled || fresh.shown === 2 || isBlocked() || !isMoroccoWorkTime(at) || deadline(fresh) > at)
					return;
				const index = fresh.shown as 0 | 1;
				const next: IdleMemeProgress = { shown: index === 0 ? 1 : 2, disabled: false, lastShownAt: at };
				// If persistence is unavailable, do not risk replaying the surprise.
				if (!saveIdleMemeProgress(userId, next)) return;
				lastShownHere = at;
				setProgress(next);
				show(index);
			};
			try {
				if (navigator.locks)
					await navigator.locks.request(idleMemeKey(userId), { ifAvailable: true }, async (lock) => {
						if (lock) await claim();
					});
				else await claim();
			} catch {
				/* A fun reminder must never interrupt work with an error. */
			} finally {
				checking = false;
				if (!disposed) schedule(nextMinuteAt(Date.now()));
			}
		};
		const activity = () => {
			lastActivity = Date.now();
			if (!activityFlush) {
				saveIdleActivity(userId, lastActivity);
				activityFlush = setTimeout(() => {
					activityFlush = undefined;
					saveIdleActivity(userId, lastActivity);
				}, 1000);
			}
		};
		const syncStorage = (event: StorageEvent) => {
			if (event.key !== idleMemeKey(userId) && event.key !== idleActivityKey(userId) && event.key !== null) return;
			const current = syncProgress();
			if (current.disabled || (lastShownHere && current.lastShownAt !== lastShownHere)) setVideo(null);
			void check();
		};
		const wake = () => void check();
		const events = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const;
		for (const event of events) window.addEventListener(event, activity, { passive: true, capture: true });
		window.addEventListener('storage', syncStorage);
		window.addEventListener('focus', wake);
		document.addEventListener('visibilitychange', wake);
		schedule(Math.min(deadline(readIdleMemeProgress(userId)), nextMinuteAt(Date.now())));
		return () => {
			disposed = true;
			clearTimeout(timer);
			clearTimeout(activityFlush);
			for (const event of events) window.removeEventListener(event, activity, true);
			window.removeEventListener('storage', syncStorage);
			window.removeEventListener('focus', wake);
			document.removeEventListener('visibilitychange', wake);
		};
	}, [enabled, userId]);

	return {
		video: enabled ? video : null,
		canDisable: enabled && progress.shown === 2 && !progress.disabled,
		dismiss: () => setVideo(null),
		disable: () => {
			if (!enabled || !userId) return;
			const current = readIdleMemeProgress(userId);
			if (current.shown !== 2) return;
			const next = { ...current, disabled: true };
			if (saveIdleMemeProgress(userId, next)) {
				setProgress(next);
				setVideo(null);
			}
		},
	};
};
