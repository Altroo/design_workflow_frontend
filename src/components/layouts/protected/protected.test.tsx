import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Protected } from './protected';
import { usePermission, useAppSelector, useAppDispatch } from '@/utils/hooks';
import { useSession } from 'next-auth/react';
import { useInitAccessToken } from '@/contexts/InitContext';
import { useGetProfilQuery } from '@/store/services/account';

jest.mock('@/utils/hooks', () => ({
	usePermission: jest.fn(),
	useAppSelector: jest.fn(),
	useAppDispatch: jest.fn(),
	useLanguage: () => ({ language: 'fr', setLanguage: jest.fn(), t: jest.requireActual('@/translations').translations.fr }),
}));
jest.mock('next-auth/react', () => ({ useSession: jest.fn() }));
jest.mock('@/contexts/InitContext', () => ({ useInitAccessToken: jest.fn() }));
jest.mock('@/store/services/account', () => ({ useGetProfilQuery: jest.fn() }));

describe('Protected component', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(useAppDispatch as jest.Mock).mockReturnValue(jest.fn());
		(useSession as jest.Mock).mockReturnValue({ data: { accessToken: 'token' }, status: 'authenticated' });
		(useInitAccessToken as jest.Mock).mockReturnValue('token');
		(useGetProfilQuery as jest.Mock).mockReturnValue({ data: undefined, isLoading: false, isFetching: false });
	});

	it('renders children when is_staff is true (default permission)', () => {
		(useAppSelector as jest.Mock).mockReturnValue({ id: 1 });
		(usePermission as jest.Mock).mockReturnValue({
			is_staff: true,
			can_view: false,
			can_print: false,
			can_create: false,
			can_edit: false,
			can_delete: false,
		});

		render(
			<Protected>
				<div>Secret Content</div>
			</Protected>,
		);

		expect(screen.getByText('Secret Content')).toBeInTheDocument();
		expect(screen.queryByText('Accès Refusé')).not.toBeInTheDocument();
	});

	it('renders access denied message when is_staff is false (default permission)', () => {
		(useAppSelector as jest.Mock).mockReturnValue({ id: 1 });
		(usePermission as jest.Mock).mockReturnValue({
			is_staff: false,
			can_view: false,
			can_print: false,
			can_create: false,
			can_edit: false,
			can_delete: false,
		});

		render(
			<Protected>
				<div>Secret Content</div>
			</Protected>,
		);

		expect(screen.getByText('Accès Refusé')).toBeInTheDocument();
		expect(screen.getByText(/Vous n'avez pas la permission d'accéder à cette page/i)).toBeInTheDocument();
		expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
	});

	it('renders children when specific permission is granted', () => {
		(useAppSelector as jest.Mock).mockReturnValue({ id: 1 });
		(usePermission as jest.Mock).mockReturnValue({
			is_staff: false,
			can_view: true,
			can_print: false,
			can_create: false,
			can_edit: false,
			can_delete: false,
		});

		render(
			<Protected permission="can_view">
				<div>Viewable Content</div>
			</Protected>,
		);

		expect(screen.getByText('Viewable Content')).toBeInTheDocument();
		expect(screen.queryByText('Accès Refusé')).not.toBeInTheDocument();
	});

	it('renders access denied when specific permission is not granted', () => {
		(useAppSelector as jest.Mock).mockReturnValue({ id: 1 });
		(usePermission as jest.Mock).mockReturnValue({
			is_staff: false,
			can_view: false,
			can_print: false,
			can_create: false,
			can_edit: false,
			can_delete: false,
		});

		render(
			<Protected permission="can_edit">
				<div>Editable Content</div>
			</Protected>,
		);

		expect(screen.getByText('Accès Refusé')).toBeInTheDocument();
		expect(screen.queryByText('Editable Content')).not.toBeInTheDocument();
	});

	it('hydrates missing profile before checking permissions', () => {
		(useAppSelector as jest.Mock).mockReturnValue({});
		(usePermission as jest.Mock).mockReturnValue({
			is_staff: false,
			can_view: false,
			can_print: false,
			can_create: false,
			can_edit: false,
			can_delete: false,
		});
		(useGetProfilQuery as jest.Mock).mockReturnValue({
			data: { id: 7, is_staff: true },
			isLoading: false,
			isFetching: false,
		});

		render(
			<Protected>
				<div>Hydrated Content</div>
			</Protected>,
		);

		expect(screen.getByText('Hydrated Content')).toBeInTheDocument();
	});
});
