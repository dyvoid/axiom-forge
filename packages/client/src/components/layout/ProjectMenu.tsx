import { useRef, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects } from '../../api/queries.js';
import { useProject } from '../../context/ProjectContext.js';
import { useCombobox } from '../../hooks/useCombobox.js';
import { Icon } from '../ui/Icon.js';
import styles from './ProjectMenu.module.css';

/**
 * The project's name in the header, as a menu: back to this project's home
 * page, across to another project, or up to the full list.
 *
 * A menu button rather than a combobox — nothing is typed — so focus moves
 * onto the items themselves and the arrow keys walk them.
 */
export function ProjectMenu(): JSX.Element {
	const { config } = useProject();
	const { data: library } = useProjects();
	const navigate = useNavigate();
	const { open, toggleMenu, closeMenu, containerRef, menuRef } = useCombobox<HTMLDivElement>();
	const buttonRef = useRef<HTMLButtonElement>(null);

	const others = (library?.projects ?? []).filter((p) => p.id !== library?.activeId && p.available);

	function go(to: string): void {
		closeMenu();
		navigate(to);
	}

	function items(): HTMLElement[] {
		return Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
	}

	function focusItem(index: number): void {
		const all = items();
		all[(index + all.length) % all.length]?.focus();
	}

	function handleKeyDown(e: KeyboardEvent): void {
		const current = items().indexOf(document.activeElement as HTMLElement);
		switch (e.key) {
			case 'ArrowDown':
				// preventDefault also tells the sidebar's arrow-key handler this one is taken.
				e.preventDefault();
				if (open) {
					focusItem(current + 1);
				} else {
					// Opening from the button: the menu does not exist until the
					// next render, so its first item is focused a frame later.
					toggleMenu();
					requestAnimationFrame(() => focusItem(0));
				}
				break;
			case 'ArrowUp':
				e.preventDefault();
				if (open) focusItem(current - 1);
				break;
			case 'Home':
				if (open) { e.preventDefault(); focusItem(0); }
				break;
			case 'End':
				if (open) { e.preventDefault(); focusItem(-1); }
				break;
			case 'Escape':
				if (open) {
					e.preventDefault();
					closeMenu();
					buttonRef.current?.focus();
				}
				break;
			case 'Tab':
				closeMenu();
				break;
		}
	}

	return (
		<div ref={containerRef} className={styles.wrap} onKeyDown={handleKeyDown}>
			<button
				ref={buttonRef}
				type="button"
				className={styles.trigger}
				onClick={toggleMenu}
				aria-haspopup="menu"
				aria-expanded={open}
				aria-label={`${config.name}: project menu`}
			>
				<Icon name="library" size={16} className={styles.triggerIcon} />
				<span className={styles.projectTitle}>{config.name}</span>
				<Icon name="chevron-down" size={14} className={open ? styles.chevronOpen : styles.chevron} />
			</button>

			{open && (
				<div ref={menuRef} className={styles.menu} role="menu" aria-label="Project">
					<button type="button" role="menuitem" className={styles.item} onClick={() => go('/')}>
						Project home
					</button>
					{others.length > 0 && (
						<div className={styles.group} role="group" aria-label="Switch to">
							<div className={styles.groupLabel} aria-hidden="true">Switch to</div>
							{others.map((project) => (
								<button
									key={project.id}
									type="button"
									role="menuitem"
									className={styles.itemProject}
									onClick={() => go(`/open/${encodeURIComponent(project.id)}`)}
								>
									{project.name}
								</button>
							))}
						</div>
					)}
					<button type="button" role="menuitem" className={styles.item} onClick={() => go('/projects')}>
						All projects
					</button>
				</div>
			)}
		</div>
	);
}
