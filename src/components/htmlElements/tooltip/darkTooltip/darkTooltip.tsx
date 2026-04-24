import React from 'react';

type TooltipProps = {
	title?: React.ReactNode;
	children: React.ReactNode;
};

const DarkTooltip = ({ title, children }: TooltipProps) => {
	if (React.isValidElement(children)) {
		return (
			<span title={typeof title === 'string' ? title : undefined} className="inline-flex">
				{children}
			</span>
		);
	}

	return <span title={typeof title === 'string' ? title : undefined}>{children}</span>;
};

export default DarkTooltip;
