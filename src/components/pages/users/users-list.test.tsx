import React from 'react';
import { render, screen, cleanup, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
	useRouter: () => ({
		push: mockPush,
		back: jest.fn(),
		forward: jest.fn(),
		refresh: jest.fn(),
		replace: jest.fn(),
		prefetch: jest.fn(),
	}),
}));

// Mock InitContext
jest.mock('@/contexts/InitContext', () => ({
	useInitAccessToken: jest.fn(() => 'mock-token'),
}));

// Mock toast hook
const mockOnSuccess = jest.fn();
const mockOnError = jest.fn();
jest.mock('@/utils/hooks', () => {
	const { translations } = jest.requireActual('@/translations');
	return {
		useToast: () => ({ onSuccess: mockOnSuccess, onError: mockOnError }),
		useLanguage: () => ({ t: translations.fr }),
	};
});

// Mock RTK Query hooks
const mockRefetch = jest.fn();
const mockDeleteUser = jest.fn(() => ({ unwrap: () => Promise.resolve() }));

const mockUseGetUsersListQuery = jest.fn(() => ({
	data: {
		results: [
			{
				id: 1,
				first_name: 'John',
				last_name: 'Doe',
				email: 'john@test.com',
				gender: 'Homme',
				is_staff: true,
				is_active: true,
				date_joined: '2025-01-10',
				last_login: '2025-06-01',
				avatar: 'https://example.com/avatar.jpg',
			},
			{
				id: 2,
				first_name: 'Jane',
				last_name: 'Smith',
				email: 'jane@test.com',
				gender: 'Femme',
				is_staff: false,
				is_active: false,
				date_joined: '2025-02-15',
				last_login: null,
				avatar: null,
			},
		],
		count: 2,
		next: null,
		previous: null,
	},
	isLoading: false,
	refetch: mockRefetch,
}));

jest.mock('@/store/services/account', () => ({
	useGetUsersListQuery: () => mockUseGetUsersListQuery(),
	useDeleteUserMutation: jest.fn(() => [mockDeleteUser, { isLoading: false }]),
	useBulkDeleteUsersMutation: jest.fn(() => [jest.fn(), { isLoading: false }]),
}));

// Mock Protected
jest.mock('@/components/layouts/protected/protected', () => ({
	Protected: ({ children }: { children: React.ReactNode }) => <div data-testid="protected">{children}</div>,
}));

// Mock NavigationBar
jest.mock('@/components/layouts/navigationBar/navigationBar', () => {
	const Mock = ({ children }: { children: React.ReactNode }) => <div data-testid="navigation-bar">{children}</div>;
	Mock.displayName = 'NavigationBar';
	return { __esModule: true, default: Mock };
});

// Enhanced PaginatedDataGrid mock that calls renderCell
jest.mock('@/components/shared/paginatedDataGrid/paginatedDataGrid', () => ({
	__esModule: true,
	default: ({
		columns,
		data,
	}: {
		columns: Array<{
			field: string;
			headerName: string;
			renderCell?: (params: { value: unknown; row: Record<string, unknown>; field: string }) => React.ReactNode;
		}>;
		data?: { results?: Array<Record<string, unknown>> };
		isLoading?: boolean;
		onCustomFilterParamsChange?: (params: Record<string, string>) => void;
	}) => {
		const results = data?.results || [];
		return (
			<div data-testid="paginated-data-grid">
				<table>
					<thead>
						<tr>
							{columns.map((col) => (
								<th key={col.field}>{col.headerName}</th>
							))}
						</tr>
					</thead>
					<tbody>
						{results.map((row) => (
							<tr key={row.id as number} data-testid={`row-${row.id}`}>
								{columns.map((col) => (
									<td key={col.field}>
										{col.renderCell
											? col.renderCell({ value: row[col.field], row, field: col.field })
											: String(row[col.field] ?? '')}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		);
	},
}));

// Mock ActionModals
jest.mock('@/components/htmlElements/modals/actionModal/actionModals', () => ({
	__esModule: true,
	default: ({
		title,
		body,
		actions,
	}: {
		title: string;
		body: string;
		actions: Array<{ text: string; onClick: () => void }>;
	}) => (
		<div data-testid="action-modal" role="dialog">
			<h2>{title}</h2>
			<p>{body}</p>
			<div>
				{actions.map((action) => (
					<button key={action.text} onClick={action.onClick}>
						{action.text}
					</button>
				))}
			</div>
		</div>
	),
}));

// Mock MobileActionsMenu
jest.mock('@/components/shared/mobileActionsMenu/mobileActionsMenu', () => ({
	__esModule: true,
	default: ({ actions }: { actions: Array<{ label: string; onClick: () => void }> }) => (
		<div data-testid="mobile-actions-menu">
			{actions.map((a) => (
				<button key={a.label} onClick={a.onClick}>
					{a.label}
				</button>
			))}
		</div>
	),
}));

jest.mock('@/components/htmlElements/tooltip/darkTooltip/darkTooltip', () => ({
	__esModule: true,
	default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/components/shared/dropdownFilter/dropdownFilter', () => ({
	createDropdownFilterOperators: jest.fn(() => []),
	createBooleanFilterOperators: jest.fn(() => []),
}));

jest.mock('@/components/shared/dateRangeFilter/dateRangeFilterOperator', () => ({
	createDateRangeFilterOperator: jest.fn(() => []),
}));

jest.mock('@/utils/helpers', () => ({
	formatDate: (date: string | null) => (date ? new Date(date).toLocaleDateString('fr-FR') : '—'),
	extractApiErrorMessage: (error: unknown, fallback: string) => fallback,
}));

jest.mock('next/image', () => ({
	__esModule: true,
	default: ({ alt = '', ...props }: Record<string, unknown>) => {
		delete props.unoptimized;
		delete props.priority;
		delete props.fill;
		// eslint-disable-next-line @next/next/no-img-element
		return <img {...props} alt={String(alt)} />;
	},
}));

import UsersListClient from './users-list';

describe('UsersListClient', () => {
	beforeEach(() => jest.clearAllMocks());
	afterEach(() => cleanup());

	describe('Rendering', () => {
		it('renders protected wrapper', () => {
			render(<UsersListClient />);
			expect(screen.getByTestId('protected')).toBeInTheDocument();
		});

		it('renders workflow users table', () => {
			render(<UsersListClient />);
			expect(screen.getByRole('table')).toBeInTheDocument();
		});

		it('renders Nouveau utilisateur button', () => {
			render(<UsersListClient />);
			expect(screen.getByRole('button', { name: 'Nouveau utilisateur' })).toBeInTheDocument();
		});

		it('renders data rows', () => {
			render(<UsersListClient />);
			expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
			expect(screen.getAllByText('Jane Smith').length).toBeGreaterThan(0);
		});
	});

	describe('Column renderCell', () => {
		it('renders avatar with image src', () => {
			render(<UsersListClient />);
			expect(screen.getAllByAltText('John Doe').length).toBeGreaterThan(0);
		});

		it('renders first_name and last_name', () => {
			render(<UsersListClient />);
			expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
			expect(screen.getAllByText('Jane Smith').length).toBeGreaterThan(0);
		});

		it('renders email values', () => {
			render(<UsersListClient />);
			expect(screen.getAllByText('john@test.com').length).toBeGreaterThan(0);
			expect(screen.getAllByText('jane@test.com').length).toBeGreaterThan(0);
		});

		it('renders gender values', () => {
			render(<UsersListClient />);
			expect(screen.getAllByText('Homme').length).toBeGreaterThan(0);
			expect(screen.getAllByText('Femme').length).toBeGreaterThan(0);
		});

		it('renders registration dates', () => {
			render(<UsersListClient />);
			expect(screen.getAllByText('10/01/2025').length).toBeGreaterThan(0);
			expect(screen.getAllByText('15/02/2025').length).toBeGreaterThan(0);
		});

		it('renders action buttons for each row', () => {
			render(<UsersListClient />);
			expect(screen.getAllByRole('button', { name: 'Voir' }).length).toBeGreaterThanOrEqual(2);
			expect(screen.getAllByRole('button', { name: 'Modifier' }).length).toBeGreaterThanOrEqual(2);
			expect(screen.getAllByRole('button', { name: 'Supprimer' }).length).toBeGreaterThanOrEqual(2);
		});
	});

	describe('Action handlers', () => {
		it('navigates to add page', () => {
			render(<UsersListClient />);
			fireEvent.click(screen.getByRole('button', { name: 'Nouveau utilisateur' }));
			expect(mockPush).toHaveBeenCalled();
		});

		it('navigates to view page', () => {
			render(<UsersListClient />);
			fireEvent.click(screen.getAllByRole('button', { name: 'Voir' })[0]);
			expect(mockPush).toHaveBeenCalled();
		});

		it('navigates to edit page', () => {
			render(<UsersListClient />);
			fireEvent.click(screen.getAllByRole('button', { name: 'Modifier' })[0]);
			expect(mockPush).toHaveBeenCalled();
		});

		it('opens delete modal', async () => {
			render(<UsersListClient />);
			await act(async () => { fireEvent.click(screen.getAllByRole('button', { name: 'Supprimer' })[0]); });
			expect(screen.getByTestId('action-modal')).toBeInTheDocument();
			expect(screen.getByText('Supprimer cet utilisateur ?')).toBeInTheDocument();
		});

		it('closes delete modal on Annuler', async () => {
			render(<UsersListClient />);
			await act(async () => { fireEvent.click(screen.getAllByRole('button', { name: 'Supprimer' })[0]); });
			await act(async () => { fireEvent.click(screen.getByText('Annuler')); });
			expect(screen.queryByTestId('action-modal')).not.toBeInTheDocument();
		});

		it('deletes user on confirm', async () => {
			render(<UsersListClient />);
			await act(async () => { fireEvent.click(screen.getAllByRole('button', { name: 'Supprimer' })[0]); });
			const btns = screen.getAllByRole('button', { name: 'Supprimer' });
			await act(async () => { fireEvent.click(btns[btns.length - 1]); });
			await waitFor(() => {
				expect(mockDeleteUser).toHaveBeenCalled();
				expect(mockOnSuccess).toHaveBeenCalledWith('Utilisateur supprimé avec succès');
			});
		});

		it('handles delete error', async () => {
			mockDeleteUser.mockReturnValueOnce({ unwrap: () => Promise.reject(new Error('fail')) });
			render(<UsersListClient />);
			await act(async () => { fireEvent.click(screen.getAllByRole('button', { name: 'Supprimer' })[0]); });
			const btns = screen.getAllByRole('button', { name: 'Supprimer' });
			await act(async () => { fireEvent.click(btns[btns.length - 1]); });
			await waitFor(() => {
				expect(mockOnError).toHaveBeenCalledWith("Erreur lors de la suppression de l'utilisateur");
			});
		});
	});

	describe('Column headers', () => {
		it('renders all expected column headers', () => {
			render(<UsersListClient />);
			for (const h of ['Utilisateur', 'Email', 'Genre', 'Active', 'Admin', "Date d'inscription", 'Actions']) {
				expect(screen.getByText(h)).toBeInTheDocument();
			}
		});
	});

	describe('Loading and empty states', () => {
		it('keeps the users shell when loading', () => {
			mockUseGetUsersListQuery.mockReturnValueOnce({ data: { results: [], count: 0, next: null, previous: null }, isLoading: true, refetch: mockRefetch });
			render(<UsersListClient />);
			expect(screen.getByText('Registre utilisateurs')).toBeInTheDocument();
		});

		it('renders empty state when empty', () => {
			mockUseGetUsersListQuery.mockReturnValueOnce({ data: { results: [], count: 0, next: null, previous: null }, isLoading: false, refetch: mockRefetch });
			render(<UsersListClient />);
			expect(screen.getAllByText('Aucun utilisateur trouvé.').length).toBeGreaterThan(0);
		});
	});
});
