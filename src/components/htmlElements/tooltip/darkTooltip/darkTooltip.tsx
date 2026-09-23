import {type ReactNode, isValidElement} from 'react';

type TooltipProps = {
	title?: ReactNode;
	children: ReactNode;
};

const DarkTooltip = ({ title, children }: TooltipProps) => {
	if (isValidElement(children)) {
		return (
			<span title={typeof title === 'string' ? title : undefined} className="inline-flex">
				{children}
			</span>
		);
	}

	return <span title={typeof title === 'string' ? title : undefined}>{children}</span>;
};

export default DarkTooltip;
