export type Theme = {
	name: string;
	primaryColor?: string;
	error?: boolean;
};

const makeTheme = (name: string, extra: Partial<Theme> = {}): Theme => ({
	name,
	...extra,
});

export const CustomTheme = (primaryColor?: string) => makeTheme('custom', { primaryColor });
export const getDefaultTheme = (primaryColor?: string) => makeTheme('default', { primaryColor });
export const textInputTheme = (primaryColor?: string) => makeTheme('text-input', { primaryColor });
export const navigationBarTheme = (primaryColor?: string) => makeTheme('navigation', { primaryColor });
export const customDropdownTheme = (primaryColor?: string) => makeTheme('dropdown', { primaryColor });
export const codeTextInputTheme = (error?: boolean) => makeTheme('code-input', { error });
export const chipSelectFilterTheme = (primaryColor?: string) => makeTheme('chip-filter', { primaryColor });
export const customToastTheme = (primaryColor?: string) => makeTheme('toast', { primaryColor });
export const gridInputTheme = (primaryColor?: string) => makeTheme('grid-input', { primaryColor });
export const customGridDropdownTheme = (primaryColor?: string) => makeTheme('grid-dropdown', { primaryColor });
