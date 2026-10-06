import type { ChangelogEntry } from '@/types/changelogTypes';
import type { Language } from '@/types/languageTypes';

export const ChangelogTimeline = ({ entries, language }: { entries: ChangelogEntry[]; language: Language }) => {
	const dateFormat = new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-US', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC',
	});
	return (
		<div className="min-w-0 space-y-10 sm:space-y-12">
			{entries.map((entry) => (
				<article key={entry.id} aria-labelledby={`changelog-${entry.id}`} className="min-w-0">
					<div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
						<time
							dateTime={entry.date}
							className="shrink-0 text-xs font-semibold uppercase tracking-wide text-(--accent-strong)"
						>
							{dateFormat.format(new Date(`${entry.date}T00:00:00Z`))}
						</time>
						{entry.version && <span className="text-xs font-semibold text-(--ink-soft)">Version {entry.version}</span>}
						<span aria-hidden="true" className="h-px min-w-4 flex-1 bg-(--line-strong)" />
					</div>
					<h2
						id={`changelog-${entry.id}`}
						className="mb-4 wrap-break-word text-xl font-semibold leading-snug text-(--ink) sm:text-2xl"
					>
						{entry[`title_${language}`]}
					</h2>
					<ul className="space-y-3">
						{entry[`changes_${language}`].map((change, index) => (
							<li key={index} className="flex items-start gap-3 text-sm leading-7 text-(--ink-soft)">
								<span aria-hidden="true" className="shrink-0 text-(--accent-strong)">
									-
								</span>
								<span className="min-w-0 wrap-break-word">{change}</span>
							</li>
						))}
					</ul>
				</article>
			))}
		</div>
	);
};
