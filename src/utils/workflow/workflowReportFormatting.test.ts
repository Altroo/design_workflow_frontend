import {
	formatReportDate,
	formatReportElapsedDuration,
	formatReportHours,
	formatReportWorkDuration,
	reportRemainingLabel,
	reportVarianceLabel,
} from './workflowReportFormatting';
import { workflowReport } from '@/components/design-workflow/__testutils__/workflowTestSetup';
import { fr } from '@/translations/fr';

it.each([
	[0, '0 min'],
	[45, '45 min'],
	[60, '1 h'],
	[240, '4 h'],
	[480, '1 j'],
	[2220, '4 j 5 h'],
	[2260, '4 j 5 h 40 min'],
	[-540, '−1 j 1 h'],
	[-20, '−20 min'],
	[479.8, '1 j'],
])('formats %s minutes as %s using eight-hour workdays', (minutes, expected) => {
	expect(formatReportWorkDuration(minutes, 'fr-FR')).toBe(expected);
});

it('preserves exact hours and distinguishes calendar days from working days', () => {
	expect(formatReportHours(2260)).toBe('37 h 40 min');
	expect(formatReportHours(480)).toBe('8 h');
	expect(formatReportWorkDuration(1440, 'en')).toBe('3 d');
	expect(formatReportElapsedDuration(1440, 'fr')).toBe('1 j');
	expect(formatReportElapsedDuration(1500, 'en')).toBe('1 d 1 h');
});

it('handles non-finite inputs and localizes date-only filters', () => {
	expect(formatReportHours(Number.NaN)).toBe('0 min');
	expect(formatReportWorkDuration(Infinity, 'fr')).toBe('0 min');
	expect(formatReportDate('2026-10-06', 'fr-FR')).toBe('6 oct. 2026');
	expect(formatReportDate('2026-10-06', 'en-US')).toBe('Oct 6, 2026');
	expect(formatReportDate('invalid', 'fr')).toBe('invalid');
});

it.each([
	[0, 30, 'reportNoEstimate'],
	[60, -30, 'reportWithinEstimate'],
	[60, 30, 'reportOverEstimate'],
	[60, 0, 'reportOnEstimate'],
] as const)('explains estimate %s and variance %s', (estimated_minutes, variance_minutes, key) => {
	expect(
		reportVarianceLabel(
			{ estimated_minutes, variance_minutes, actual_minutes: 30, actual_to_estimate_ratio: 0 },
			fr.workflow.labels,
		),
	).toBe(fr.workflow.labels[key]);
});

it('distinguishes a complete estimate, a known minimum and unknown remaining work', () => {
	const row = { ...workflowReport.capacity[0], remaining_minutes: 480 };
	expect(reportRemainingLabel(row, 'fr', 'Au moins', 'À réestimer')).toBe('1 j');
	expect(reportRemainingLabel({ ...row, load_percent: null }, 'fr', 'Au moins', 'À réestimer')).toBe('Au moins 1 j');
	expect(
		reportRemainingLabel({ ...row, load_percent: null, remaining_minutes: 0 }, 'fr', 'Au moins', 'À réestimer'),
	).toBe('À réestimer');
});
