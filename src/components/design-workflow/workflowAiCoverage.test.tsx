import {
	manager,
	designerA,
	mockProfile,
	mockCreateProject,
	mockUpdateTask,
} from '@/components/design-workflow/__testutils__/workflowTestSetup';
import { renderTaskView } from '@/components/design-workflow/__testutils__/renderWorkflowView';
import { fireEvent, render, screen } from '@testing-library/react';
import DesignWorkflowShell from '@/components/pages/design-workflow/designWorkflowShell';
import { TaskEditPanel } from '@/components/design-workflow/task/panels/taskEditPanel';
import { TaskCommentsPanel } from '@/components/design-workflow/task/panels/taskCommentsPanel';
import type { AiAssistantControlProps } from '@/types/aiTypes';

jest.mock('@/components/shared/aiAssistantControl/aiAssistantControl', () => ({
	__esModule: true,
	default: ({ context, onApply }: AiAssistantControlProps) => (
		<button type="button" data-testid={`ai-${context}`} onClick={() => onApply('Corrected draft')}>
			AI {context}
		</button>
	),
}));

it('project assistance edits only the draft title/description, never submits a project', () => {
	mockProfile(designerA);
	render(<DesignWorkflowShell title="Projects" variant="projects" />);
	expect(screen.getByTestId('ai-project_description')).toBeInTheDocument();
	fireEvent.click(screen.getByTestId('ai-project_title'));
	expect(screen.getByLabelText('Project name')).toHaveValue('Corrected draft');
	expect(mockCreateProject).not.toHaveBeenCalled();
	expect(screen.getAllByText(/^AI /)).toHaveLength(2);
});

it('task assistance covers title, description and reason, but not estimates or sort order', () => {
	mockProfile(manager);
	renderTaskView(TaskEditPanel);
	expect(screen.getByTestId('ai-task_title')).toBeInTheDocument();
	expect(screen.getByTestId('ai-task_description')).toBeInTheDocument();
	expect(screen.getByTestId('ai-blocked_reason')).toBeInTheDocument();
	expect(screen.getAllByText(/^AI /)).toHaveLength(3);
	fireEvent.click(screen.getByTestId('ai-task_title'));
	expect(screen.getByDisplayValue('Corrected draft')).toBeInTheDocument();
	expect(mockUpdateTask).not.toHaveBeenCalled();
});

it('read-only card comments do not expose writing assistance', () => {
	mockProfile(designerA);
	renderTaskView(TaskCommentsPanel, { taskMutable: false });
	expect(screen.queryByTestId('ai-comment')).not.toBeInTheDocument();
});

it('editable card comments get assistance without posting the suggestion', () => {
	mockProfile(designerA);
	renderTaskView(TaskCommentsPanel, { taskMutable: true });
	fireEvent.click(screen.getByTestId('ai-comment'));
	expect(screen.getByRole('textbox')).toHaveValue('Corrected draft');
});
