import { GAME_TOKEN_MINT, MIN_HOLDING_USD, verifyHolding, BROWSER_RPC_URLS } from '../../lib/verifyCore';
import type { VerifyHoldingResult } from '../../lib/verifyCore';

export type { VerifyHoldingResult };

export async function verifyHoldingClient(wallet: string): Promise<VerifyHoldingResult> {
  return verifyHolding(wallet, BROWSER_RPC_URLS, GAME_TOKEN_MINT, MIN_HOLDING_USD);
}
