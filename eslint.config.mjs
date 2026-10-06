import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';
import { version as reactVersion } from 'react';

const eslintConfig = defineConfig([
	...nextVitals,
	...nextTs,
	prettier,
	{},
	globalIgnores([
		'.next/**',
		'out/**',
		'build/**',
		'next-env.d.ts',
		'.next/types/**',
		'node_modules/*',
		'.swc/*',
		'coverage',
	]),
	{
		settings: {
			react: {
				version: reactVersion,
			},
		},
	},
]);

export default eslintConfig;
