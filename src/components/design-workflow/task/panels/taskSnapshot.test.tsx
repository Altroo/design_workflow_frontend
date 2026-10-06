import {
	designerA,
	manager,
	mockProfile,
	taskDetail,
} from '@/components/design-workflow/__testutils__/workflowTestSetup';
import { renderTaskView } from '@/components/design-workflow/__testutils__/renderWorkflowView';
import { screen } from '@testing-library/react';
import { en } from '@/translations/en';
import { TaskSnapshot } from '@/components/design-workflow/task/panels/taskSnapshot';

it('uses the uploaded cover label and shows time totals to managers', () => {
	mockProfile(manager);
	renderTaskView(TaskSnapshot, {
		task: { ...taskDetail, cover_image_url: '/media/plan.png', cover_image_label: 'Final plan' },
	});
	const image = screen.getByRole('img', { name: 'Final plan' });
	const source = new URL(image.getAttribute('src')!, 'http://localhost');
	expect(source.pathname).toBe('/_next/image');
	expect(source.searchParams.get('url')).toBe('/media/plan.png');
	expect(image).toHaveAttribute('srcset');
	expect(image).toHaveAttribute('sizes', '(max-width: 768px) 100vw, 640px');
	expect(screen.getByRole('heading', { name: taskDetail.title })).toBeInTheDocument();
	expect(screen.getByText(en.workflow.labels.logged)).toBeInTheDocument();
});
it('shows unassigned and missing-description fallbacks without manager time details', () => {
	mockProfile(designerA);
	renderTaskView(TaskSnapshot, { task: { ...taskDetail, current_assignee: null, description: '' } });
	expect(screen.getByText(en.workflow.labels.unassigned)).toBeInTheDocument();
	expect(screen.getByText(en.workflow.labels.noDescription)).toBeInTheDocument();
	expect(screen.queryByText(en.workflow.labels.logged)).not.toBeInTheDocument();
});
