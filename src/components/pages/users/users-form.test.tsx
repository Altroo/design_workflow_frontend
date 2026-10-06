import { type ChangeEventHandler, type ReactElement, type ReactNode } from 'react';
import { act, render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { AppSession } from '@/types/_initTypes';

// Minimal mock store
const mockStore = configureStore({
	reducer: {
		_init: () => ({}),
		account: () => ({}),
	},
	middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
});

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
	__esModule: true,
	useRouter: () => ({
		push: mockPush,
		back: jest.fn(),
		replace: jest.fn(),
		refresh: jest.fn(),
		forward: jest.fn(),
		prefetch: jest.fn(),
	}),
}));

// Mock hooks and selectors
jest.mock('@/utils/hooks', () => ({
	__esModule: true,
	useToast: () => ({ onSuccess: jest.fn(), onError: jest.fn() }),
	useLanguage: () => ({ t: jest.requireActual('@/translations/fr').fr }),
}));

jest.mock('@/contexts/InitContext', () => ({
	__esModule: true,
	useInitAccessToken: () => 'mock-token',
}));

// Mock account service hooks
const mockUseGetUserQuery = jest.fn();
const mockAddUserMutation = jest.fn();
const mockEditUserMutation = jest.fn();

const mockCheckEmailMutation = jest.fn();

jest.mock('@/store/services/account', () => ({
	__esModule: true,
	useGetUserQuery: (params: { id: number }, options: { skip: boolean }) => mockUseGetUserQuery(params, options),
	useAddUserMutation: () => [mockAddUserMutation, { isLoading: false, error: undefined }],
	useCheckEmailMutation: () => [mockCheckEmailMutation, { isLoading: false, error: undefined }],
	useEditUserMutation: () => [mockEditUserMutation, { isLoading: false, error: undefined }],
}));

// Mock Protected
jest.mock('@/components/layouts/protected/protected', () => ({
	Protected: ({ children }: { children: ReactNode }) => <div data-testid="protected">{children}</div>,
}));

// Mock NavigationBar
jest.mock('@/components/layouts/navigationBar/navigationBar', () => {
	const Mock = ({ children }: { children: ReactNode }) => <div data-testid="navigation-bar">{children}</div>;
	Mock.displayName = 'NavigationBar';
	return { __esModule: true, default: Mock };
});

// Mock form subcomponents
jest.mock('@/components/formikElements/customTextInput/customTextInput', () => ({
	__esModule: true,
	default: ({
		id,
		label,
		value,
		onChange,
	}: {
		id: string;
		label: string;
		value: string;
		onChange: ChangeEventHandler<HTMLInputElement>;
	}) => (
		<div data-testid={`input-${id}`}>
			<label htmlFor={id}>{label}</label>
			<input id={id} value={value ?? ''} onChange={onChange} />
		</div>
	),
}));

jest.mock('@/components/formikElements/customDropDownSelect/customDropDownSelect', () => ({
	__esModule: true,
	default: ({ id, label }: { id: string; label: string }) => (
		<div data-testid={`dropdown-${id}`}>
			<label>{label}</label>
		</div>
	),
}));

jest.mock('@/components/formikElements/customSquareImageUploading/customSquareImageUploading', () => ({
	__esModule: true,
	default: ({ label }: { label?: string }) => <div data-testid="image-upload">{label}</div>,
}));

jest.mock('@/components/htmlElements/buttons/primaryLoadingButton/primaryLoadingButton', () => ({
	__esModule: true,
	default: ({ buttonText, type }: { buttonText: string; type?: string }) => (
		<button data-testid="submit-button" type={type as 'submit' | 'button'}>
			{buttonText}
		</button>
	),
}));

jest.mock('@/components/formikElements/apiLoading/apiProgress/apiProgress', () => ({
	__esModule: true,
	default: () => <div data-testid="api-loader">Loading...</div>,
}));

jest.mock('@/components/formikElements/apiLoading/apiAlert/apiAlert', () => ({
	__esModule: true,
	default: () => <div data-testid="api-alert">Error</div>,
}));

jest.mock('@/utils/themes', () => ({
	textInputTheme: jest.fn(() => ({})),
	customDropdownTheme: jest.fn(() => ({})),
}));

jest.mock('@/utils/helpers', () => ({
	setFormikAutoErrors: jest.fn(),
}));

jest.mock('@/utils/rawData', () => ({
	genderItemsList: jest.fn(() => [
		{ value: 'H', label: 'Homme' },
		{ value: 'F', label: 'Femme' },
	]),
}));

jest.mock('@/utils/formValidationSchemas', () => ({
	userSchema: { parse: jest.fn() },
}));

jest.mock('zod-formik-adapter', () => ({
	toFormikValidationSchema: jest.fn(() => undefined),
}));

jest.mock('@/utils/routes', () => ({
	USERS_LIST: '/dashboard/users',
	USERS_VIEW: (id: number) => `/dashboard/users/${id}`,
}));

// Import after mocks
import UsersFormClient from './users-form';

const mockSession: AppSession = {
	accessToken: 'mock-token',
	refreshToken: 'mock-refresh-token',
	accessTokenExpiration: '2099-12-31T23:59:59Z',
	refreshTokenExpiration: '2099-12-31T23:59:59Z',
	expires: '2099-12-31T23:59:59Z',
	user: {
		id: '1',
		pk: 1,
		email: 'test@example.com',
		emailVerified: null,
		name: 'Test User',
		first_name: 'Test',
		last_name: 'User',
		role: 'manager',
	},
};

const renderWithProviders = (ui: ReactElement) => {
	return render(<Provider store={mockStore}>{ui}</Provider>);
};

describe('UsersFormClient', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		const accountService = jest.requireMock('@/store/services/account');
		accountService.useAddUserMutation = () => [mockAddUserMutation, { isLoading: false, error: undefined }];
		accountService.useEditUserMutation = () => [mockEditUserMutation, { isLoading: false, error: undefined }];
		mockUseGetUserQuery.mockReturnValue({
			data: undefined,
			isLoading: false,
			error: undefined,
		});
	});

	afterEach(() => {
		cleanup();
	});

	describe('Add Mode (no id)', () => {
		it('renders form fields', () => {
			renderWithProviders(<UsersFormClient session={mockSession} />);
			expect(screen.getByTestId('input-email')).toBeInTheDocument();
			expect(screen.getByTestId('input-first_name')).toBeInTheDocument();
			expect(screen.getByTestId('input-last_name')).toBeInTheDocument();
		});

		it('renders submit button with add text', () => {
			renderWithProviders(<UsersFormClient session={mockSession} />);
			expect(screen.getByTestId('submit-button')).toHaveTextContent("Ajouter l'utilisateur");
		});

		it('renders back button text', () => {
			renderWithProviders(<UsersFormClient session={mockSession} />);
			expect(screen.getByText('Liste des utilisateurs')).toBeInTheDocument();
		});

		it('renders section headers', () => {
			renderWithProviders(<UsersFormClient session={mockSession} />);
			expect(screen.getByText('Identité')).toBeInTheDocument();
			expect(screen.getByText('Informations personnelles')).toBeInTheDocument();
			expect(screen.getByText('Paramètres du compte')).toBeInTheDocument();
			expect(screen.getByText('Permissions')).toBeInTheDocument();
		});

		it('renders protected wrapper', () => {
			renderWithProviders(<UsersFormClient session={mockSession} />);
			expect(screen.getByTestId('protected')).toBeInTheDocument();
		});

		it('renders image upload component', () => {
			renderWithProviders(<UsersFormClient session={mockSession} />);
			expect(screen.getByTestId('image-upload')).toBeInTheDocument();
		});

		it('renders gender dropdown', () => {
			renderWithProviders(<UsersFormClient session={mockSession} />);
			expect(screen.getByTestId('dropdown-gender')).toBeInTheDocument();
		});
	});

	describe('Edit Mode (with id)', () => {
		it('renders submit button with update text', () => {
			mockUseGetUserQuery.mockReturnValue({
				data: {
					id: 55,
					email: 'user@test.com',
					first_name: 'John',
					last_name: 'Doe',
					gender: 'H',
					is_active: true,
					is_staff: false,
				},
				isLoading: false,
				error: undefined,
			});

			renderWithProviders(<UsersFormClient session={mockSession} id={55} />);
			expect(screen.getByTestId('submit-button')).toHaveTextContent('Mettre à jour');
		});

		it('still renders back button in edit mode', () => {
			mockUseGetUserQuery.mockReturnValue({
				data: { id: 55, email: 'user@test.com', first_name: 'John', last_name: 'Doe' },
				isLoading: false,
				error: undefined,
			});

			renderWithProviders(<UsersFormClient session={mockSession} id={55} />);
			expect(screen.getByText('Liste des utilisateurs')).toBeInTheDocument();
		});
	});

	describe('Loading state', () => {
		it('shows loader when data is loading', () => {
			mockUseGetUserQuery.mockReturnValue({
				data: undefined,
				isLoading: true,
				error: undefined,
			});

			renderWithProviders(<UsersFormClient session={mockSession} id={55} />);
			expect(screen.getByTestId('api-loader')).toBeInTheDocument();
		});
	});

	describe('Hook calls', () => {
		it('calls useGetUserQuery when in edit mode', () => {
			renderWithProviders(<UsersFormClient session={mockSession} id={456} />);
			expect(mockUseGetUserQuery).toHaveBeenCalledWith({ id: 456 }, expect.any(Object));
		});
	});

	describe('live updates while editing', () => {
		const user = {
			id: 55,
			email: 'user@test.com',
			first_name: 'John',
			last_name: 'Doe',
			gender: 'H',
			role: 'designer',
			is_active: true,
			is_staff: false,
			can_edit: false,
		};
		const setServerUser = (data: typeof user) => mockUseGetUserQuery.mockReturnValue({ data, isLoading: false });
		const editFirstName = async (value: string) =>
			act(async () => {
				fireEvent.change(screen.getByTestId('input-first_name').querySelector('input')!, { target: { value } });
			});

		it('keeps a dirty field while updating clean fields and permissions', async () => {
			setServerUser(user);
			const view = renderWithProviders(<UsersFormClient session={mockSession} id={55} />);
			await editFirstName('Local draft');
			setServerUser({ ...user, last_name: 'Remote last name', is_staff: true, can_edit: true });
			view.rerender(
				<Provider store={mockStore}>
					<UsersFormClient session={mockSession} id={55} />
				</Provider>,
			);

			expect(screen.getByTestId('input-first_name').querySelector('input')).toHaveValue('Local draft');
			expect(screen.getByTestId('input-last_name').querySelector('input')).toHaveValue('Remote last name');
			expect(document.getElementById('is_staff')).toBeChecked();
			expect(document.getElementById('can_edit')).toBeChecked();
			expect(screen.queryByRole('status')).not.toBeInTheDocument();
		});

		it('warns on a same-field conflict and saves only the local changes', async () => {
			setServerUser(user);
			mockEditUserMutation.mockReturnValue({ unwrap: jest.fn().mockResolvedValue(user) });
			const view = renderWithProviders(<UsersFormClient session={mockSession} id={55} />);
			await editFirstName('Local draft');
			setServerUser({ ...user, first_name: 'Remote first name', last_name: 'Remote last name', is_staff: true });
			view.rerender(
				<Provider store={mockStore}>
					<UsersFormClient session={mockSession} id={55} />
				</Provider>,
			);

			expect(screen.getByRole('status')).toHaveTextContent('Vos saisies sont conservées');
			await act(async () => {
				fireEvent.submit(screen.getByTestId('submit-button').closest('form')!);
			});
			await waitFor(() =>
				expect(mockEditUserMutation).toHaveBeenCalledWith({ id: 55, data: { first_name: 'Local draft' } }),
			);
			expect(mockCheckEmailMutation).not.toHaveBeenCalled();
		});

		it('does not carry an unfinished draft into a different user', async () => {
			setServerUser(user);
			const view = renderWithProviders(<UsersFormClient session={mockSession} id={55} />);
			await editFirstName('Local draft');
			setServerUser({ ...user, id: 77, first_name: 'Another user' });
			view.rerender(
				<Provider store={mockStore}>
					<UsersFormClient session={mockSession} id={77} />
				</Provider>,
			);
			expect(screen.getByTestId('input-first_name').querySelector('input')).toHaveValue('Another user');
		});
	});

	describe('Rich data rendering', () => {
		it('renders with API error in edit mode', () => {
			mockUseGetUserQuery.mockReturnValue({
				data: undefined,
				isLoading: false,
				error: { status: 500, data: { message: 'Server Error' } },
			});
			renderWithProviders(<UsersFormClient session={mockSession} id={55} />);
			expect(screen.getByTestId('api-alert')).toBeInTheDocument();
		});

		it('renders edit mode with full user data', () => {
			mockUseGetUserQuery.mockReturnValue({
				data: {
					id: 55,
					email: 'user@test.com',
					first_name: 'John',
					last_name: 'Doe',
					gender: 'H',
					is_active: true,
					is_staff: false,
					avatar: 'data:image/png;base64,abc',
					avatar_cropped: 'data:image/png;base64,def',
				},
				isLoading: false,
				error: undefined,
			});
			renderWithProviders(<UsersFormClient session={mockSession} id={55} />);
			expect(screen.getByTestId('submit-button')).toHaveTextContent('Mettre à jour');
		});

		it('renders edit mode with is_staff=true', () => {
			mockUseGetUserQuery.mockReturnValue({
				data: {
					id: 99,
					email: 'staff@test.com',
					first_name: 'Staff',
					last_name: 'User',
					gender: 'H',
					is_active: true,
					is_staff: true,
				},
				isLoading: false,
				error: undefined,
			});
			renderWithProviders(<UsersFormClient session={mockSession} id={99} />);
			expect(screen.getByTestId('submit-button')).toHaveTextContent('Mettre à jour');
		});

		it('renders edit mode with is_active=false', () => {
			mockUseGetUserQuery.mockReturnValue({
				data: {
					id: 88,
					email: 'inactive@test.com',
					first_name: 'Inactive',
					last_name: 'User',
					is_active: false,
					is_staff: false,
				},
				isLoading: false,
				error: undefined,
			});
			renderWithProviders(<UsersFormClient session={mockSession} id={88} />);
			expect(screen.getByTestId('submit-button')).toHaveTextContent('Mettre à jour');
		});

		it('renders edit mode with user having null optional fields', () => {
			mockUseGetUserQuery.mockReturnValue({
				data: {
					id: 77,
					email: 'user@test.com',
					first_name: 'Test',
					last_name: 'User',
					gender: null,
					avatar: null,
					avatar_cropped: null,
				},
				isLoading: false,
				error: undefined,
			});
			renderWithProviders(<UsersFormClient session={mockSession} id={77} />);
			expect(screen.getByTestId('submit-button')).toHaveTextContent('Mettre à jour');
		});

		it('renders edit mode with female gender', () => {
			mockUseGetUserQuery.mockReturnValue({
				data: {
					id: 66,
					email: 'female@test.com',
					first_name: 'Jane',
					last_name: 'Doe',
					gender: 'F',
					is_active: true,
					is_staff: false,
				},
				isLoading: false,
				error: undefined,
			});
			renderWithProviders(<UsersFormClient session={mockSession} id={66} />);
			expect(screen.getByTestId('submit-button')).toHaveTextContent('Mettre à jour');
		});

		it('handles add mutation loading state', () => {
			const accountService = jest.requireMock('@/store/services/account') as {
				useAddUserMutation: () => [jest.Mock, { isLoading: boolean; error?: unknown }];
			};
			const mockMutate = jest.fn();
			accountService.useAddUserMutation = () => [mockMutate, { isLoading: true, error: undefined }];

			renderWithProviders(<UsersFormClient session={mockSession} />);
			expect(screen.getByTestId('api-loader')).toBeInTheDocument();
		});

		it('handles edit mutation loading state', () => {
			const accountService = jest.requireMock('@/store/services/account') as {
				useEditUserMutation: () => [jest.Mock, { isLoading: boolean; error?: unknown }];
			};
			const mockMutate = jest.fn();
			accountService.useEditUserMutation = () => [mockMutate, { isLoading: true, error: undefined }];

			mockUseGetUserQuery.mockReturnValue({
				data: { id: 99, email: 'user@test.com', first_name: 'Test', last_name: 'User' },
				isLoading: false,
				error: undefined,
			});

			renderWithProviders(<UsersFormClient session={mockSession} id={99} />);
			expect(screen.getByTestId('api-loader')).toBeInTheDocument();
		});
	});
});
