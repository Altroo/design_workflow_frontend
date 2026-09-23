import {
	genderItemsList,
	PRIORITY_OPTIONS, REVIEW_STATE_OPTIONS, BOARD_SORT_OPTIONS, PROJECT_STATUS_OPTIONS,
	EMPTY_PROJECTS, EMPTY_TASKS, EMPTY_WORKLOAD, EMPTY_TIME_REPORT, EMPTY_NOTIFICATIONS,
	EMPTY_ANNOTATIONS, WORK_DAY_MINUTES, WORKFLOW_CHART_PALETTE,
	CHAT_PAGE_SIZE, MESSAGE_SPINNER_SHOW_DELAY_MS, MESSAGE_SPINNER_HIDE_DELAY_MS,
	REACTION_OPTIONS, REMINDER_TIME_OPTIONS, OTHER_BUBBLE_COLORS,
} from './rawData';
import { translations } from '@/translations';

const t = translations.fr;

describe('items lists', () => {
	it('keeps workflow choices and shared empty defaults in raw data', () => {
		expect(PRIORITY_OPTIONS).toEqual(['low', 'medium', 'high', 'urgent']);
		expect(REVIEW_STATE_OPTIONS).toContain('approved');
		expect(BOARD_SORT_OPTIONS).toContain('updated_at');
		expect(PROJECT_STATUS_OPTIONS).toContain('completed');
		for (const empty of [EMPTY_PROJECTS, EMPTY_TASKS, EMPTY_WORKLOAD, EMPTY_TIME_REPORT, EMPTY_NOTIFICATIONS, EMPTY_ANNOTATIONS]) {
			expect(empty).toEqual([]);
		}
		expect(WORK_DAY_MINUTES).toBe(480);
		expect(WORKFLOW_CHART_PALETTE).toHaveLength(6);
	});

	it('keeps chat choices and timing values in raw data', () => {
		expect(CHAT_PAGE_SIZE).toBe(40);
		expect(MESSAGE_SPINNER_SHOW_DELAY_MS).toBeLessThan(MESSAGE_SPINNER_HIDE_DELAY_MS);
		expect(REACTION_OPTIONS.map(({emoji}) => emoji)).toHaveLength(4);
		expect(REMINDER_TIME_OPTIONS).toHaveLength(48);
		expect(REMINDER_TIME_OPTIONS[0].value).toBe('00:00');
		expect(REMINDER_TIME_OPTIONS[47].value).toBe('23:30');
		expect(OTHER_BUBBLE_COLORS).toHaveLength(5);
	});
	describe('genderItemsList', () => {
		it('has two entries with correct codes and values', () => {
			const items = genderItemsList(t);
			expect(items).toHaveLength(2);

			expect(items[0]).toEqual({ code: 'H', value: t.rawData.genders.male });
			expect(items[1]).toEqual({ code: 'F', value: t.rawData.genders.female });

			const codes = items.map((i) => i.code);
			expect(codes).toEqual(['H', 'F']);

			const values = items.map((i) => i.value);
			expect(values).toEqual([t.rawData.genders.male, t.rawData.genders.female]);
		});

		it('contains unique codes', () => {
			const codes = genderItemsList(t).map((i) => i.code);
			const unique = Array.from(new Set(codes));
			expect(unique).toHaveLength(codes.length);
		});
	});
});
