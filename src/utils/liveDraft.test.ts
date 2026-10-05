import { guardedChanges, mergeDraftBaseline, mergeLiveDraft } from './liveDraft';

test('live updates refresh clean fields but preserve unsaved text and members', () => {
	const previous = { title: 'Before', description: 'Original', members: [1] };
	const draft = { ...previous, description: 'My unfinished text', members: [1, 2] };
	const next = { title: 'Renamed remotely', description: 'Other text', members: [3] };
	expect(mergeLiveDraft(draft, previous, next)).toEqual({ ...draft, title: next.title });
});

test('dirty fields keep their original baseline while untouched fields follow live changes', () => {
	const original = { title: 'Before', description: 'Old', members: [1] };
	const draft = { ...original, title: 'My title' };
	const live = { title: 'Their title', description: 'Fresh', members: [1, 2] };
	const baseline = mergeDraftBaseline(draft, original, live);
	expect(baseline).toEqual({ ...live, title: 'Before' });
	expect(guardedChanges(mergeLiveDraft(draft, original, live), baseline)).toEqual({
		title: 'My title', expected_values: { title: 'Before' },
	});
});

test('clean drafts do not send fields which could overwrite remote edits', () => {
	expect(guardedChanges({ title: 'Saved', members: [1] }, { title: 'Saved', members: [1] })).toEqual({ expected_values: {} });
});

test('a saved draft becomes clean for subsequent updates', () => {
	const previous = { description: 'Old' };
	const saved = { description: 'Saved' };
	const merged = mergeLiveDraft(saved, previous, saved);
	expect(mergeLiveDraft(merged, saved, { description: 'New remote value' })).toEqual({ description: 'New remote value' });
});
