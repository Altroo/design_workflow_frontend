import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ApiProgress from './apiProgress';

test('renders Backdrop and CircularProgress with the supplied colors', () => {
	const backdropColor = '#123456';
	const circularColor = '#abcdef';

	const { container } = render(<ApiProgress backdropColor={backdropColor} circularColor={circularColor} />);

	const backdrop = container.querySelector('.api-progress-overlay');
	expect(backdrop).toBeInTheDocument();
	expect(backdrop).toHaveStyle(`background-color: ${backdropColor}`);

	const circular = screen.getByTestId('api-loader');
	expect(circular).toBeInTheDocument();
	expect(circular).toHaveStyle(`border-top-color: ${circularColor}`);
});
