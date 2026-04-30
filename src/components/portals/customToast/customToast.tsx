import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import type { ToastType } from '@/contexts/toastContext';

type Props = {
	type: ToastType;
	show: boolean;
	setShow: React.Dispatch<React.SetStateAction<boolean>>;
	message: string;
	children?: React.ReactNode;
};

const toneMap = {
	success: {
		icon: <CheckCircle2 className="h-5 w-5" />,
		accent: 'border-l-emerald-400',
	},
	error: {
		icon: <AlertCircle className="h-5 w-5" />,
		accent: 'border-l-red-400',
	},
	info: {
		icon: <Info className="h-5 w-5" />,
		accent: 'border-l-[var(--accent)]',
	},
	warning: {
		icon: <TriangleAlert className="h-5 w-5" />,
		accent: 'border-l-amber-400',
	},
} satisfies Record<ToastType, { icon: React.ReactNode; accent: string }>;

const CustomToast: React.FC<Props> = ({ type, show, setShow, message }) => {
	useEffect(() => {
		if (!show) {
			return undefined;
		}

		const timeout = window.setTimeout(() => {
			setShow(false);
		}, 6000);

		return () => window.clearTimeout(timeout);
	}, [setShow, show]);

	if (!show) {
		return null;
	}

	const tone = toneMap[type];

	return (
		<div className="pointer-events-none fixed bottom-4 left-4 z-[120]">
			<div
				role="alert"
				className={[
					'ui-toast pointer-events-auto flex min-w-[280px] max-w-[420px] items-start gap-3 rounded-2xl border border-[color:var(--line-strong)] bg-white p-4 shadow-(--shadow-lg)',
					'border-l-4',
					tone.accent,
				].join(' ')}
			>
				<div className="mt-0.5 text-(--ink)">{tone.icon}</div>
				<p className="flex-1 text-sm font-medium text-(--ink)">{message}</p>
				<button
					type="button"
					aria-label="Close"
					onClick={() => setShow(false)}
					className="rounded-full p-1 text-(--ink-soft) transition hover:bg-(--surface-muted) hover:text-(--ink)"
				>
					<X className="h-4 w-4" />
				</button>
			</div>
		</div>
	);
};

export default CustomToast;
