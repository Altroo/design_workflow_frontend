'use client';

import { useEffect, useRef } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import ApiProgress from '@/components/formikElements/apiLoading/apiProgress/apiProgress';
import { DASHBOARD, AUTH_LOGIN } from '@/utils/routes';

const SSOCallback = () => {
	const router = useRouter();
	const code = useSearchParams().get('code');
	const exchange = useRef<{ code: string; request: ReturnType<typeof signIn> } | null>(null);

	useEffect(() => {
		let active = true;
		if (!code) {
			router.replace(`${AUTH_LOGIN}?error=SSOCodeMissing`);
			return;
		}
		// A code is single-use: Strict Mode's effect replay must share the request.
		if (exchange.current?.code !== code)
			exchange.current = { code, request: signIn('sso-code', { code, redirect: false }) };
		void exchange.current.request
			.then((result) => {
				if (active) router.replace(result?.error ? `${AUTH_LOGIN}?error=SSOFailed` : DASHBOARD);
			})
			.catch(() => {
				if (active) router.replace(`${AUTH_LOGIN}?error=SSOFailed`);
			});
		return () => {
			active = false;
		};
	}, [code, router]);

	return <ApiProgress backdropColor="var(--surface)" circularColor="var(--accent)" />;
};

export default SSOCallback;
