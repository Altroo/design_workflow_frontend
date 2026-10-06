import { designerA, mockProfile } from '@/components/design-workflow/__testutils__/workflowTestSetup';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import {
	Area,
	Chip,
	DeferredHexColorPicker,
	EmptyState,
	Field,
	FieldLabel,
	HistoryPager,
	Surface,
	ToggleField,
	WorkDaysField,
	mentionTokenForUser,
} from './workflowFields';
import { WORK_DAY_MINUTES } from '@/utils/rawData';

jest.mock('react-colorful', () => ({
	HexColorPicker: ({ onChange }: { onChange: (value: string) => void }) => (
		<input aria-label="Pick color" onChange={(event) => onChange(event.target.value)} />
	),
}));

it('converts displayed work days to minutes and preserves an empty field', () => {
	const onChange = jest.fn();
	render(<WorkDaysField value={String(2 * WORK_DAY_MINUTES)} onChangeAction={onChange} />);
	expect(screen.getByRole('spinbutton')).toHaveValue(2);
	fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '3' } });
	expect(onChange).toHaveBeenLastCalledWith(String(3 * WORK_DAY_MINUTES));
	fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '' } });
	expect(onChange).toHaveBeenLastCalledWith('');
});

it('navigates mention suggestions with the keyboard without deleting surrounding text', async () => {
	mockProfile(designerA);
	const Harness = () => {
		const [value, setValue] = useState('Please ask ');
		return <Area value={value} onChangeAction={setValue} mentionUsers={[designerA]} />;
	};
	render(<Harness />);
	await userEvent.setup().type(screen.getByRole('textbox'), '@din{Enter}');
	expect(screen.getByRole('textbox')).toHaveValue('Please ask @dina.designer ');
	expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
	expect(mentionTokenForUser({ ...designerA, first_name: 'Élodie', last_name: 'Dâr' })).toBe('elodie.dar');
});

it('commits color changes only when the picker interaction finishes', () => {
	const onCommit = jest.fn();
	render(<DeferredHexColorPicker value="#ffffff" onCommitAction={onCommit} />);
	const picker = screen.getByLabelText('Pick color');
	fireEvent.change(picker, { target: { value: '#112233' } });
	fireEvent.change(picker, { target: { value: '#334455' } });
	expect(onCommit).not.toHaveBeenCalled();
	fireEvent.pointerUp(picker);
	expect(onCommit).toHaveBeenCalledWith('#334455');
});

it('bounds history pagination and hides it for a single page', async () => {
	const onChange = jest.fn();
	const { rerender } = render(<HistoryPager page={1} totalPages={2} onChangeAction={onChange} />);
	expect(screen.getAllByRole('button')[0]).toBeDisabled();
	await userEvent.setup().click(screen.getAllByRole('button')[1]);
	expect(onChange).toHaveBeenCalledWith(2);
	rerender(<HistoryPager page={1} totalPages={1} onChangeAction={onChange} />);
	expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

it('preserves labels, surface actions and semantic chip state', async () => {
	const change = jest.fn();
	render(
		<Surface title="Details" description="Edit details" action={<button>Help</button>}>
			<FieldLabel htmlFor="title">Title</FieldLabel>
			<Field id="title" value="" onChangeAction={change} />
			<ToggleField label="Notify me" checked={false} onChangeAction={change} />
			<Chip status="done" tone="progress">
				Done
			</Chip>
			<EmptyState title="No files" description="Attach a plan" action={<button>Add file</button>} />
		</Surface>,
	);
	fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Plan' } });
	expect(change).toHaveBeenCalledWith('Plan');
	await userEvent.setup().click(screen.getByText('Notify me'));
	expect(change).toHaveBeenCalledWith(true);
	expect(screen.getByText('Done')).toHaveAttribute('data-status', 'done');
	expect(screen.getByRole('button', { name: 'Add file' })).toBeInTheDocument();
});
