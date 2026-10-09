'use client';
import { useId, useRef, useState, type ReactNode } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Check, ChevronDown, Search } from 'lucide-react';
import { useLanguage } from '@/utils/hooks';
import styles from './workflowSearchSelect.module.css';

const normalize = (value: string) =>
	value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLocaleLowerCase();

export const WorkflowSearchSelect = ({
	id,
	value,
	onChangeAction,
	options,
	ariaLabel,
	disabled = false,
	startIcon,
}: {
	id?: string;
	value: string;
	onChangeAction: (value: string) => void;
	options: Array<{ value: string | number; label: string }>;
	ariaLabel?: string;
	disabled?: boolean;
	startIcon?: ReactNode;
}) => {
	const { t } = useLanguage();
	const listId = useId();
	const input = useRef<HTMLInputElement>(null);
	const anchor = useRef<HTMLDivElement>(null);
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [activeIndex, setActiveIndex] = useState(0);
	const selected = options.find((option) => String(option.value) === value);
	const placeholder = options.find((option) => option.value === '')?.label ?? t.common.selectValue;
	const filtered = options.filter(
		(option) => option.value !== '' && normalize(option.label).includes(normalize(query)),
	);
	const active = Math.min(activeIndex, Math.max(0, filtered.length - 1));
	const changeOpen = (next: boolean) => {
		setOpen(next);
		setQuery('');
		setActiveIndex(0);
	};
	const choose = (next: string | number) => {
		onChangeAction(String(next));
		changeOpen(false);
		input.current?.focus();
	};
	return (
		<Popover.Root open={open && !disabled} onOpenChange={changeOpen}>
			<Popover.Anchor asChild>
				<div ref={anchor} className={styles.anchor}>
					<span className={styles.leading}>{startIcon ?? <Search size={17} />}</span>
					<input
						ref={input}
						id={id}
						role="combobox"
						aria-label={ariaLabel}
						aria-autocomplete="list"
						aria-expanded={open && !disabled}
						aria-controls={listId}
						aria-activedescendant={open && filtered.length ? `${listId}-${active}` : undefined}
						disabled={disabled}
						autoComplete="off"
						className={`app-input ${styles.input}`}
						value={open ? query : selected?.value ? selected.label : ''}
						placeholder={open ? t.common.search : placeholder}
						onClick={() => {
							if (!open) changeOpen(true);
						}}
						onChange={(event) => {
							setQuery(event.target.value);
							setActiveIndex(0);
							setOpen(true);
						}}
						onKeyDown={(event) => {
							if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
								event.preventDefault();
								if (!open) changeOpen(true);
								else
									setActiveIndex(
										(index) =>
											(index + (event.key === 'ArrowDown' ? 1 : -1) + filtered.length) % Math.max(1, filtered.length),
									);
							} else if (event.key === 'Enter' && open) {
								event.preventDefault();
								event.stopPropagation();
								if (filtered[active]) choose(filtered[active].value);
							} else if (event.key === 'Escape' && open) {
								event.preventDefault();
								event.stopPropagation();
								changeOpen(false);
							} else if (event.key === 'Tab') changeOpen(false);
						}}
					/>
					<button
						type="button"
						tabIndex={-1}
						className={styles.toggle}
						disabled={disabled}
						aria-label={ariaLabel ?? t.common.selectValue}
						onClick={() => {
							changeOpen(!open);
							input.current?.focus();
						}}
					>
						<ChevronDown size={17} />
					</button>
				</div>
			</Popover.Anchor>
			<Popover.Portal>
				<Popover.Content
					className={`app-select-content ${styles.content}`}
					align="start"
					sideOffset={6}
					onOpenAutoFocus={(event) => event.preventDefault()}
					onCloseAutoFocus={(event) => event.preventDefault()}
					onInteractOutside={(event) => {
						if (anchor.current?.contains(event.target as Node)) event.preventDefault();
					}}
				>
					<div id={listId} role="listbox" aria-label={ariaLabel} className={styles.list}>
						{filtered.map((option, index) => (
							<div
								key={option.value}
								id={`${listId}-${index}`}
								role="option"
								aria-selected={String(option.value) === value}
								className={styles.option}
								data-active={index === active}
								onPointerMove={() => setActiveIndex(index)}
								onPointerDown={(event) => event.preventDefault()}
								onClick={() => choose(option.value)}
								ref={(node) => {
									if (node && index === active && open) node.scrollIntoView({ block: 'nearest' });
								}}
							>
								<span>{option.label}</span>
								{String(option.value) === value && <Check size={16} />}
							</div>
						))}
						{!filtered.length && (
							<p className={styles.empty} role="status">
								{t.common.noOptions}
							</p>
						)}
					</div>
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
};
