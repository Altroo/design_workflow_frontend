import { fireEvent, render, screen } from '@testing-library/react';
import { TaskTimeHistory } from '@/components/design-workflow/task/panels/taskTimeHistory';
import { en } from '@/translations/en';

const mockQuery = jest.fn();
jest.mock('@/store/services/designWorkflow', () => ({
	useGetTaskTimeEntriesQuery: (args: unknown) => mockQuery(args),
}));
jest.mock('@/utils/hooks', () => ({ useLanguage: () => ({ t: en, language: 'en' }), useAppSelector: () => [] }));

describe('TaskTimeHistory', () => {
	it('fetches older pages instead of paginating the embedded fifty entries', () => {
		mockQuery.mockImplementation(({ page }: { page: number }) => ({
			currentData: {
				count: 56,
				results: [
					{
						id: page,
						user: { first_name: 'Designer', last_name: 'One', email: 'one@example.com' },
						minutes: 60,
						created_at: '2026-10-05T09:00:00Z',
						note: `Page ${page}`,
					},
				],
			},
			isFetching: false,
		}));
		render(<TaskTimeHistory taskId={42} />);
		for (let page = 1; page < 12; page++) fireEvent.click(screen.getAllByRole('button').at(-1)!);
		expect(mockQuery).toHaveBeenLastCalledWith({ id: 42, page: 12 });
		expect(screen.getByText('Page 12')).toBeInTheDocument();
		expect(screen.queryByText('Page 1')).not.toBeInTheDocument();
		expect(screen.getAllByRole('button').at(-1)).toBeDisabled();
	});
	it('shows a retry action on failure rather than a misleading empty history', () => {
		const refetch = jest.fn();
		mockQuery.mockReturnValue({ isError: true, isFetching: false, refetch });
		render(<TaskTimeHistory taskId={42} />);
		fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
		expect(refetch).toHaveBeenCalled();
		expect(screen.getByRole('alert')).toBeInTheDocument();
	});
});
