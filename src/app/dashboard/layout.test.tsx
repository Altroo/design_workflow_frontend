import { render, screen } from '@testing-library/react';
import DashboardLayout from './layout';

it('preserves the dashboard page content inside its section', () => {
	render(
		<DashboardLayout>
			<h1>Board</h1>
		</DashboardLayout>,
	);
	expect(screen.getByRole('heading', { name: 'Board' }).parentElement?.tagName).toBe('SECTION');
});
