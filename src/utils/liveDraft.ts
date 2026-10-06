/** Refresh untouched fields without discarding edits made since the last server snapshot. */
export function mergeLiveDraft<T extends object>(draft: T, previous: T, next: T): T {
	const merged = { ...next };
	for (const key of Object.keys(next) as Array<keyof T>) {
		if (JSON.stringify(draft[key]) !== JSON.stringify(previous[key])) merged[key] = draft[key];
	}
	return merged;
}

export function mergeDraftBaseline<T extends object>(draft: T, baseline: T, next: T): T {
	const result = { ...next };
	for (const key of Object.keys(next) as Array<keyof T>) {
		if (
			JSON.stringify(draft[key]) !== JSON.stringify(baseline[key]) &&
			JSON.stringify(draft[key]) !== JSON.stringify(next[key])
		)
			result[key] = baseline[key];
	}
	return result;
}

export function guardedChanges<T extends object>(
	draft: T,
	baseline: T,
): Partial<T> & { expected_values: Record<string, unknown> } {
	const changes: Partial<T> = {};
	const expected: Record<string, unknown> = {};
	for (const key of Object.keys(draft) as Array<keyof T>) {
		if (JSON.stringify(draft[key]) !== JSON.stringify(baseline[key])) {
			changes[key] = draft[key];
			expected[String(key)] = baseline[key];
		}
	}
	return { ...changes, expected_values: expected };
}
