import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const seedDesignWorkflowE2E = () => {
	if (process.env.DESIGN_WORKFLOW_E2E_SEEDED !== '1') return;

	const backendDir = resolve(process.cwd(), '..', 'design_workflow_backend');
	const managePath = join(backendDir, 'manage.py');
	if (!existsSync(managePath)) {
		throw new Error(`Cannot seed Design Workflow E2E data because ${managePath} does not exist.`);
	}

	const result = spawnSync(process.env.PYTHON ?? 'python', ['manage.py', 'seed_design_workflow_e2e'], {
		cwd: backendDir,
		stdio: 'inherit',
	});
	if (result.error) {
		throw result.error;
	}
	if (result.status !== 0) {
		throw new Error(`seed_design_workflow_e2e failed with status ${result.status ?? 'unknown'}.`);
	}
};
