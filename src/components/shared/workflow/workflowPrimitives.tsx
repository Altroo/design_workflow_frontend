import type { ReactNode } from 'react';

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

type WorkflowPageHeroProps = {
	className: string;
	eyebrow: ReactNode;
	title: ReactNode;
	actions?: ReactNode;
	actionsClassName?: string;
	actionsWrapper?: boolean;
	description?: ReactNode;
	element?: 'div' | 'section';
	titleElement?: 'h1' | 'h2';
	titleClassName?: string;
};

export const WorkflowPageHero = ({
	className,
	eyebrow,
	title,
	actions,
	actionsClassName,
	actionsWrapper = true,
	description,
	element: Element = 'section',
	titleElement: Title = 'h1',
	titleClassName = 'min-w-0',
}: WorkflowPageHeroProps) => (
	<Element className={className}>
		<div className={titleClassName}>
			<p>{eyebrow}</p>
			<Title>{title}</Title>
			{description ? <span>{description}</span> : null}
		</div>
		{actions ? (actionsWrapper ? <div className={actionsClassName}>{actions}</div> : actions) : null}
	</Element>
);

type WorkflowMetricCardProps = {
	icon: ReactNode;
	label: string;
	value: ReactNode;
	tone?: 'indigo' | 'amber' | 'green' | 'rose';
};

export const WorkflowMetricCard = ({ icon, label, value, tone = 'indigo' }: WorkflowMetricCardProps) => (
	<div className="workflow-overview-metric workflow-card-hover" data-tone={tone}>
		<div className="workflow-overview-metric-pill">
			<b>{label}</b>
			<em>{icon}</em>
		</div>
		<p>{value}</p>
	</div>
);

type WorkflowSimpleMetricProps = {
	className: string;
	icon: ReactNode;
	label: ReactNode;
	value: ReactNode;
	tone?: string;
};

export const WorkflowSimpleMetric = ({ className, icon, label, value, tone }: WorkflowSimpleMetricProps) => (
	<div className={className} data-tone={tone}>
		{icon}
		<span>{label}</span>
		<strong>{value}</strong>
	</div>
);

type WorkflowPanelPillProps = {
	baseClassName?: string;
	className?: string;
	label: ReactNode;
	value: ReactNode;
	labelElement?: 'b' | 'span';
};

export const WorkflowPanelPill = ({ baseClassName = 'workflow-overview-panel-pill', className, label, value, labelElement = 'b' }: WorkflowPanelPillProps) => {
	const Label = labelElement;

	return (
		<div className={cx(baseClassName, className)}>
			<Label>{label}</Label>
			<em>{value}</em>
		</div>
	);
};

type WorkflowIconPillProps = {
	className?: string;
	icon: ReactNode;
	label: ReactNode;
	tone?: string;
};

export const WorkflowIconPill = ({ className, icon, label, tone }: WorkflowIconPillProps) => (
	<div className={cx('workflow-user-form-panel-pill', className)} data-tone={tone}>
		{icon}
		<b>{label}</b>
	</div>
);
