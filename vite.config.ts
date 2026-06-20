import { defineConfig, type Plugin } from 'vite';
import { verifyWalletHolding } from './lib/tokenGateServer';

function tokenGateApiDevPlugin(): Plugin {
  return {
    name: 'token-gate-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0] ?? '';
        if (url !== '/api/verify-holding') {
          next();
          return;
        }

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
          res.end();
          return;
        }

        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        const parsed = new URL(req.url ?? '', 'http://localhost');
        const wallet = parsed.searchParams.get('wallet')?.trim() ?? '';

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');

        if (!wallet) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Missing wallet query parameter' }));
          return;
        }

        try {
          const result = await verifyWalletHolding(wallet);
          res.statusCode = 200;
          res.end(JSON.stringify(result));
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Verification failed';
          res.statusCode = 500;
          res.end(JSON.stringify({ error: message }));
        }
      });
    },
  };
}

export default defineConfig({
  root: '.',
  publicDir: 'public',
  base: process.env.GITHUB_PAGES === 'true' ? '/lastmile/' : '/',
  plugins: [tokenGateApiDevPlugin()],
});
