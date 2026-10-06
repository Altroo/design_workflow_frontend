import { StrictMode } from 'react';
import { render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import Portal from './portal';

afterEach(() => {
	document.getElementById('portal-test')?.remove();
	document.getElementById('portal-next')?.remove();
});

it('renders its initial children without waiting for an unrelated update', () => {
	const { unmount } = render(
		<StrictMode>
			<Portal id="portal-test">Portal content</Portal>
		</StrictMode>,
	);
	expect(screen.getByText('Portal content')).toBeInTheDocument();
	expect(document.querySelectorAll('#portal-test')).toHaveLength(1);
	unmount();
	expect(document.getElementById('portal-test')).toBeNull();
});

it('moves to a new target and preserves a container owned by its caller', () => {
	const existing = document.createElement('div');
	existing.id = 'portal-test';
	document.body.appendChild(existing);
	const { rerender, unmount } = render(<Portal id="portal-test">Portal content</Portal>);
	expect(existing).toHaveTextContent('Portal content');
	rerender(<Portal id="portal-next">Portal content</Portal>);
	expect(existing).toBeEmptyDOMElement();
	expect(document.getElementById('portal-next')).toHaveTextContent('Portal content');
	unmount();
	expect(existing).toBeInTheDocument();
	expect(document.getElementById('portal-next')).toBeNull();
});

it('does not create DOM nodes while rendering server HTML', () => {
	expect(renderToString(<Portal id="portal-test">Portal content</Portal>)).not.toContain('Portal content');
	expect(document.getElementById('portal-test')).toBeNull();
});
