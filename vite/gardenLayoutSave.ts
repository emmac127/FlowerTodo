import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

/** Dev-only: POST YAML here to overwrite src/garden/layout.yaml on disk. */
const GARDEN_LAYOUT_SAVE_PATH = '/__dev/save-garden-layout';

/**
 * Local dev helper — writes the Garden Editor export directly to the repo.
 * Only active during `vite dev` (not production builds).
 */
export function gardenLayoutSavePlugin(projectRoot: string): Plugin {
  const layoutFile = path.join(projectRoot, 'src', 'garden', 'layout.yaml');

  return {
    name: 'garden-layout-save',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(GARDEN_LAYOUT_SAVE_PATH, (req, res, next) => {
        if (req.method !== 'POST') {
          next();
          return;
        }

        const chunks: Buffer[] = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => {
          try {
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
