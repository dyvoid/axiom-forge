import { Callout } from '../ui/Callout.js';
import styles from './UnknownTypeNotice.module.css';

/**
 * Shown in place of a folio whose `type` the schema does not declare, so there
 * is no layout to build it from. Reached when schema.json drops or renames a
 * type that files on disk still use.
 */
export function UnknownTypeNotice({ type }: { type: string }): JSX.Element {
	return (
		<div className={styles.container}>
			<Callout label="Unknown type">
				This folio is a “{type}”, which schema.json does not declare. Add the type to the schema,
				or change the folio’s <code>type</code> in its file, then sync.
			</Callout>
		</div>
	);
}
