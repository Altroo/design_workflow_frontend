import '@/components/design-workflow/__testutils__/workflowTestSetup';
import { render } from '@testing-library/react';
import type { ComponentType } from 'react';
import type { Props } from '@/types/workflowUiTypes';
import { createTaskDetailModel, type TaskDetailModel } from '@/components/design-workflow/task/model/taskDetailModel';
import { useWorkflowController, type WorkflowController } from '@/utils/workflow/hooks/useWorkflowController';
import { taskDetail } from '@/components/design-workflow/__testutils__/workflowTestSetup';

export const renderWorkflowView = (
	View: ComponentType<{ model: WorkflowController }>,
	overrides: Partial<WorkflowController> = {},
	props: Props = { title: 'Board', variant: 'board' },
) => {
	const Harness = () => <View model={{ ...useWorkflowController(props), ...overrides }} />;
	return render(<Harness />);
};

export const renderTaskView = (
	View: ComponentType<{ model: TaskDetailModel }>,
	overrides: Partial<WorkflowController> = {},
) => {
	const Harness = () => {
		const model = useWorkflowController({ title: 'Task', variant: 'task-detail', taskId: taskDetail.id });
		return (
			<View
				model={createTaskDetailModel({ ...model, ...overrides, task: overrides.task ?? model.task ?? taskDetail })}
			/>
		);
	};
	return render(<Harness />);
};
