import {
  verifyHolding,
  GAME_TOKEN_MINT,
  MIN_HOLDING_USD,
  type VerifyHoldingResult,
} from './verifyCore';

export { GAME_TOKEN_MINT, MIN_HOLDING_USD, type VerifyHoldingResult };

function serverRpcUrls(): string[] {
  return [
    process.env.SOLANA_RPC_URL,
    process.env.HELIUS_RPC_URL,
    'https://solana-rpc.publicnode.com',
    'https://api.mainnet-beta.solana.com',
  ].filter((url): url is string => Boolean(url));
}

export async function verifyWalletHolding(
  wallet: string,
  mint = GAME_TOKEN_MINT,
  minUsd = MIN_HOLDING_USD
): Promise<VerifyHoldingResult> {
  return verifyHolding(wallet, serverRpcUrls(), mint, minUsd);
}
