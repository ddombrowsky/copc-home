import { load } from 'js-yaml';
import { existsSync } from 'node:fs';
import path from 'node:path';
// @ts-ignore - Vite raw import
import sermonsYaml from '../data/sermons.yaml?raw';

export interface Sermon {
	title: string;
	/** YYYY-MM-DD */
	date: string;
	slug: string;
	preacher?: string;
	passage?: string;
	embedUrl: string;
	/** True when a pre-rendered WordPress page in public/ already serves this slug. */
	hasStaticPage: boolean;
}

interface RawSermon {
	title?: unknown;
	date?: unknown;
	youtube?: unknown;
	preacher?: unknown;
	passage?: unknown;
	slug?: unknown;
}

// Resolved from the project root: import.meta.url is unreliable once bundled.
const publicSermonsDir = path.resolve(process.cwd(), 'public/sermons');

function slugify(title: string): string {
	// Matches WordPress slugs: apostrophes dropped, other punctuation becomes '-'.
	return title
		.toLowerCase()
		.replace(/['‘’]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function toIsoDate(value: unknown, context: string): string {
	// js-yaml parses unquoted dates as Date (UTC midnight); quoted ones stay strings.
	if (value instanceof Date) return value.toISOString().slice(0, 10);
	if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
	throw new Error(`Sermon "${context}" needs a date in YYYY-MM-DD form (got: ${JSON.stringify(value)})`);
}

export function youtubeEmbedUrl(url: string): string {
	const match = url.match(
		/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|live\/|shorts\/))([\w-]{11})/
	);
	if (!match) throw new Error(`Could not find a YouTube video ID in: ${url}`);
	return `https://www.youtube.com/embed/${match[1]}`;
}

export function formatDate(isoDate: string): string {
	const [year, month, day] = isoDate.split('-').map(Number);
	return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		timeZone: 'UTC',
	});
}

export function getSermons(): Sermon[] {
	const raw = (load(sermonsYaml) ?? []) as RawSermon[];
	if (!Array.isArray(raw)) throw new Error('src/data/sermons.yaml must be a YAML list of sermons');

	const sermons = raw.map((entry, i) => {
		const title = typeof entry.title === 'string' ? entry.title.trim() : '';
		if (!title) throw new Error(`Sermon #${i + 1} in sermons.yaml is missing a title`);
		if (typeof entry.youtube !== 'string') {
			throw new Error(`Sermon "${title}" is missing a youtube link`);
		}
		const slug = typeof entry.slug === 'string' && entry.slug ? entry.slug : slugify(title);
		return {
			title,
			date: toIsoDate(entry.date, title),
			slug,
			preacher: typeof entry.preacher === 'string' ? entry.preacher : undefined,
			passage: typeof entry.passage === 'string' ? entry.passage : undefined,
			embedUrl: youtubeEmbedUrl(entry.youtube),
			hasStaticPage: existsSync(`${publicSermonsDir}/${slug}/index.html`),
		};
	});

	const seen = new Set<string>();
	for (const sermon of sermons) {
		if (seen.has(sermon.slug)) {
			throw new Error(`Duplicate sermon slug "${sermon.slug}" - set a distinct "slug:" on one of them`);
		}
		seen.add(sermon.slug);
	}

	return sermons.sort((a, b) => b.date.localeCompare(a.date));
}
