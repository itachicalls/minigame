import type { VercelRequest, VercelResponse } from '@vercel/node';
import { WALLET_RE } from '../lib/gateShared';
import { verifyWalletHolding } from '../lib/tokenGateServer';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const wallet = typeof req.query.wallet === 'string' ? req.query.wallet.trim() : '';
  if (!wallet) {
    res.status(400).json({ error: 'Missing wallet query parameter' });
    return;
  }
  if (!WALLET_RE.test(wallet)) {
    res.status(400).json({ error: 'Invalid Solana wallet address' });
    return;
  }

  try {
    const result = await verifyWalletHolding(wallet);
    res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Verification failed';
    res.status(500).json({ error: message });
  }
}
