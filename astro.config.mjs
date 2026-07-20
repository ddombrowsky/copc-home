// @ts-check
import { defineConfig } from 'astro/config';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const publicDir = fileURLToPath(new URL('./public', import.meta.url));

// The dev server serves public/ files by exact path only. The static
// WordPress copy in public/ uses extensionless URLs (/about, /sermons/...),
// so mimic a standard static host: redirect /about -> /about/ and serve
// /about/index.html for /about/.
function publicDirIndexFallback() {
	return {
		name: 'public-dir-index-fallback',
		/** @param {import('vite').ViteDevServer} server */
		configureServer(server) {
			server.middlewares.use((req, res, next) => {
				const [pathname, query] = (req.url ?? '/').split('?');
				const suffix = query ? '?' + query : '';
				if (pathname.endsWith('/')) {
					if (existsSync(path.join(publicDir, pathname, 'index.html'))) {
						req.url = pathname + 'index.html' + suffix;
					}
				} else if (path.extname(pathname) === '') {
					if (existsSync(path.join(publicDir, pathname, 'index.html'))) {
						res.statusCode = 301;
						res.setHeader('Location', pathname + '/' + suffix);
						res.end();
						return;
					}
				}
				next();
			});
		},
	};
}

// https://astro.build/config
export default defineConfig({
	vite: {
		plugins: [publicDirIndexFallback()],
	},
});
