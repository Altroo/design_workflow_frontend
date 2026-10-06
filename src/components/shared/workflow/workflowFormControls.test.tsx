import { fireEvent, render, screen } from '@testing-library/react';
import { WorkflowDateField, WorkflowSelectField } from './workflowFormControls';

let mockLanguage = 'fr';
const mockPicker = jest.fn();

jest.mock('@/utils/hooks', () => ({ useLanguage: () => ({ language: mockLanguage }) }));
jest.mock('react-day-picker', () => ({
	DayPicker: (props: { onSelect: (date: Date) => void; locale: { code: string } }) => {
		mockPicker(props);
		return <button onClick={() => props.onSelect(new Date(2026, 9, 5))}>Choose day</button>;
	},
}));

beforeAll(() => {
	HTMLElement.prototype.scrollIntoView = jest.fn();
	HTMLElement.prototype.hasPointerCapture = jest.fn(() => false);
	HTMLElement.prototype.releasePointerCapture = jest.fn();
});

it.each([
	['fr', '15/09/2026', 'fr'],
	['en', '09/15/2026', 'en-US'],
])('localizes date display and calendar in %s', (language, label, locale) => {
	mockLanguage = language;
	const onChangeAction = jest.fn();
	render(<WorkflowDateField value="2026-09-15" ariaLabel="Date" onChangeAction={onChangeAction} />);
	expect(screen.getByRole('button', { name: 'Date' })).toHaveTextContent(label);
	fireEvent.click(screen.getByRole('button', { name: 'Date' }));
	expect(mockPicker).toHaveBeenLastCalledWith(
		expect.objectContaining({ locale: expect.objectContaining({ code: locale }) }),
	);
	fireEvent.click(screen.getByRole('button', { name: 'Choose day' }));
	expect(onChangeAction).toHaveBeenCalledWith('2026-10-05');
});

it('clears dates and safely displays a removed select option as the empty choice', () => {
	mockLanguage = 'en';
	const onChangeAction = jest.fn();
	render(
		<>
			<WorkflowDateField value="2026-09-15" onChangeAction={onChangeAction} />
			<WorkflowSelectField
				value="missing"
				ariaLabel="Project"
				onChangeAction={onChangeAction}
				options={[
					{ value: '', label: 'All projects' },
					{ value: 1, label: 'Project A' },
				]}
			/>
		</>,
	);
	fireEvent.click(screen.getByRole('button', { name: 'Clear date' }));
	expect(onChangeAction).toHaveBeenCalledWith('');
	expect(screen.getByRole('combobox')).toHaveTextContent('All projects');
	fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' });
	fireEvent.click(screen.getByRole('option', { name: 'Project A' }));
	expect(onChangeAction).toHaveBeenLastCalledWith('1');
});
