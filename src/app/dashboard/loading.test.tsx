import { render, screen } from '@testing-library/react';
import { LanguageContext } from '@/contexts/languageContext';
import { translations } from '@/translations';
import DashboardLoading from './loading';

describe('DashboardLoading', () => {
	it.each(['fr', 'en'] as const)('uses the app loader and %s loading label', (language) => {
		const t = translations[language];
		render(
			<LanguageContext value={{ language, t, setLanguage: jest.fn() }}>
				<DashboardLoading />
			</LanguageContext>,
		);
		expect(screen.getByRole('status', { name: t.common.loading })).toBeInTheDocument();
		expect(screen.getByTestId('api-loader')).toBeInTheDocument();
		expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
	});
});
