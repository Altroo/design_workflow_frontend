import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkflowSearchSelect } from './workflowSearchSelect';
import { fr } from '@/translations/fr';

jest.mock('@/utils/hooks', () => ({ useLanguage: () => ({ t: fr }) }));
beforeAll(() => {
	HTMLElement.prototype.scrollIntoView = jest.fn();
});
const options = [
	{ value: '', label: 'Choisir un projet' },
	...Array.from({ length: 30 }, (_, index) => ({
		value: index + 1,
		label: index === 24 ? 'Résidence Atlas' : `Projet ${index + 1}`,
	})),
];

it('searches 30 projects without accents and selects only a permitted existing result', async () => {
	const change = jest.fn();
	const user = userEvent.setup();
	render(<WorkflowSearchSelect value="" options={options} onChangeAction={change} ariaLabel="Projet" />);
	const input = screen.getByRole('combobox', { name: 'Projet' });
	await user.click(input);
	await user.type(input, 'residence');
	expect(screen.getAllByRole('option')).toHaveLength(1);
	expect(change).not.toHaveBeenCalled();
	await user.keyboard('{Enter}');
	expect(change).toHaveBeenCalledWith('25');
	expect(input).toHaveAttribute('aria-expanded', 'false');
});

it('retains the prior selection when a search is dismissed and does not submit its parent form', async () => {
	const change = jest.fn(),
		submit = jest.fn();
	const user = userEvent.setup();
	render(
		<form
			onSubmit={(event) => {
				event.preventDefault();
				submit();
			}}
		>
			<WorkflowSearchSelect value="25" options={options} onChangeAction={change} ariaLabel="Projet" />
		</form>,
	);
	const input = screen.getByRole('combobox');
	expect(input).toHaveValue('Résidence Atlas');
	await user.click(input);
	await user.type(input, 'missing');
	expect(screen.getByRole('status')).toHaveTextContent(fr.common.noOptions);
	await user.keyboard('{Enter}{Escape}');
	expect(submit).not.toHaveBeenCalled();
	expect(change).not.toHaveBeenCalled();
	expect(input).toHaveValue('Résidence Atlas');
});

it('supports arrows and a disabled field; removes stale selections visually', () => {
	const change = jest.fn();
	const view = render(
		<WorkflowSearchSelect value="missing" options={options} onChangeAction={change} ariaLabel="Projet" />,
	);
	const input = screen.getByRole('combobox');
	expect(input).toHaveValue('');
	fireEvent.keyDown(input, { key: 'ArrowDown' });
	fireEvent.keyDown(input, { key: 'ArrowDown' });
	fireEvent.keyDown(input, { key: 'Enter' });
	expect(change).toHaveBeenCalledWith('2');
	view.rerender(
		<WorkflowSearchSelect value="1" options={options} onChangeAction={change} ariaLabel="Projet" disabled />,
	);
	expect(input).toBeDisabled();
});
