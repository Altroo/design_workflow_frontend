import { isValidElement } from 'react';
import { BOARD_STATUS_META, STATUS_COLUMNS } from './boardAppearance';

it('provides a unique, complete visual identity for every board column', () => {
	expect(STATUS_COLUMNS).toEqual(['backlog', 'todo', 'in_progress', 'in_review', 'blocked', 'done']);
	expect(new Set(STATUS_COLUMNS.map((status) => BOARD_STATUS_META[status].accent)).size).toBe(6);
	for (const status of STATUS_COLUMNS) {
		expect(BOARD_STATUS_META[status].soft).toContain('var(--theme-');
		expect(isValidElement(BOARD_STATUS_META[status].icon)).toBe(true);
	}
});
