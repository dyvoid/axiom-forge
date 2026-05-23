/**
 * Markdown renderer — wraps `markdown-it` with a wiki-link plugin that
 * delegates parsing to `shared/wikilink.ts`. Token-tree is walked into
 * React nodes so wikilinks render as real `<WikiLinkChip>` components
 * (with live folio-index lookup) rather than escaped HTML.
 *
 * Per .ai-rules.md §4, all wiki-link parsing lives in `shared`. Markdown
 * block/inline parsing is delegated to markdown-it.
 */

import { Fragment, type ReactNode } from 'react';
import MarkdownIt from 'markdown-it';

type Token = ReturnType<MarkdownIt['parse']>[number];
type StateInline = Parameters<Parameters<MarkdownIt['inline']['ruler']['before']>[2]>[0];
import { parseWikiLink, type WikiLink } from '@axiom-forge/shared';
import { WikiLinkChip } from '../components/ui/WikiLinkChip.js';

// ── markdown-it instance + wikilink plugin ──────────────────

const OPEN_BRACKET = 0x5b; // '['

function wikilinkPlugin(md: MarkdownIt): void {
	md.inline.ruler.before('link', 'wikilink', (state: StateInline, silent: boolean) => {
		const src = state.src;
		const start = state.pos;
		if (src.charCodeAt(start) !== OPEN_BRACKET) return false;
		if (src.charCodeAt(start + 1) !== OPEN_BRACKET) return false;
		const end = src.indexOf(']]', start + 2);
		if (end === -1) return false;
		const inner = src.slice(start + 2, end);
		// Reject newlines inside a wikilink (matches Obsidian behaviour).
		if (inner.includes('\n')) return false;
		const link = parseWikiLink(`[[${inner}]]`);
		if (!link) return false;
		if (!silent) {
			const token = state.push('wikilink', '', 0);
			token.meta = link;
			token.content = inner;
		}
		state.pos = end + 2;
		return true;
	});
}

const md = new MarkdownIt({
	html: false,      // Disallow raw HTML — markdown source of truth is the .md file.
	linkify: false,   // Don't auto-link bare URLs; users use explicit syntax.
	breaks: false,    // Single newline ≠ <br/>, matches CommonMark + Obsidian.
	typographer: false,
});
md.use(wikilinkPlugin);

// ── Token-tree → React renderer ─────────────────────────────

interface RenderCtx {
	keyPrefix: string;
	dropCap: boolean;
	firstParagraph: { value: boolean };
}

function renderInlineChildren(tokens: Token[], ctx: RenderCtx): ReactNode[] {
	const out: ReactNode[] = [];
	const stack: { tag: string; children: ReactNode[] }[] = [];
	let current: ReactNode[] = out;
	let i = 0;

	const pushNode = (node: ReactNode): void => {
		current.push(node);
	};

	for (const tok of tokens) {
		const key = `${ctx.keyPrefix}-i${i++}`;
		switch (tok.type) {
			case 'text':
				pushNode(tok.content);
				break;
			case 'softbreak':
				pushNode(' ');
				break;
			case 'hardbreak':
				pushNode(<br key={key} />);
				break;
			case 'code_inline':
				pushNode(<code key={key}>{tok.content}</code>);
				break;
			case 'strong_open':
			case 'em_open':
			case 's_open': {
				stack.push({ tag: tok.tag, children: current });
				const children: ReactNode[] = [];
				current = children;
				break;
			}
			case 'strong_close':
			case 'em_close':
			case 's_close': {
				const frame = stack.pop();
				if (!frame) break;
				const children = current;
				current = frame.children;
				const Tag = frame.tag as 'strong' | 'em' | 's';
				pushNode(<Tag key={key}>{children}</Tag>);
				break;
			}
			case 'link_open': {
				const href = tok.attrGet('href') ?? '';
				stack.push({ tag: `a:${href}`, children: current });
				current = [];
				break;
			}
			case 'link_close': {
				const frame = stack.pop();
				if (!frame) break;
				const children = current;
				current = frame.children;
				const href = frame.tag.slice(2);
				pushNode(
					<a key={key} href={href} target="_blank" rel="noreferrer">
						{children}
					</a>,
				);
				break;
			}
			case 'image': {
				const src = tok.attrGet('src') ?? '';
				const alt = tok.content;
				pushNode(<img key={key} src={src} alt={alt} />);
				break;
			}
			case 'wikilink': {
				const link = tok.meta as WikiLink;
				pushNode(<WikiLinkChip key={key} link={link} />);
				break;
			}
			default:
				// Unknown inline token — skip silently.
				break;
		}
	}
	return out;
}

function renderBlockTokens(tokens: Token[], ctx: RenderCtx): ReactNode[] {
	const out: ReactNode[] = [];
	let i = 0;
	while (i < tokens.length) {
		const tok = tokens[i]!;
		const key = `${ctx.keyPrefix}-b${i}`;
		switch (tok.type) {
			case 'paragraph_open': {
				const inline = tokens[i + 1];
				const isFirstP = ctx.firstParagraph.value;
				ctx.firstParagraph.value = false;
				const className = ctx.dropCap && isFirstP ? 'prose-drop-cap' : undefined;
				out.push(
					<p key={key} className={className}>
						{inline && inline.type === 'inline' && inline.children
							? renderInlineChildren(inline.children, { ...ctx, keyPrefix: key })
							: null}
					</p>,
				);
				i += 3; // open, inline, close
				break;
			}
			case 'heading_open': {
				const inline = tokens[i + 1];
				const Tag = tok.tag as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
				out.push(
					<Tag key={key}>
						{inline && inline.type === 'inline' && inline.children
							? renderInlineChildren(inline.children, { ...ctx, keyPrefix: key })
							: null}
					</Tag>,
				);
				i += 3;
				break;
			}
			case 'bullet_list_open':
			case 'ordered_list_open': {
				const Tag = tok.type === 'bullet_list_open' ? 'ul' : 'ol';
				const closeType = tok.type === 'bullet_list_open' ? 'bullet_list_close' : 'ordered_list_close';
				const inner: Token[] = [];
				i++;
				let depth = 1;
				while (i < tokens.length && depth > 0) {
					if (tokens[i]!.type === tok.type) depth++;
					else if (tokens[i]!.type === closeType) {
						depth--;
						if (depth === 0) break;
					}
					inner.push(tokens[i]!);
					i++;
				}
				out.push(<Tag key={key}>{renderListItems(inner, { ...ctx, keyPrefix: key })}</Tag>);
				i++; // skip close
				break;
			}
			case 'blockquote_open': {
				const inner: Token[] = [];
				i++;
				let depth = 1;
				while (i < tokens.length && depth > 0) {
					if (tokens[i]!.type === 'blockquote_open') depth++;
					else if (tokens[i]!.type === 'blockquote_close') {
						depth--;
						if (depth === 0) break;
					}
					inner.push(tokens[i]!);
					i++;
				}
				out.push(<blockquote key={key}>{renderBlockTokens(inner, { ...ctx, keyPrefix: key })}</blockquote>);
				i++;
				break;
			}
			case 'code_block':
			case 'fence':
				out.push(
					<pre key={key}>
						<code>{tok.content}</code>
					</pre>,
				);
				i++;
				break;
			case 'hr':
				out.push(<hr key={key} />);
				i++;
				break;
			case 'table_open': {
				const inner: Token[] = [];
				i++;
				let depth = 1;
				while (i < tokens.length && depth > 0) {
					if (tokens[i]!.type === 'table_open') depth++;
					else if (tokens[i]!.type === 'table_close') {
						depth--;
						if (depth === 0) break;
					}
					inner.push(tokens[i]!);
					i++;
				}
				out.push(<table key={key}>{renderTable(inner, { ...ctx, keyPrefix: key })}</table>);
				i++;
				break;
			}
			default:
				i++;
				break;
		}
	}
	return out;
}

function renderListItems(tokens: Token[], ctx: RenderCtx): ReactNode[] {
	const items: ReactNode[] = [];
	let i = 0;
	let idx = 0;
	while (i < tokens.length) {
		if (tokens[i]!.type !== 'list_item_open') {
			i++;
			continue;
		}
		const key = `${ctx.keyPrefix}-li${idx++}`;
		const inner: Token[] = [];
		i++;
		let depth = 1;
		while (i < tokens.length && depth > 0) {
			if (tokens[i]!.type === 'list_item_open') depth++;
			else if (tokens[i]!.type === 'list_item_close') {
				depth--;
				if (depth === 0) break;
			}
			inner.push(tokens[i]!);
			i++;
		}
		items.push(<li key={key}>{renderBlockTokens(inner, { ...ctx, keyPrefix: key })}</li>);
		i++; // skip close
	}
	return items;
}

function renderTable(tokens: Token[], ctx: RenderCtx): ReactNode[] {
	const parts: ReactNode[] = [];
	let i = 0;
	let sectionIdx = 0;
	while (i < tokens.length) {
		const tok = tokens[i]!;
		if (tok.type === 'thead_open' || tok.type === 'tbody_open') {
			const closeType = tok.type === 'thead_open' ? 'thead_close' : 'tbody_close';
			const Tag = tok.type === 'thead_open' ? 'thead' : 'tbody';
			const rows: Token[] = [];
			i++;
			while (i < tokens.length && tokens[i]!.type !== closeType) {
				rows.push(tokens[i]!);
				i++;
			}
			const key = `${ctx.keyPrefix}-s${sectionIdx++}`;
			parts.push(<Tag key={key}>{renderTableRows(rows, { ...ctx, keyPrefix: key })}</Tag>);
			i++;
		} else {
			i++;
		}
	}
	return parts;
}

function renderTableRows(tokens: Token[], ctx: RenderCtx): ReactNode[] {
	const rows: ReactNode[] = [];
	let i = 0;
	let rowIdx = 0;
	while (i < tokens.length) {
		if (tokens[i]!.type !== 'tr_open') {
			i++;
			continue;
		}
		const rowKey = `${ctx.keyPrefix}-r${rowIdx++}`;
		const cells: ReactNode[] = [];
		i++;
		let cellIdx = 0;
		while (i < tokens.length && tokens[i]!.type !== 'tr_close') {
			const tok = tokens[i]!;
			if (tok.type === 'th_open' || tok.type === 'td_open') {
				const Tag = tok.type === 'th_open' ? 'th' : 'td';
				const closeType = tok.type === 'th_open' ? 'th_close' : 'td_close';
				const inline = tokens[i + 1];
				const cellKey = `${rowKey}-c${cellIdx++}`;
				cells.push(
					<Tag key={cellKey}>
						{inline && inline.type === 'inline' && inline.children
							? renderInlineChildren(inline.children, { ...ctx, keyPrefix: cellKey })
							: null}
					</Tag>,
				);
				// Skip past the cell's tokens.
				while (i < tokens.length && tokens[i]!.type !== closeType) i++;
				i++;
			} else {
				i++;
			}
		}
		rows.push(<tr key={rowKey}>{cells}</tr>);
		i++; // skip tr_close
	}
	return rows;
}

// ── Public entry point ──────────────────────────────────────

export function renderMarkdown(content: string, dropCap = false): ReactNode {
	const tokens = md.parse(content, {});
	const ctx: RenderCtx = {
		keyPrefix: 'md',
		dropCap,
		firstParagraph: { value: true },
	};
	return <Fragment>{renderBlockTokens(tokens, ctx)}</Fragment>;
}
