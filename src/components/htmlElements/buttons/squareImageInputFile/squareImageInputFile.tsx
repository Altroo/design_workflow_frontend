'use client';

import React from 'react';
import { ImagePlus, UploadCloud } from 'lucide-react';
import { useLanguage } from '@/utils/hooks';

type Props = {
	onImageUpload: () => void;
	children?: React.ReactNode;
};

const SquareImageInputFile: React.FC<Props> = ({ onImageUpload }) => {
	const { t } = useLanguage();
	return (
		<button
			type="button"
			onClick={onImageUpload}
			className="group relative flex h-[260px] w-full max-w-[380px] overflow-hidden rounded-lg border border-dashed border-[color:var(--line-strong)] bg-white text-(--ink) shadow-(--shadow-sm) transition hover:-translate-y-0.5 hover:shadow-(--shadow-md)"
		>
			<span className="absolute inset-x-5 top-5 h-16 rounded-lg border border-[color:var(--line)] bg-[linear-gradient(135deg,rgba(63,60,255,0.10),rgba(20,184,200,0.12))]" />
			<span className="absolute left-1/2 top-12 grid h-20 w-20 -translate-x-1/2 place-items-center rounded-lg border border-[color:var(--line)] bg-white shadow-(--shadow-sm) transition group-hover:scale-105">
				<ImagePlus size={30} />
			</span>
			<span className="flex h-full w-full flex-col items-center justify-end gap-3 px-7 pb-8 text-center">
				<span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-(--surface-muted) px-4 py-2 text-sm font-semibold">
					<UploadCloud size={16} />
					{t.common.addImage}
				</span>
				<span className="text-xs leading-5 text-(--ink-soft)">{t.common.imageUploadHint}</span>
			</span>
		</button>
	);
};

export default SquareImageInputFile;
