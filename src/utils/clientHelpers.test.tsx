import { act, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { Desktop, TabletAndMobile } from './clientHelpers';

const resize = (width: number) =>
	act(() => {
		window.innerWidth = width;
		window.dispatchEvent(new Event('resize'));
	});

it('switches content at the exact desktop breakpoint', () => {
	window.innerWidth = 991;
	const { unmount } = render(
		<>
			<Desktop>Desktop content</Desktop>
			<TabletAndMobile>Mobile content</TabletAndMobile>
		</>,
	);
	expect(screen.queryByText('Desktop content')).not.toBeInTheDocument();
	expect(screen.getByText('Mobile content')).toBeInTheDocument();
	resize(992);
	expect(screen.getByText('Desktop content')).toBeInTheDocument();
	expect(screen.queryByText('Mobile content')).not.toBeInTheDocument();
	const remove = jest.spyOn(window, 'removeEventListener');
	unmount();
	expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
	remove.mockRestore();
});

it('hydrates both viewport branches without mismatched HTML', async () => {
	window.innerWidth = 390;
	const content = (
		<>
			<Desktop>Desktop content</Desktop>
			<TabletAndMobile>Mobile content</TabletAndMobile>
		</>
	);
	const container = document.createElement('div');
	container.innerHTML = renderToString(content);
	expect(container).toBeEmptyDOMElement();
	document.body.appendChild(container);
	const onRecoverableError = jest.fn();
	let root: ReturnType<typeof hydrateRoot>;
	await act(async () => {
		root = hydrateRoot(container, content, { onRecoverableError });
	});
	expect(container).toHaveTextContent('Mobile content');
	expect(onRecoverableError).not.toHaveBeenCalled();
	act(() => root.unmount());
	container.remove();
});

it('keeps the subscription stable on rerenders and cleans up in Strict Mode', () => {
	const add = jest.spyOn(window, 'addEventListener');
	const remove = jest.spyOn(window, 'removeEventListener');
	const { rerender, unmount } = render(
		<StrictMode>
			<Desktop>First</Desktop>
		</StrictMode>,
	);
	const subscriptions = () => add.mock.calls.filter(([event]) => event === 'resize');
	const initialCount = subscriptions().length;
	rerender(
		<StrictMode>
			<Desktop>Second</Desktop>
		</StrictMode>,
	);
	expect(subscriptions()).toHaveLength(initialCount);
	unmount();
	expect(remove.mock.calls.filter(([event]) => event === 'resize')).toHaveLength(initialCount);
	add.mockRestore();
	remove.mockRestore();
});
