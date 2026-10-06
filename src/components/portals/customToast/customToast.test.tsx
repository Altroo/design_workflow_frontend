import { act, fireEvent, render, screen } from '@testing-library/react';
import CustomToast from './customToast';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('dismisses after six seconds and clears its timer on unmount', () => {
	const setShow = jest.fn();
	const { unmount } = render(<CustomToast type="success" show setShow={setShow} message="Saved" />);
	act(() => {
		jest.advanceTimersByTime(5999);
	});
	expect(setShow).not.toHaveBeenCalled();
	act(() => {
		jest.advanceTimersByTime(1);
	});
	expect(setShow).toHaveBeenCalledWith(false);
	unmount();
	expect(jest.getTimerCount()).toBe(0);
});

it('supports manual dismissal and hides when closed', () => {
	const setShow = jest.fn();
	const { rerender } = render(<CustomToast type="error" show setShow={setShow} message="Failed" />);
	fireEvent.click(screen.getByRole('button'));
	expect(setShow).toHaveBeenCalledWith(false);
	rerender(<CustomToast type="error" show={false} setShow={setShow} message="Failed" />);
	expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
