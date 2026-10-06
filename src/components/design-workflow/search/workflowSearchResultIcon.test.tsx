import { render } from '@testing-library/react';
import type { WorkspaceSearchResult } from '@/types/designWorkflowTypes';
import { renderSearchResultIcon } from '@/components/design-workflow/search/workflowSearchResultIcon';

it.each<[WorkspaceSearchResult['type'], string]>([
	['task', 'list-todo'],
	['project', 'folder-kanban'],
	['chat', 'messages-square'],
	['file', 'paperclip'],
	['user', 'users'],
])('uses the %s icon for that result type', (type, icon) => {
	const { container } = render(
		renderSearchResultIcon({ type, id: 1, title: '', subtitle: '', url: '/', metadata: {} }),
	);
	expect(container.querySelector('svg')).toHaveClass(`lucide-${icon}`);
});
