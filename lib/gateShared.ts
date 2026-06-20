export const GAME_TOKEN_MINT = 'BzStxA5qec2FurM26CjuFcGQ1en9uKTQd2D1eiVJpump';
export const MIN_HOLDING_USD = 3;

export const WALLET_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export interface VerifyHoldingResult {
  granted: boolean;
  wallet: string;
  mint: string;
  tokenSymbol: string;
  tokenBalance: number;
  tokenPriceUsd: number | null;
  holdingUsd: number | null;
  minHoldingUsd: number;
  message: string;
}

export function assertValidWallet(wallet: string): void {
  if (!WALLET_RE.test(wallet)) {
    throw new Error('Invalid Solana wallet address');
  }
}

export function buildResult(
  wallet: string,
  mint: string,
  minUsd: number,
  quote: { priceUsd: number; symbol: string } | null,
  balance: number
): VerifyHoldingResult {
  if (!quote) {
    return {
      granted: false,
      wallet,
      mint,
      tokenSymbol: 'Mailrun',
      tokenBalance: balance,
      tokenPriceUsd: null,
      holdingUsd: null,
      minHoldingUsd: minUsd,
      message: 'Could not fetch token price. Tap Recheck.',
    };
  }

  const holdingUsd = balance * quote.priceUsd;
  const granted = holdingUsd >= minUsd;

  if (granted) {
    return {
      granted: true,
      wallet,
      mint,
      tokenSymbol: quote.symbol,
      tokenBalance: balance,
      tokenPriceUsd: quote.priceUsd,
      holdingUsd,
      minHoldingUsd: minUsd,
      message: `Access granted · ~$${holdingUsd.toFixed(2)} of $${quote.symbol}`,
    };
  }

  const needMore = Math.max(0, minUsd - holdingUsd);
  return {
    granted: false,
    wallet,
    mint,
    tokenSymbol: quote.symbol,
    tokenBalance: balance,
    tokenPriceUsd: quote.priceUsd,
    holdingUsd,
    minHoldingUsd: minUsd,
    message:
      balance > 0
        ? `Need ~$${needMore.toFixed(2)} more of $${quote.symbol} (~$${minUsd} total).`
        : `Hold at least $${minUsd} of $${quote.symbol} to play.`,
  };
}
