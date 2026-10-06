import { render, screen } from '@testing-library/react';
import { UploadProgress } from './uploadProgress';

it('distinguishes idle, upload and server-save stages accessibly', () => {
	const { rerender } = render(<UploadProgress progress={null} />);
	expect(screen.queryByRole('status')).not.toBeInTheDocument();
	rerender(<UploadProgress progress={42} />);
	expect(screen.getByRole('progressbar')).toHaveAttribute('value', '42');
	expect(screen.getByRole('status')).toHaveTextContent('42 %');
	rerender(<UploadProgress progress={100} />);
	expect(screen.getByRole('status')).toHaveTextContent('Enregistrement du fichier');
});
