'use client';

import { useLanguage } from '@/utils/hooks';
import type { ChatCapabilities } from '@/types/chatAiTypes';
import styles from './chatAssistant.module.css';

export const ChatShortcuts = ({
	listId,
	shortcuts,
	activeIndex,
	disabled,
	onChooseAction,
	onHighlightAction,
}: {
	listId: string;
	shortcuts: ChatCapabilities['shortcuts'];
	activeIndex: number;
	disabled: boolean;
	onChooseAction: (command: string) => void;
	onHighlightAction: (index: number) => void;
}) => {
	const { t } = useLanguage();
	const copy = t.chatAi;
	return (
		<section className={styles.shortcuts} aria-label={copy.shortcuts}>
			<h3>{copy.shortcuts}</h3>
			<p>{copy.shortcutsDescription}</p>
			<div id={listId} role="listbox" aria-label={copy.shortcuts} className={styles.shortcutList}>
				{shortcuts.map((shortcut, index) => (
					<button
						type="button"
						role="option"
						id={`${listId}-${index}`}
						key={shortcut.command}
						aria-selected={index === activeIndex}
						disabled={disabled}
						onPointerMove={() => onHighlightAction(index)}
						onClick={() => onChooseAction(shortcut.command)}
						ref={(node) => {
							if (node && index === activeIndex) node.scrollIntoView?.({ block: 'nearest' });
						}}
					>
						<strong>
							<code>{shortcut.command}</code> {shortcut.title}
						</strong>
						{shortcut.help && <span>{shortcut.help}</span>}
						<small>
							{copy.shortcutExample} {shortcut.example}
						</small>
					</button>
				))}
			</div>
			{!shortcuts.length && <p role="status">{copy.noMatchingShortcut}</p>}
		</section>
	);
};
