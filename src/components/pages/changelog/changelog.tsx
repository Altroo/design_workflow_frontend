'use client';

import NavigationBar from '@/components/layouts/navigationBar/navigationBar';
import { ChangelogTimeline } from '@/components/changelog/changelogTimeline';
import { useGetChangelogQuery } from '@/store/services/designWorkflow';
import { useAppSelector, useLanguage } from '@/utils/hooks';
import { getAccessToken } from '@/store/selectors';

const Changelog = () => {
	const { t, language } = useLanguage();
	const accessToken = useAppSelector(getAccessToken);
	const { data, isLoading: queryLoading, isError, refetch } = useGetChangelogQuery(undefined, { skip: !accessToken });
	const isLoading = !accessToken || queryLoading;
	return (
		<NavigationBar title={t.navigation.changelog}>
			<div className="w-full max-w-280 pb-8 text-left">
				<header className="mb-8 px-1">
					<h1 className="text-2xl font-semibold text-(--ink) sm:text-3xl">{t.navigation.changelog}</h1>
					<p className="mt-3 text-sm leading-6 text-(--ink-soft)">{t.changelog.description}</p>
				</header>
				<section
					className="app-card rounded-3xl border border-(--line) bg-(--surface) px-3 py-5 sm:p-8 lg:p-10"
					aria-label={t.navigation.changelog}
				>
					{isLoading ? (
						<p role="status" className="text-sm text-(--ink-soft)">
							{t.changelog.loading}
						</p>
					) : null}
					{isError ? (
						<div role="alert" className="mb-6 space-y-3">
							<p className="text-sm text-red-600 dark:text-red-400">{t.changelog.error}</p>
							<button type="button" className="app-button" onClick={() => void refetch()}>
								{t.common.retry}
							</button>
						</div>
					) : null}
					{data?.length ? (
						<ChangelogTimeline entries={data} language={language} />
					) : !isLoading && !isError ? (
						<p className="text-sm text-(--ink-soft)">{t.changelog.empty}</p>
					) : null}
				</section>
			</div>
		</NavigationBar>
	);
};

export default Changelog;
