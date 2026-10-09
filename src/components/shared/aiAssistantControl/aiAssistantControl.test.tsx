import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import AiAssistantControl from './aiAssistantControl';
import { fr } from '@/translations/fr';
import { en } from '@/translations/en';

const mockAssist = jest.fn();
const mockSuccess = jest.fn();
let mockLanguage = fr;
jest.mock('@/store/services/aiAssistant', () => ({ useAssistTextMutation: () => [mockAssist] }));
jest.mock('@/utils/hooks', () => ({
	useLanguage: () => ({ t: mockLanguage }),
	useToast: () => ({ onSuccess: mockSuccess }),
}));

const props = { value: 'Les image sont pret.', onApply: jest.fn(), context: 'comment' as const };
const originalFlag = process.env.NEXT_PUBLIC_AI_ASSISTANT_ENABLED;
const response = (suggested_text = 'Les images sont prêtes.') => ({ original_text: props.value, suggested_text });
const success = (text?: string) =>
	mockAssist.mockImplementation(() => ({ unwrap: () => Promise.resolve(response(text)), abort: jest.fn() }));

beforeEach(() => {
	jest.clearAllMocks();
	process.env.NEXT_PUBLIC_AI_ASSISTANT_ENABLED = 'true';
	mockLanguage = fr;
	success();
});
afterAll(() => {
	if (originalFlag === undefined) delete process.env.NEXT_PUBLIC_AI_ASSISTANT_ENABLED;
	else process.env.NEXT_PUBLIC_AI_ASSISTANT_ENABLED = originalFlag;
});

it('renders exactly three explicit writing actions, also in English', () => {
	const view = render(<AiAssistantControl {...props} />);
	expect(screen.getAllByRole('button')).toHaveLength(3);
	expect(screen.getByRole('button', { name: fr.aiAssistant.translate })).toBeEnabled();
	expect(mockAssist).not.toHaveBeenCalled();
	mockLanguage = en;
	view.rerender(<AiAssistantControl {...props} />);
	expect(screen.getByRole('button', { name: en.aiAssistant.fixGrammar })).toBeEnabled();
});

it('hides controls when disabled by configuration', () => {
	process.env.NEXT_PUBLIC_AI_ASSISTANT_ENABLED = 'false';
	render(<AiAssistantControl {...props} />);
	expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

it.each([{ value: '' }, { value: '  ' }, { value: 'a'.repeat(5001) }, { disabled: true }])(
	'disables invalid/noneditable requests: %j',
	(extra) => {
		render(<AiAssistantControl {...props} {...extra} />);
		for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
		expect(mockAssist).not.toHaveBeenCalled();
	},
);

it.each([
	['fix_grammar', fr.aiAssistant.fixGrammar],
	['professionalize', fr.aiAssistant.professionalize],
])('previews %s without saving or applying until asked', async (action, label) => {
	const user = userEvent.setup();
	render(<AiAssistantControl {...props} />);
	await user.click(screen.getByRole('button', { name: label }));
	expect(await screen.findByTestId('suggested-text')).toHaveTextContent(response().suggested_text);
	expect(mockAssist).toHaveBeenCalledWith({ action, text: props.value, context: 'comment', source_language: 'auto' });
	expect(props.onApply).not.toHaveBeenCalled();
	await user.click(screen.getByRole('button', { name: fr.aiAssistant.useSuggestion }));
	expect(props.onApply).toHaveBeenCalledWith(response().suggested_text);
	expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it.each([
	['fr', fr.aiAssistant.translateToFrench],
	['en', fr.aiAssistant.translateToEnglish],
])('chooses %s explicitly before translation', async (lang, label) => {
	const user = userEvent.setup();
	render(<AiAssistantControl {...props} />);
	await user.click(screen.getByRole('button', { name: fr.aiAssistant.translate }));
	expect(mockAssist).not.toHaveBeenCalled();
	await user.click(screen.getByRole('button', { name: label }));
	await screen.findByTestId('suggested-text');
	expect(mockAssist).toHaveBeenCalledWith(expect.objectContaining({ action: 'translate', target_language: lang }));
});

it('cancel, retry and apply never submit the containing form', async () => {
	const submit = jest.fn((e) => e.preventDefault());
	const user = userEvent.setup();
	render(
		<form onSubmit={submit}>
			<AiAssistantControl {...props} />
		</form>,
	);
	await user.click(screen.getByRole('button', { name: fr.aiAssistant.fixGrammar }));
	await screen.findByTestId('suggested-text');
	await user.click(screen.getByRole('button', { name: fr.aiAssistant.tryAgain }));
	await screen.findByTestId('suggested-text');
	await user.click(screen.getByRole('button', { name: fr.common.cancel }));
	expect(props.onApply).not.toHaveBeenCalled();
	expect(submit).not.toHaveBeenCalled();
});

it('rejects stale suggestions and retries with the current field value', async () => {
	const user = userEvent.setup();
	const view = render(<AiAssistantControl {...props} />);
	await user.click(screen.getByRole('button', { name: fr.aiAssistant.fixGrammar }));
	await screen.findByTestId('suggested-text');
	view.rerender(<AiAssistantControl {...props} value="Un autre texte" />);
	expect(screen.getByRole('alert')).toHaveTextContent(fr.aiAssistant.fieldChanged);
	expect(screen.getByRole('button', { name: fr.aiAssistant.useSuggestion })).toBeDisabled();
	await user.click(screen.getByRole('button', { name: fr.aiAssistant.tryAgain }));
	await waitFor(() => expect(mockAssist).toHaveBeenLastCalledWith(expect.objectContaining({ text: 'Un autre texte' })));
});

it('does not apply over-length titles or when editing permission is removed', async () => {
	const user = userEvent.setup();
	success('a'.repeat(256));
	const view = render(<AiAssistantControl {...props} maxLength={255} />);
	await user.click(screen.getByRole('button', { name: fr.aiAssistant.fixGrammar }));
	await screen.findByTestId('suggested-text');
	expect(screen.getByRole('alert')).toHaveTextContent(fr.aiAssistant.suggestionTooLong);
	expect(screen.getByRole('button', { name: fr.aiAssistant.useSuggestion })).toBeDisabled();
	view.rerender(<AiAssistantControl {...props} disabled />);
	expect(screen.getByRole('button', { name: fr.aiAssistant.useSuggestion })).toBeDisabled();
});

it('aborts a pending request and ignores its late response', async () => {
	let resolve!: (value: ReturnType<typeof response>) => void;
	const promise = new Promise<ReturnType<typeof response>>((r) => {
		resolve = r;
	});
	const abort = jest.fn();
	mockAssist.mockReturnValue({ unwrap: () => promise, abort });
	const user = userEvent.setup();
	render(<AiAssistantControl {...props} />);
	await user.click(screen.getByRole('button', { name: fr.aiAssistant.fixGrammar }));
	expect(screen.getByRole('status')).toHaveTextContent(fr.aiAssistant.processing);
	await user.click(screen.getByRole('button', { name: fr.common.cancel }));
	expect(abort).toHaveBeenCalled();
	await act(async () => resolve(response()));
	expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	expect(props.onApply).not.toHaveBeenCalled();
});

it('aborts when the field or chat conversation unmounts', async () => {
	const abort = jest.fn();
	mockAssist.mockReturnValue({ unwrap: () => new Promise(() => {}), abort });
	const user = userEvent.setup();
	const view = render(<AiAssistantControl {...props} />);
	await user.click(screen.getByRole('button', { name: fr.aiAssistant.fixGrammar }));
	view.unmount();
	expect(abort).toHaveBeenCalledTimes(1);
});

it.each([
	[429, fr.aiAssistant.busy],
	[504, fr.aiAssistant.timeout],
	[503, fr.aiAssistant.requestError],
])('shows a translated retryable error for %s', async (status, message) => {
	mockAssist.mockReturnValue({
		unwrap: () => Promise.reject({ status, data: { message: 'private technical error' } }),
		abort: jest.fn(),
	});
	const user = userEvent.setup();
	render(<AiAssistantControl {...props} />);
	await user.click(screen.getByRole('button', { name: fr.aiAssistant.fixGrammar }));
	expect(await screen.findByRole('alert')).toHaveTextContent(message);
	expect(screen.queryByText('private technical error')).not.toBeInTheDocument();
	expect(screen.getByRole('button', { name: fr.aiAssistant.tryAgain })).toBeEnabled();
});

it.each([
	[fr.aiAssistant.fixGrammar, fr.aiAssistant.alreadyCorrect],
	[fr.aiAssistant.professionalize, fr.aiAssistant.alreadyProfessional],
])('uses a notification for unchanged text: %s', async (action, notification) => {
	success(` ${props.value}  `);
	const user = userEvent.setup();
	render(<AiAssistantControl {...props} />);
	await user.click(screen.getByRole('button', { name: action }));
	await waitFor(() => expect(mockSuccess).toHaveBeenCalledWith(notification));
	expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('renders returned markup as plain text', async () => {
	success('<strong>Untrusted suggestion</strong>');
	const user = userEvent.setup();
	render(<AiAssistantControl {...props} />);
	await user.click(screen.getByRole('button', { name: fr.aiAssistant.fixGrammar }));
	const suggestion = await screen.findByTestId('suggested-text');
	expect(suggestion.textContent).toBe('<strong>Untrusted suggestion</strong>');
	expect(suggestion.querySelector('strong')).toBeNull();
});

it('applies to the draft but does not change an unrelated field', async () => {
	const Form = () => {
		const [value, setValue] = useState(props.value);
		return (
			<>
				<input aria-label="Text" value={value} onChange={(e) => setValue(e.target.value)} />
				<input aria-label="Count" defaultValue="8" type="number" />
				<AiAssistantControl {...props} value={value} onApply={setValue} />
			</>
		);
	};
	const user = userEvent.setup();
	render(<Form />);
	await user.click(screen.getByRole('button', { name: fr.aiAssistant.fixGrammar }));
	await screen.findByTestId('suggested-text');
	await user.click(screen.getByRole('button', { name: fr.aiAssistant.useSuggestion }));
	expect(screen.getByLabelText('Text')).toHaveValue(response().suggested_text);
	expect(screen.getByLabelText('Count')).toHaveValue(8);
});

it('locks requests synchronously against double clicks', async () => {
	mockAssist.mockReturnValue({ unwrap: () => new Promise(() => {}), abort: jest.fn() });
	render(<AiAssistantControl {...props} />);
	const button = screen.getByRole('button', { name: fr.aiAssistant.fixGrammar });
	fireEvent.click(button);
	fireEvent.click(button);
	expect(mockAssist).toHaveBeenCalledTimes(1);
	expect(within(screen.getByRole('dialog')).getByRole('button', { name: fr.aiAssistant.useSuggestion })).toBeDisabled();
});
