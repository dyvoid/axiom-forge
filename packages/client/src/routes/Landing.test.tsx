/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { Theme } from '@axiom-forge/shared';
import { renderWithProject } from '../test/renderWithProject.js';
import { Landing } from './Landing.js';

// jsdom has no WebGL. The hero bails out quietly when getContext returns null,
// which is all these tests need: they check whether the canvas is mounted.
beforeEach(() => {
	vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
	vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
	vi.restoreAllMocks();
});

function renderLanding(theme: Theme) {
	return renderWithProject(
		<MemoryRouter>
			<Landing />
		</MemoryRouter>,
		{ queryData: [[['theme'], theme]] },
	);
}

describe('Landing hero', () => {
	it('draws the hero when the project has no theme', () => {
		const { container } = renderLanding({});
		expect(container.querySelector('canvas')).not.toBeNull();
	});

	it('draws the hero when the theme restyles it', () => {
		const { container } = renderLanding({ hero: { smoke: '#ffffff', speed: 0 } });
		expect(container.querySelector('canvas')).not.toBeNull();
	});

	it('leaves the hero out entirely when theme.json disables it', () => {
		const { container } = renderLanding({ hero: { enabled: false } });
		expect(container.querySelector('canvas')).toBeNull();
		expect(HTMLCanvasElement.prototype.getContext).not.toHaveBeenCalled();
	});
});
