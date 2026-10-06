import { WORK_DAY_MINUTES } from '@/utils/rawData';

const formatDuration = (minutes: number, locale: string, dayMinutes?: number) => {
	const rounded = Number.isFinite(minutes) ? Math.round(minutes) : 0;
	const absolute = Math.abs(rounded);
	const days = dayMinutes ? Math.floor(absolute / dayMinutes) : 0;
	const remainder = dayMinutes ? absolute % dayMinutes : absolute;
	const hours = Math.floor(remainder / 60);
	const mins = remainder % 60;
	const parts = [
		days ? `${days} ${locale.startsWith('fr') ? 'j' : 'd'}` : '',
		hours ? `${hours} h` : '',
		mins || (!days && !hours) ? `${mins} min` : '',
	].filter(Boolean);
	return `${rounded < 0 ? '−' : ''}${parts.join(' ')}`;
};

// Effort uses an eight-hour equivalent day, never a calendar delivery date.
export const formatReportWorkDuration = (minutes: number, locale: string) =>
	formatDuration(minutes, locale, WORK_DAY_MINUTES);

export const formatReportHours = (minutes: number) => formatDuration(minutes, 'en');

// Waiting and delivery durations include nights and weekends: a day is 24 hours.
export const formatReportElapsedDuration = (minutes: number, locale: string) =>
	formatDuration(minutes, locale, 24 * 60);

export const formatReportDate = (value: string, locale: string) => {
	const parsed = new Date(`${value}T12:00:00`);
	return Number.isNaN(parsed.getTime())
		? value
		: new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(parsed);
};
