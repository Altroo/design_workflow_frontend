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
		<div className="min-w-0 text-left">
			{entries.map((entry) => (
				<article
					key={entry.id}
					aria-labelledby={`changelog-${entry.id}`}
					className="group grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] sm:grid-cols-[10rem_minmax(0,1fr)]"
				>
					<div className="min-w-0 pr-3 pt-1 sm:pr-6">
						<time
							dateTime={entry.date}
							className="block text-xs font-semibold uppercase leading-5 tracking-wide text-(--accent-strong)"
						>
							{dateFormat.format(new Date(`${entry.date}T00:00:00Z`))}
						</time>
						{entry.version && (
							<p className="mt-2 wrap-break-word text-xs leading-5 text-(--ink-soft)">Version {entry.version}</p>
						)}
					</div>
					<div className="min-w-0 border-l border-(--line-strong) pb-10 pl-4 group-last:pb-0 sm:pb-12 sm:pl-8">
						<h2
							id={`changelog-${entry.id}`}
							className="mb-4 wrap-break-word text-lg font-semibold leading-snug text-(--ink) sm:text-2xl"
						>
							{entry[`title_${language}`]}
						</h2>
						<ul className="space-y-3">
							{entry[`changes_${language}`].map((change, index) => (
								<li
									key={index}
									className="flex items-start gap-2 text-sm leading-6 text-(--ink-soft) sm:gap-3 sm:leading-7"
								>
									<span aria-hidden="true" className="shrink-0 text-(--accent-strong)">
										-
									</span>
									<span className="min-w-0 wrap-break-word">{change}</span>
								</li>
							))}
						</ul>
					</div>
				</article>
			))}
		</div>
	);
};
