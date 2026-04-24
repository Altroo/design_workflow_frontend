import React from 'react';

type Action = {
	active: boolean;
	text: string;
	onClick: () => void;
	color?: string;
	icon?: React.ReactNode;
	disabled?: boolean;
};

type Props = {
	title: string;
	actions: Action[];
	actionsStyle?: string[];
	body?: string;
	children?: React.ReactNode;
	titleIcon?: React.ReactNode;
	titleIconColor?: string;
	/** Called when the dialog is dismissed via backdrop click or Escape key. */
	onClose?: () => void;
};

const ActionModals: React.FC<Props> = ({ title, actions, actionsStyle, body, children, titleIcon, titleIconColor, onClose }) => {
	const handleClose = () => {
		if (onClose) {
			onClose();
			return;
		}
		// Fallback: find the first non-active action (typically the cancel button)
		const cancelAction = actions.find(a => !a.active);
		if (cancelAction) {
			cancelAction.onClick();
		}
	};

	return (
		<div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/45 px-4 py-6" onClick={handleClose}>
			<div
				role="dialog"
				aria-modal="true"
				className="app-card w-full max-w-lg border border-[color:var(--line-strong)] bg-white p-6"
				onClick={(event) => event.stopPropagation()}
			>
				<div className="flex items-start gap-3">
					{titleIcon ? (
						<div
							className="flex h-11 w-11 items-center justify-center rounded-[8px] bg-[var(--accent)] text-white"
							style={titleIconColor ? { backgroundColor: titleIconColor } : undefined}
						>
							{titleIcon}
						</div>
					) : null}
					<div className="flex-1">
						<h2 className="text-lg font-semibold text-[var(--ink)]">{title}</h2>
						{body ? <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">{body}</p> : null}
					</div>
				</div>

				{children ? <div className="mt-4">{children}</div> : null}

				<div className={['mt-6 flex flex-wrap justify-end gap-3', actionsStyle?.join(' ') ?? ''].join(' ').trim()}>
					{actions.map((action, index) => (
						<button
							key={index}
							type="button"
							onClick={action.onClick}
							disabled={action.disabled}
							aria-label={action.text}
							className={[
								'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition',
								action.active
									? 'app-button'
									: 'border border-[color:var(--line-strong)] bg-white text-[var(--ink)] hover:bg-[var(--surface-muted)]',
								action.disabled ? 'cursor-not-allowed opacity-50' : '',
							].join(' ')}
							style={action.active && action.color ? { backgroundColor: action.color } : undefined}
						>
							{action.icon}
							<span>{action.text}</span>
						</button>
					))}
				</div>
			</div>
		</div>
	);
};

export default ActionModals;
