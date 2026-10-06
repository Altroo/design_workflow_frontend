import type { input, ZodType } from 'zod';

declare module 'zod-formik-adapter' {
	export function toFormikValidationSchema<S extends ZodType>(
		schema: S,
	): { validate: (values: input<S>) => Promise<void> };
}
