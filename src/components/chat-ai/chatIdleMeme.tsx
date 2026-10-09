'use client';

import { Bot, ExternalLink, X } from 'lucide-react';
import { useLanguage } from '@/utils/hooks';
import { IDLE_MEME_VIDEOS } from '@/utils/chat-ai/idleMeme';
import styles from './chatAssistant.module.css';

export const ChatIdleMeme = ({ index, onDismissAction }: { index: 0 | 1; onDismissAction: () => void }) => {
	const { t } = useLanguage();
	const copy = t.chatAi;
	const videoId = IDLE_MEME_VIDEOS[index];
	return (
		<article className={styles.assistantMessage}>
			<div className={styles.memeHeading}>
				<span className={styles.messageAuthor}>
					<Bot size={17} aria-hidden="true" />
					<span className="sr-only">{copy.title}</span>
				</span>
				<button type="button" className={styles.iconButton} aria-label={copy.dismissMeme} onClick={onDismissAction}>
					<X size={16} />
				</button>
			</div>
			<p className={styles.messageText}>Wa lkhdma lkhdma 😄</p>
			<iframe
				className={styles.memeVideo}
				title={copy.memeVideo}
				src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=0&controls=1&playsinline=1&loop=0&rel=0`}
				allow="autoplay; encrypted-media; picture-in-picture"
				referrerPolicy="strict-origin-when-cross-origin"
				allowFullScreen
			/>
			<p className={styles.hint}>{copy.memePlaybackHint}</p>
			<a
				className={styles.memeLink}
				href={`https://www.youtube.com/watch?v=${videoId}`}
				target="_blank"
				rel="noopener noreferrer"
			>
				<ExternalLink size={14} aria-hidden="true" />
				{copy.openMeme}
			</a>
		</article>
	);
};
