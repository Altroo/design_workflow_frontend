import { render, screen } from '@testing-library/react';
import DarkTooltip from './darkTooltip';
import '@testing-library/jest-dom';
import React from 'react';

describe('DarkTooltip', () => {
	it('renders tooltip text as a native title', () => {
		render(
			<DarkTooltip title="Tooltip text">
				<button aria-label="Tooltip trigger">Hover me</button>
			</DarkTooltip>,
		);

		const trigger = screen.getByRole('button', { name: 'Tooltip trigger' });

		expect(trigger.closest('span')).toHaveAttribute('title', 'Tooltip text');
	});
});
