import { fireEvent, render, screen } from '@testing-library/react';
import SquareImageInputFile from './squareImageInputFile';

it('opens the image chooser without submitting the surrounding form', () => {
	const onImageUpload = jest.fn();
	render(<SquareImageInputFile onImageUpload={onImageUpload} />);
	expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
	fireEvent.click(screen.getByRole('button'));
	expect(onImageUpload).toHaveBeenCalledTimes(1);
});
