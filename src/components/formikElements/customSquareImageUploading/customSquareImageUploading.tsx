'use client';

import React, { useRef, useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import SquareImageInputFile from '../../htmlElements/buttons/squareImageInputFile/squareImageInputFile';
import { useLanguage } from '@/utils/hooks';

type Props = {
	image: string | ArrayBuffer | null;
	croppedImage?: string | ArrayBuffer | null;
	onChange: (image: string | ArrayBuffer | null) => void;
	onCrop: (data: string | null) => void;
	cssClasse?: string;
};

const resolveMediaUrl = (value: string) => {
	if (value.startsWith('data:') || value.startsWith('blob:') || /^https?:\/\//.test(value)) return value;
	const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
	return `${apiUrl}${value.startsWith('/') ? value : `/${value}`}`;
};

const CustomSquareImageUploading: React.FC<Props> = ({ image, croppedImage, onChange, onCrop, cssClasse }) => {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const { t } = useLanguage();
	const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			const result = typeof reader.result === 'string' ? reader.result : null;
			onChange(result);
			onCrop(result);
		};
		reader.readAsDataURL(file);
	};

	const clearImage = () => {
		onChange(null);
		onCrop(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	};

	const currentImage = (croppedImage || image) as string | null;
	const previewSrc = currentImage ? resolveMediaUrl(currentImage) : null;
	const canRenderPreview = previewSrc && failedImageSrc !== previewSrc;

	return (
		<div className={cssClasse ?? ''}>
			<input
				ref={fileInputRef}
				type="file"
				accept="image/jpeg,image/png"
				onChange={handleFileChange}
				className="hidden"
			/>
			{canRenderPreview ? (
				<div className="relative w-full max-w-[380px]">
					<button type="button" onClick={() => fileInputRef.current?.click()} className="relative block h-[260px] w-full overflow-hidden rounded-[18px] border border-[color:var(--line-strong)] bg-white shadow-(--shadow-sm) transition hover:-translate-y-0.5 hover:shadow-(--shadow-md)">
						<Image
							src={previewSrc}
							alt={t.common.croppedPreview}
							fill
							sizes="380px"
							className="object-cover"
							unoptimized
							onError={() => setFailedImageSrc(previewSrc)}
						/>
						<span className="absolute inset-x-4 bottom-4 rounded-full bg-white/90 px-4 py-2 text-center text-xs font-semibold text-(--ink) backdrop-blur">
							{t.common.clickToEditCrop}
						</span>
					</button>
					<button
						type="button"
						onClick={clearImage}
						className="absolute right-3 top-3 rounded-full border border-[color:var(--line)] bg-white p-2 text-(--ink) shadow-(--shadow-sm)"
						aria-label={t.common.delete}
					>
						<X size={18} />
					</button>
				</div>
			) : (
				<SquareImageInputFile onImageUpload={() => fileInputRef.current?.click()} />
			)}
		</div>
	);
};

export default CustomSquareImageUploading;
