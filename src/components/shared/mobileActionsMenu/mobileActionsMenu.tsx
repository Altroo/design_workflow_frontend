'use client';

import React from 'react';

export type ActionItem = {
	label: string;
	icon: React.ReactNode;
	onClick: (event?: React.MouseEvent<HTMLElement>) => void;
	color?: 'inherit' | 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
	show?: boolean;
};

type MobileActionsMenuProps = {
	actions: ActionItem[];
};

const MobileActionsMenu: React.FC<MobileActionsMenuProps> = ({ actions }) => {
	const visibleActions = actions.filter((action) => action.show !== false);

	return (
		<div className="flex flex-wrap gap-2">
			{visibleActions.map((action, index) => (
				<button
					key={index}
					onClick={(e) => {
						e.stopPropagation();
						action.onClick(e);
					}}
					aria-label={action.label}
					type="button"
					className="app-pill ui-button-ghost inline-flex items-center gap-2 border border-[color:var(--line)] bg-white px-3 py-2 text-sm font-semibold text-(--ink) transition hover:bg-(--surface-muted)"
				>
					{action.icon}
					<span>{action.label}</span>
				</button>
			))}
		</div>
	);
};

export default MobileActionsMenu;
