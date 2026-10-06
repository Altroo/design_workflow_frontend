import { StrictMode } from 'react';
import { render, waitFor } from '@testing-library/react';
import SSOCallback from './ssoCallback';

const mockSignIn = jest.fn();
const mockRouter = { replace: jest.fn() };
let mockParams = new URLSearchParams('code=abc');
jest.mock('next-auth/react', () => ({ signIn: (...args: unknown[]) => mockSignIn(...args) }));
jest.mock('next/navigation', () => ({ useRouter: () => mockRouter, useSearchParams: () => mockParams }));
beforeEach(() => {
	jest.clearAllMocks();
	mockParams = new URLSearchParams('code=abc');
});

it('exchanges a single-use code only once during effect replay', async () => {
	mockSignIn.mockResolvedValue({});
	render(
		<StrictMode>
			<SSOCallback />
		</StrictMode>,
	);
	await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard'));
	expect(mockSignIn).toHaveBeenCalledTimes(1);
});

it.each([true, false])('redirects failed exchanges to login (network error: %s)', async (network) => {
	if (network) mockSignIn.mockRejectedValue(new Error('offline'));
	else mockSignIn.mockResolvedValue({ error: 'Invalid code' });
	render(<SSOCallback />);
	await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/login?error=SSOFailed'));
});

it('does not exchange a missing code', () => {
	mockParams = new URLSearchParams();
	render(<SSOCallback />);
	expect(mockSignIn).not.toHaveBeenCalled();
	expect(mockRouter.replace).toHaveBeenCalledWith('/login?error=SSOCodeMissing');
});
