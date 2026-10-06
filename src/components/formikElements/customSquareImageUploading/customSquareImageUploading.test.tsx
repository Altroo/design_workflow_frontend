import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CustomSquareImageUploading from './customSquareImageUploading';

it('loads the selected image and clears both original and crop', async () => {
	const onChange = jest.fn(),
		onCrop = jest.fn();
	const { container, rerender } = render(
		<CustomSquareImageUploading image={null} onChange={onChange} onCrop={onCrop} />,
	);
	fireEvent.change(container.querySelector('input[type=file]')!, {
		target: { files: [new File(['image'], 'image.png', { type: 'image/png' })] },
	});
	await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.stringMatching(/^data:image\/png;base64,/)));
	expect(onCrop).toHaveBeenCalledWith(onChange.mock.calls[0][0]);
	rerender(<CustomSquareImageUploading image="data:image/png;base64,aW1hZ2U=" onChange={onChange} onCrop={onCrop} />);
	fireEvent.click(screen.getAllByRole('button').at(-1)!);
	expect(onChange).toHaveBeenLastCalledWith(null);
	expect(onCrop).toHaveBeenLastCalledWith(null);
});

it('falls back to an upload control when the preview fails', () => {
	render(<CustomSquareImageUploading image="/missing.png" onChange={jest.fn()} onCrop={jest.fn()} />);
	fireEvent.error(screen.getByRole('img'));
	expect(screen.queryByRole('img')).not.toBeInTheDocument();
	expect(screen.getByRole('button')).toBeInTheDocument();
});
