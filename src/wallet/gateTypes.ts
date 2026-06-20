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
