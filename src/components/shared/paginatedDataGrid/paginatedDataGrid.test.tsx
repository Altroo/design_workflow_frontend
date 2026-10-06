import { fireEvent, render, screen } from '@testing-library/react';
import PaginatedDataGrid from './paginatedDataGrid';

it('renders rows, sends search changes and respects pagination boundaries', () => {
	const setPaginationModel = jest.fn(),
		setSearchTerm = jest.fn();
	render(
		<PaginatedDataGrid
			data={{ count: 20, results: [{ id: 1, title: 'Task A' }] }}
			columns={[{ field: 'title', headerName: 'Title' }]}
			paginationModel={{ page: 0, pageSize: 5 }}
			setPaginationModel={setPaginationModel}
			searchTerm=""
			setSearchTerm={setSearchTerm}
		/>,
	);
	expect(screen.getByText('Task A')).toBeInTheDocument();
	expect(screen.getByRole('button', { name: 'Prev' })).toBeDisabled();
	fireEvent.click(screen.getByRole('button', { name: 'Next' }));
	expect(setPaginationModel.mock.calls[0][0]({ page: 0, pageSize: 5 })).toEqual({ page: 1, pageSize: 5 });
	fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'Task' } });
	expect(setSearchTerm).toHaveBeenCalledWith('Task');
});

it('selects and opens the intended row', () => {
	const onSelectionChange = jest.fn(),
		onRowClick = jest.fn();
	render(
		<PaginatedDataGrid
			data={{ count: 1, results: [{ id: 7, title: 'Task A' }] }}
			columns={[{ field: 'title' }]}
			paginationModel={{ page: 0, pageSize: 5 }}
			setPaginationModel={jest.fn()}
			searchTerm=""
			setSearchTerm={jest.fn()}
			onSelectionChange={onSelectionChange}
			onRowClick={onRowClick}
		/>,
	);
	fireEvent.click(screen.getByRole('checkbox'));
	expect(onSelectionChange).toHaveBeenCalledWith([7]);
	expect(onRowClick).not.toHaveBeenCalled();
	fireEvent.click(screen.getByText('Task A'));
	expect(onRowClick).toHaveBeenLastCalledWith({ row: { id: 7, title: 'Task A' } });
});
