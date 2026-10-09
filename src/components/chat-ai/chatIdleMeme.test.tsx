import { fireEvent, render, screen } from '@testing-library/react';
import { fr } from '@/translations/fr';
import { en } from '@/translations/en';
import { ChatIdleMeme } from './chatIdleMeme';

jest.mock('@/utils/hooks', () => ({ useLanguage: () => ({ t: fr }) }));

it.each([0, 1] as const)('requests audible autoplay without looping for video %i', (index) => {
	const dismiss = jest.fn();
	render(<ChatIdleMeme index={index} onDismissAction={dismiss} />);
	const player = screen.getByTitle(fr.chatAi.memeVideo);
	const url = new URL(player.getAttribute('src')!);
	expect(url.hostname).toBe('www.youtube-nocookie.com');
	expect(url.pathname).toBe(`/embed/${index === 0 ? 'TBgFtfw3_ZE' : 'MXuq7B_OYKw'}`);
	expect(url.searchParams.get('autoplay')).toBe('1');
	expect(url.searchParams.get('mute')).toBe('0');
	expect(url.searchParams.get('loop')).toBe('0');
	expect(player.getAttribute('allow')).toContain('autoplay');
	expect(player).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
	expect(screen.getByRole('link', { name: fr.chatAi.openMeme })).toHaveAttribute('rel', 'noopener noreferrer');
	fireEvent.click(screen.getByRole('button', { name: fr.chatAi.dismissMeme }));
	expect(dismiss).toHaveBeenCalledTimes(1);
});

it('uses the exact requested disable button text in both interface languages', () => {
	expect(fr.chatAi.disableMemes).toBe('disable memes');
	expect(en.chatAi.disableMemes).toBe('disable memes');
});
