import {
	CustomTheme,
	codeTextInputTheme,
	customDropdownTheme,
	getDefaultTheme,
	navigationBarTheme,
	textInputTheme,
} from './themes';

describe('theme helpers', () => {
	it('returns named theme descriptors', () => {
		expect(getDefaultTheme()).toEqual({ name: 'default', primaryColor: undefined });
		expect(navigationBarTheme()).toEqual({ name: 'navigation', primaryColor: undefined });
		expect(textInputTheme()).toEqual({ name: 'text-input', primaryColor: undefined });
		expect(customDropdownTheme()).toEqual({ name: 'dropdown', primaryColor: undefined });
	});

	it('preserves optional primary colors', () => {
		expect(CustomTheme('#3a86ff')).toEqual({ name: 'custom', primaryColor: '#3a86ff' });
		expect(getDefaultTheme('#0274D7')).toEqual({ name: 'default', primaryColor: '#0274D7' });
	});

	it('preserves optional error state for code inputs', () => {
		expect(codeTextInputTheme(true)).toEqual({ name: 'code-input', error: true });
		expect(codeTextInputTheme(false)).toEqual({ name: 'code-input', error: false });
	});
});
