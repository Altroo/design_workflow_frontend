import { render } from '@testing-library/react';
import StoreProvider from './storeProvider';

const mockDispatch = jest.fn();
const mockStore = { dispatch: mockDispatch, getState: () => ({}), subscribe: () => () => {} };
jest.mock('@/store/store', () => ({ makeStore: () => mockStore }));

test('focus and network events target the actual provider store and unsubscribe on unmount', () => {
	const { unmount } = render(<StoreProvider><span>App</span></StoreProvider>);
	window.dispatchEvent(new Event('online'));
	expect(mockDispatch).toHaveBeenCalledWith({ type: '__rtkq/online' });
	window.dispatchEvent(new Event('focus'));
	expect(mockDispatch).toHaveBeenCalledWith({ type: '__rtkq/focused' });
	unmount();
	mockDispatch.mockClear();
	window.dispatchEvent(new Event('online'));
	expect(mockDispatch).not.toHaveBeenCalled();
});
