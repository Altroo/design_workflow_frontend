'use client';

import { useEffect, useRef, useState } from 'react';
import { Languages, LoaderCircle, SpellCheck, BriefcaseBusiness, Sparkles } from 'lucide-react';
import { useAssistTextMutation } from '@/store/services/aiAssistant';
import { useLanguage, useToast } from '@/utils/hooks';
import type { AiAssistAction, AiAssistRequest, AiAssistResponse, AiAssistantControlProps } from '@/types/aiTypes';
import AiAssistantDialog from './aiAssistantDialog';

const normalize = (text: string) => text.normalize('NFC').replace(/\s+/g, ' ').trim();

const EnabledAiAssistantControl = ({
	value,
	onApply,
	context,
	disabled = false,
	maxLength,
}: AiAssistantControlProps) => {
	const { t } = useLanguage();
	const { onSuccess } = useToast();
	const copy = t.aiAssistant;
	const [assistText] = useAssistTextMutation();
	const pending = useRef<ReturnType<typeof assistText> | null>(null);
	const [loading, setLoading] = useState(false);
	const [open, setOpen] = useState(false);
	const [translateOpen, setTranslateOpen] = useState(false);
	const [result, setResult] = useState<AiAssistResponse | null>(null);
	const [lastRequest, setLastRequest] = useState<AiAssistRequest | null>(null);
	const [error, setError] = useState('');
	useEffect(
		() => () => {
			pending.current?.abort();
			pending.current = null;
		},
		[],
	);

	const close = () => {
		pending.current?.abort();
		pending.current = null;
		setLoading(false);
		setOpen(false);
		setResult(null);
		setError('');
	};

	const run = async (action: AiAssistAction, target_language?: 'fr' | 'en') => {
		if (pending.current || disabled || !value.trim() || value.length > 5000) return;
		const request: AiAssistRequest = {
			action,
			text: value,
			source_language: 'auto',
			context,
			...(target_language ? { target_language } : {}),
		};
		setTranslateOpen(false);
		setLastRequest(request);
		setResult(null);
		setError('');
		setOpen(true);
		setLoading(true);
		const operation = assistText(request);
		pending.current = operation;
		try {
			const response = await operation.unwrap();
			if (pending.current !== operation) return;
			if (typeof response.suggested_text !== 'string' || !response.suggested_text.trim()) {
				setError(copy.requestError);
				return;
			}
			if (normalize(request.text) === normalize(response.suggested_text) && action !== 'translate') {
				setOpen(false);
				onSuccess(action === 'fix_grammar' ? copy.alreadyCorrect : copy.alreadyProfessional);
			} else {
				setResult({ original_text: request.text, suggested_text: response.suggested_text });
			}
		} catch (requestError) {
			if (pending.current !== operation) return;
			const status =
				typeof requestError === 'object' && requestError && 'status' in requestError ? requestError.status : 0;
			setError(status === 429 ? copy.busy : status === 504 ? copy.timeout : copy.requestError);
		} finally {
			if (pending.current === operation) {
				pending.current = null;
				setLoading(false);
			}
		}
	};

	const controlsDisabled = disabled || loading || !value.trim() || value.length > 5000;
	const stale = !!result && value !== result.original_text;
	const tooLong = !!result && maxLength !== undefined && result.suggested_text.length > maxLength;
	return (
		<div className="workflow-ai-control">
			<div className="workflow-ai-actions" role="group" aria-label={copy.previewTitle}>
				<button type="button" disabled={controlsDisabled} onClick={() => setTranslateOpen(true)}>
					<Languages size={15} />
					{copy.translate}
				</button>
				<button type="button" disabled={controlsDisabled} onClick={() => void run('fix_grammar')}>
					<SpellCheck size={15} />
					{copy.fixGrammar}
				</button>
				<button type="button" disabled={controlsDisabled} onClick={() => void run('professionalize')}>
					<BriefcaseBusiness size={15} />
					{copy.professionalize}
				</button>
			</div>
			{value.length > 5000 && <p className="workflow-ai-hint">{copy.textTooLong}</p>}
			{translateOpen && (
				<AiAssistantDialog
					title={copy.translate}
					body={copy.chooseLanguage}
					titleIcon={<Languages size={20} />}
					onClose={() => setTranslateOpen(false)}
					actions={[
						{ active: false, text: t.common.cancel, onClick: () => setTranslateOpen(false) },
						{
							active: true,
							text: copy.translateToFrench,
							onClick: () => void run('translate', 'fr'),
							disabled: controlsDisabled,
						},
						{
							active: true,
							text: copy.translateToEnglish,
							onClick: () => void run('translate', 'en'),
							disabled: controlsDisabled,
						},
					]}
				/>
			)}
			{open && (
				<AiAssistantDialog
					title={copy.previewTitle}
					titleIcon={<Sparkles size={20} />}
					onClose={close}
					actions={[
						{ active: false, text: t.common.cancel, onClick: close },
						{
							active: false,
							text: copy.tryAgain,
							disabled: loading || disabled || !value.trim() || value.length > 5000,
							onClick: () => {
								if (lastRequest) void run(lastRequest.action, lastRequest.target_language);
							},
						},
						{
							active: true,
							text: copy.useSuggestion,
							disabled: !result || loading || disabled || stale || tooLong,
							onClick: () => {
								if (result && !loading && !disabled && !stale && !tooLong) {
									onApply(result.suggested_text);
									close();
								}
							},
						},
					]}
				>
					{loading && (
						<p className="workflow-ai-loading" role="status">
							<LoaderCircle size={18} className="animate-spin motion-reduce:animate-none" />
							{copy.processing}
						</p>
					)}
					{result && (
						<div className="workflow-ai-comparison">
							<section>
								<h3>{copy.original}</h3>
								<p data-testid="original-text">{result.original_text}</p>
							</section>
							<section>
								<h3>{copy.suggestion}</h3>
								<p data-testid="suggested-text">{result.suggested_text}</p>
							</section>
						</div>
					)}
					{error && (
						<p role="alert" className="workflow-ai-error">
							{error}
						</p>
					)}
					{stale && (
						<p role="alert" className="workflow-ai-hint">
							{copy.fieldChanged}
						</p>
					)}
					{tooLong && (
						<p role="alert" className="workflow-ai-hint">
							{copy.suggestionTooLong}
						</p>
					)}
					{result && <p className="workflow-ai-hint">{copy.applyHint}</p>}
				</AiAssistantDialog>
			)}
		</div>
	);
};

const AiAssistantControl = (props: AiAssistantControlProps) =>
	process.env.NEXT_PUBLIC_AI_ASSISTANT_ENABLED === 'true' ? <EnabledAiAssistantControl {...props} /> : null;
export default AiAssistantControl;
