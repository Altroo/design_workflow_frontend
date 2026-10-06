import { en } from '@/translations/en';
import { fr } from '@/translations/fr';
import { getT } from './helpers';
import {
	INPUT_REQUIRED,
	SHORT_INPUT_REQUIRED,
	INPUT_MIN,
	INPUT_MAX,
	MINI_INPUT_EMAIL,
	INPUT_PASSWORD_MIN,
} from './formValidationErrorMessages';

jest.mock('./helpers', () => ({ getT: jest.fn() }));

it('resolves every validation message in the current language at call time', () => {
	for (const translation of [en, fr, en]) {
		jest.mocked(getT).mockReturnValue(translation);
		expect(INPUT_REQUIRED()).toBe(translation.validation.required);
		expect(SHORT_INPUT_REQUIRED()).toBe(translation.validation.shortRequired);
		expect(MINI_INPUT_EMAIL()).toBe(translation.validation.emailInvalid);
		expect(INPUT_MIN(2)).toBe(translation.validation.minLength(2));
		expect(INPUT_MAX(100)).toBe(translation.validation.maxLength(100));
		expect(INPUT_PASSWORD_MIN(8)).toBe(translation.validation.passwordMinLength(8));
	}
});
