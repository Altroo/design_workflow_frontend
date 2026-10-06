import { hasWorkflowManagerAccess } from './workflowAccess';

it.each([undefined, null, { role: 'designer' as const }])('denies manager tools to %p', (user) => {
	expect(hasWorkflowManagerAccess(user)).toBe(false);
});

it.each([
	{ role: 'manager' as const },
	{ role: 'designer' as const, is_staff: true },
	{ role: 'designer' as const, is_superuser: true },
])('grants manager tools to %p', (user) => {
	expect(hasWorkflowManagerAccess(user)).toBe(true);
});
