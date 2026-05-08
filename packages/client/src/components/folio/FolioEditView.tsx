import { useEffect, useState } from 'react';
import { Link, useBlocker } from 'react-router-dom';
import {
	toRoman,
	type FieldDef,
	type FieldValue,
	type ParsedFolio,
	type ParsedSection,
	type SectionDef,
	type TypeDef,
} from '@axiom-forge/shared';
import { Icon } from '../ui/Icon.js';
import { ConfirmDialog } from '../ui/ConfirmDialog.js';
import { FieldEditor } from './edit/FieldEditor.js';
import { FieldTypeHint } from './edit/FieldTypeHint.js';
import { TextListField } from './edit/TextListField.js';
import { TextField } from './edit/TextField.js';
import { TextareaField } from './edit/TextareaField.js';
import styles from './FolioEditView.module.css';

interface Props {
	folio: ParsedFolio & { id: number; mtime: number };
	typeDef: TypeDef;
	saving: boolean;
	deleting: boolean;
	saveError: string | null;
	onSave: (next: ParsedFolio) => void;
	onDelete: () => void;
}

export function FolioEditView({ folio, typeDef, saving, deleting, saveError, onSave, onDelete }: Props): JSX.Element {
	const [draft, setDraft] = useState<ParsedFolio>(() => structuredClone(folio));
	const [savedSnapshot, setSavedSnapshot] = useState<string>(() => JSON.stringify(folio));
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [pendingNavConfirm, setPendingNavConfirm] = useState<(() => void) | null>(null);

	const dirty = JSON.stringify(draft) !== savedSnapshot;

	const blocker = useBlocker(dirty && !saving);

	useEffect(() => {
		if (blocker.state === 'blocked') {
			setPendingNavConfirm(() => () => blocker.proceed());
		}
	}, [blocker.state]);

	function patchSection(sectionName: string, patch: Partial<ParsedSection>): void {
		setDraft((d) => ({
			...d,
			sections: {
				...d.sections,
				[sectionName]: { ...(d.sections[sectionName] ?? {}), ...patch },
			},
		}));
	}

	function updateField(sectionName: string, fieldName: string, next: FieldValue): void {
		setDraft((d) => {
			const section = d.sections[sectionName] ?? {};
			return {
				...d,
				sections: {
					...d.sections,
					[sectionName]: {
						...section,
						fields: { ...(section.fields ?? {}), [fieldName]: next },
					},
				},
			};
		});
	}

	function handleSave(): void {
		onSave(draft);
		setSavedSnapshot(JSON.stringify(draft));
	}

	function handleDiscard(): void {
		if (dirty) {
			setPendingNavConfirm(() => () => {
				setDraft(structuredClone(folio));
				setSavedSnapshot(JSON.stringify(folio));
			});
		} else {
			setDraft(structuredClone(folio));
			setSavedSnapshot(JSON.stringify(folio));
		}
	}

	function handleNavCancel(): void {
		setPendingNavConfirm(null);
		if (blocker.state === 'blocked') blocker.reset();
	}

	const backTo = `/folio/${encodeURIComponent(folio.folder)}/${encodeURIComponent(folio.name)}`;
	const sections = Object.entries(typeDef.sections);

	return (
		<div className={styles.container}>
			<div className={styles.toolbar}>
				<div className={styles.toolbarLabel}>✎ Editing folio {toRoman(folio.id).toLowerCase()}</div>
				<div className={`${styles.toolbarStatus} ${dirty ? styles.dirty : ''}`}>
					{saving ? '· saving…' : dirty ? '· unsaved changes' : '· all saved'}
				</div>
				<div className={styles.toolbarSpacer} />
				<button
					type="button"
					className={styles.btnDanger}
					onClick={() => setShowDeleteDialog(true)}
					disabled={saving || deleting}
				>
					Delete
				</button>
				<button type="button" className={styles.btnGhost} onClick={handleDiscard} disabled={saving}>
					Discard
				</button>
				<button
					type="button"
					className={styles.btnPrimary}
					onClick={handleSave}
					disabled={saving || !dirty}
				>
					Save folio
				</button>
			</div>

			{saveError && (
				<div className={styles.warnings}>
					<div className={styles.warningsLabel}>Save failed</div>
					{saveError}
				</div>
			)}

			<div className={styles.eyebrowRow}>
				<div className={styles.eyebrow}>
					<Icon name={typeDef.icon} size={14} />
					<span>·</span>
					<span>{folio.type}</span>
					<span>·</span>
					<span>Folio {toRoman(folio.id)}</span>
				</div>
				<Link className={styles.backLink} to={backTo}>
					↩ Back to read mode
				</Link>
			</div>

			<input
				className={styles.titleInput}
				value={draft.name.replace(/_/g, ' ')}
				onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value.replace(/ /g, '_') }))}
			/>

			<div className={styles.metaRow}>
				<div className={styles.statusSlot}>
					<TextField
						value={draft.status ?? ''}
						placeholder="Status"
						onChange={(v) => setDraft((d) => ({ ...d, status: v || undefined }))}
					/>
				</div>
				<span className={styles.tagsLabel}>tags ·</span>
				<div className={styles.tagsSlot}>
					<TextListField
						value={draft.tags}
						onChange={(v) => setDraft((d) => ({ ...d, tags: v }))}
					/>
				</div>
			</div>

			<div className={styles.divider} />

			{sections.map(([sectionName, sectionDef], idx) => (
				<SectionBlock
					key={sectionName}
					ordinal={toRoman(idx + 1)}
					sectionName={sectionName}
					sectionDef={sectionDef}
					data={draft.sections[sectionName]}
					onUpdateField={(fieldName, next) => updateField(sectionName, fieldName, next)}
					onUpdateSection={(patch) => patchSection(sectionName, patch)}
				/>
			))}

			<div className={styles.dividerSoft} />
			<div className={styles.footer}>
				<span className={`${styles.footerStatus} ${dirty ? styles.dirty : ''}`}>
					{dirty
						? `· unsaved changes will write to ${folio.folder}/${draft.name}.md`
						: '· file in sync with disk'}
				</span>
				<button type="button" className={styles.btnGhost} onClick={handleDiscard} disabled={saving}>
					Discard
				</button>
				<button
					type="button"
					className={styles.btnPrimary}
					onClick={handleSave}
					disabled={saving || !dirty}
				>
					Save folio
				</button>
			</div>

			<ConfirmDialog
				open={showDeleteDialog}
				title="Delete folio"
				message={`Permanently delete "${folio.name.replace(/_/g, ' ')}"? This cannot be undone.`}
				confirmLabel="Delete"
				danger
				onConfirm={() => { setShowDeleteDialog(false); onDelete(); }}
				onCancel={() => setShowDeleteDialog(false)}
			/>

			<ConfirmDialog
				open={pendingNavConfirm !== null}
				title="Discard changes"
				message="You have unsaved changes. Discard them?"
				confirmLabel="Discard"
				onConfirm={() => { const fn = pendingNavConfirm; setPendingNavConfirm(null); fn?.(); }}
				onCancel={handleNavCancel}
			/>
		</div>
	);
}

// ── Section block ─────────────────────────────────────────────

interface SectionBlockProps {
	ordinal: string;
	sectionName: string;
	sectionDef: SectionDef;
	data: ParsedSection | undefined;
	onUpdateField: (fieldName: string, next: FieldValue) => void;
	onUpdateSection: (patch: Partial<ParsedSection>) => void;
}

function SectionBlock({
	ordinal,
	sectionName,
	sectionDef,
	data,
	onUpdateField,
	onUpdateSection,
}: SectionBlockProps): JSX.Element {
	const header = (
		<div className={styles.sectionHeader}>
			<span>{ordinal.toUpperCase()}. {sectionName}</span>
		</div>
	);

	if (sectionDef.type === 'textarea') {
		const content = data?.content ?? '';
		const wordCount = content.split(/\s+/).filter(Boolean).length;
		return (
			<>
				{header}
				<div className={styles.sectionProse}>
					<TextareaField
						value={content}
						onChange={(v) => onUpdateSection({ content: v || undefined })}
					/>
					<div className={styles.proseFooter}>
						{wordCount} words · markdown · {sectionDef.role === 'prose' ? 'prose' : 'free text'}
					</div>
				</div>
			</>
		);
	}

	if (sectionDef.type === 'wikilink-list') {
		const synthDef: FieldDef = { type: 'wikilink-list', target: sectionDef.target };
		return (
			<>
				{header}
				<div className={styles.section}>
					<FieldEditor
						fieldDef={synthDef}
						value={(data?.value as FieldValue) ?? null}
						onChange={(v) => onUpdateSection({ value: v })}
					/>
				</div>
			</>
		);
	}

	if (sectionDef.fields) {
		const fields = Object.entries(sectionDef.fields);
		return (
			<>
				{header}
				<div className={styles.section}>
					{fields.map(([fieldName, fieldDef]) => (
						<div key={fieldName} className={styles.fieldRow}>
							<div>
								<div className={styles.fieldLabel}>{fieldName}</div>
								<FieldTypeHint fieldDef={fieldDef} />
							</div>
							<div>
								<FieldEditor
									fieldDef={fieldDef}
									value={data?.fields?.[fieldName] ?? null}
									onChange={(v) => onUpdateField(fieldName, v)}
								/>
							</div>
						</div>
					))}
				</div>
			</>
		);
	}

	return <></>;
}
