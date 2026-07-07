import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

/** Dev-only: POST YAML here to overwrite garden layout files on disk. */
const GARDEN_LAYOUT_SAVE_PATH = '/__dev/save-garden-layout';

const LAYOUT_PATHS = {
  default: ['src', 'garden', 'layout.yaml'],
  dad: ['src', 'garden', 'dadLevels', 'layout.yaml'],
  mode2: ['src', 'garden', 'mode2', 'layout.yaml'],
  mode2Surfaces: ['src', 'garden', 'mode2', 'surfaces.yaml'],
} as const;

/**
 * Local dev helper — writes the Garden Editor export directly to the repo.
 * Only active during `vite dev` (not production builds).
 */
export function gardenLayoutSavePlugin(projectRoot: string): Plugin {
  return {
    name: 'garden-layout-save',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(GARDEN_LAYOUT_SAVE_PATH, (req, res, next) => {
        if (req.method !== 'POST') {
          next();
          return;
        }

        const url = new URL(req.url ?? '', 'http://localhost');
        const variant = url.searchParams.get('variant') === 'dad' ? 'dad' : 'default';
        const phase = url.searchParams.get('phase');
        const file = url.searchParams.get('file');

        let layoutFile: string;
        if (variant === 'dad') {
          layoutFile = path.join(projectRoot, ...LAYOUT_PATHS.dad);
        } else if (phase === 'mode2' && file === 'surfaces') {
          layoutFile = path.join(projectRoot, ...LAYOUT_PATHS.mode2Surfaces);
        } else if (phase === 'mode2') {
          layoutFile = path.join(projectRoot, ...LAYOUT_PATHS.mode2);
        } else {
          layoutFile = path.join(projectRoot, ...LAYOUT_PATHS.default);
        }

        const chunks: Buffer[] = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => {
          try {
            fs.mkdirSync(path.dirname(layoutFile), { recursive: true });
            fs.writeFileSync(layoutFile, Buffer.concat(chunks).toString('utf8'), 'utf8');
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, path: layoutFile }));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                ok: false,
                error: err instanceof Error ? err.message : String(err),
              }),
            );
          }
        });
        req.on('error', (err) => {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              ok: false,
              error: err instanceof Error ? err.message : String(err),
            }),
          );
        });
      });
    },
  };
}
