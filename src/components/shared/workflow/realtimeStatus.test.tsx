import { render, screen } from '@testing-library/react';
import RealtimeStatus from './realtimeStatus';

let mockConnectionStatus = 'connected';
let mockLanguage = 'fr';

jest.mock('@/utils/hooks', () => ({
	useAppSelector: (selector: (state: { ws: { connectionStatus: string } }) => unknown) =>
		selector({ ws: { connectionStatus: mockConnectionStatus } }),
	useLanguage: () => ({ language: mockLanguage }),
}));

beforeEach(() => {
	mockConnectionStatus = 'connected';
	mockLanguage = 'fr';
});

test.each(['connecting', 'connected'])('does not show an interruption banner while %s', (status) => {
	mockConnectionStatus = status;
	const { container } = render(<RealtimeStatus />);
	expect(screen.queryByRole('status')).not.toBeInTheDocument();
	expect(container).toBeEmptyDOMElement();
});

test.each([
	['fr', 'Connexion interrompue. Reconnexion en cours… Les mises à jour reprendront automatiquement.'],
	['en', 'Connection interrupted. Reconnecting… Live updates will resume automatically.'],
])('announces reconnection in %s without exposing technical details', (language, text) => {
	mockLanguage = language;
	mockConnectionStatus = 'reconnecting';
	render(<RealtimeStatus />);
	const banner = screen.getByRole('status');
	expect(banner).toHaveTextContent(text);
	expect(banner).toHaveAttribute('aria-live', 'polite');
	expect(banner.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
});

test('removes the interruption banner as soon as the socket reconnects', () => {
	mockConnectionStatus = 'reconnecting';
	const view = render(<RealtimeStatus />);
	expect(screen.getByRole('status')).toBeInTheDocument();
	mockConnectionStatus = 'connected';
	view.rerender(<RealtimeStatus />);
	expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
