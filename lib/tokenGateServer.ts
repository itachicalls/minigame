import { FETCH_TIMEOUT_MS, fetchWithTimeout, withTimeout } from './fetchUtils';

export const GAME_TOKEN_MINT = 'BzStxA5qec2FurM26CjuFcGQ1en9uKTQd2D1eiVJpump';
export const MIN_HOLDING_USD = 3;

const WALLET_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const QUOTE_CACHE_MS = 45_000;

const RPC_URLS = [
  process.env.SOLANA_RPC_URL,
  process.env.HELIUS_RPC_URL,
  'https://solana-rpc.publicnode.com',
  'https://api.mainnet-beta.solana.com',
  'https://rpc.ankr.com/solana',
].filter((url): url is string => Boolean(url));

let quoteCache: {
  mint: string;
  quote: { priceUsd: number; symbol: string };
  at: number;
} | null = null;

function rpcErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const record = error as { message?: unknown };
    if (typeof record.message === 'string') return record.message;
    if (record.message != null) return JSON.stringify(record.message);
    return JSON.stringify(error);
  }
  return 'RPC request failed';
}

async function rpcCallOnce<T>(endpoint: string, method: string, params: unknown[]): Promise<T> {
  const res = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    timeoutMs: FETCH_TIMEOUT_MS,
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);

  const json = (await res.json()) as { result?: T; error?: unknown };
  if (json.error) throw new Error(rpcErrorMessage(json.error));
  if (json.result === undefined) throw new Error('RPC returned no result');
  return json.result;
}

async function rpcCall<T>(method: string, params: unknown[]): Promise<T> {
  const attempts = RPC_URLS.map((endpoint) => rpcCallOnce<T>(endpoint, method, params));
  const results = await Promise.allSettled(attempts);

  for (const result of results) {
    if (result.status === 'fulfilled') return result.value;
  }

  const firstError = results.find((r) => r.status === 'rejected') as
    | PromiseRejectedResult
    | undefined;
  throw firstError?.reason instanceof Error
    ? firstError.reason
    : new Error('Could not reach Solana RPC');
}

interface ParsedTokenAccount {
  account: {
    data: {
      parsed: {
        info: {
          tokenAmount: { uiAmount: number | null };
        };
      };
    };
  };
}

async function getSplTokenBalance(owner: string, mint: string): Promise<number> {
  const result = await rpcCall<{ value: ParsedTokenAccount[] }>('getTokenAccountsByOwner', [
    owner,
    { mint },
    { encoding: 'jsonParsed' },
  ]);

  return result.value.reduce((sum, entry) => {
    return sum + (entry.account.data.parsed.info.tokenAmount.uiAmount ?? 0);
  }, 0);
}

interface DexPair {
  priceUsd?: string;
  liquidity?: { usd?: number };
  baseToken?: { symbol?: string };
}

async function fetchTokenQuoteDex(mint: string): Promise<{ priceUsd: number; symbol: string } | null> {
  const res = await fetchWithTimeout(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
    timeoutMs: FETCH_TIMEOUT_MS,
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { pairs?: DexPair[] | null };
  const pairs = [...(data.pairs ?? [])].sort(
    (a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0)
  );
  const best = pairs[0];
  if (!best?.priceUsd) return null;

  const priceUsd = Number.parseFloat(best.priceUsd);
  if (!Number.isFinite(priceUsd) || priceUsd <= 0) return null;

  return {
    priceUsd,
    symbol: best.baseToken?.symbol?.trim() || 'GAME',
  };
}

async function fetchTokenQuoteJupiter(mint: string): Promise<{ priceUsd: number; symbol: string } | null> {
  const res = await fetchWithTimeout(`https://api.jup.ag/price/v2?ids=${mint}`, {
    timeoutMs: FETCH_TIMEOUT_MS,
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    data?: Record<string, { price?: number | string; symbol?: string } | undefined>;
  };
  const entry = data.data?.[mint];
  if (!entry?.price) return null;

  const priceUsd = typeof entry.price === 'string' ? Number.parseFloat(entry.price) : entry.price;
  if (!Number.isFinite(priceUsd) || priceUsd <= 0) return null;

  return {
    priceUsd,
    symbol: entry.symbol?.trim() || 'GAME',
  };
}

async function fetchTokenQuote(mint: string): Promise<{ priceUsd: number; symbol: string } | null> {
  const cached = quoteCache;
  if (cached && cached.mint === mint && Date.now() - cached.at < QUOTE_CACHE_MS) {
    return cached.quote;
  }

  const quote =
    (await fetchTokenQuoteDex(mint)) ?? (await fetchTokenQuoteJupiter(mint));
  if (quote) quoteCache = { mint, quote, at: Date.now() };
  return quote;
}

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

function buildResult(
  wallet: string,
  quote: { priceUsd: number; symbol: string } | null,
  balance: number
): VerifyHoldingResult {
  if (!quote) {
    return {
      granted: false,
      wallet,
      mint: GAME_TOKEN_MINT,
      tokenSymbol: 'GAME',
      tokenBalance: balance,
      tokenPriceUsd: null,
      holdingUsd: null,
      minHoldingUsd: MIN_HOLDING_USD,
      message: 'Could not fetch token price. Try again.',
    };
  }

  const holdingUsd = balance * quote.priceUsd;
  const granted = holdingUsd >= MIN_HOLDING_USD;

  if (granted) {
    return {
      granted: true,
      wallet,
      mint: GAME_TOKEN_MINT,
      tokenSymbol: quote.symbol,
      tokenBalance: balance,
      tokenPriceUsd: quote.priceUsd,
      holdingUsd,
      minHoldingUsd: MIN_HOLDING_USD,
      message: `Access granted · ~$${holdingUsd.toFixed(2)} of $${quote.symbol}`,
    };
  }

  const needMore = Math.max(0, MIN_HOLDING_USD - holdingUsd);
  return {
    granted: false,
    wallet,
    mint: GAME_TOKEN_MINT,
    tokenSymbol: quote.symbol,
    tokenBalance: balance,
    tokenPriceUsd: quote.priceUsd,
    holdingUsd,
    minHoldingUsd: MIN_HOLDING_USD,
    message:
      balance > 0
        ? `Need ~$${needMore.toFixed(2)} more of $${quote.symbol} (~$${MIN_HOLDING_USD} total).`
        : `Hold at least $${MIN_HOLDING_USD} of $${quote.symbol} to play.`,
  };
}

async function verifyWalletHoldingInner(
  wallet: string,
  mint = GAME_TOKEN_MINT,
  minUsd = MIN_HOLDING_USD
): Promise<VerifyHoldingResult> {
  if (!WALLET_RE.test(wallet)) {
    throw new Error('Invalid Solana wallet address');
  }

  const [quoteResult, balanceResult] = await Promise.allSettled([
    fetchTokenQuote(mint),
    getSplTokenBalance(wallet, mint),
  ]);

  const quote = quoteResult.status === 'fulfilled' ? quoteResult.value : null;
  const balance = balanceResult.status === 'fulfilled' ? balanceResult.value : 0;

  if (balanceResult.status === 'rejected' && quoteResult.status === 'rejected') {
    throw balanceResult.reason instanceof Error
      ? balanceResult.reason
      : new Error('Verification failed');
  }

  if (balanceResult.status === 'rejected') {
    throw balanceResult.reason instanceof Error
      ? balanceResult.reason
      : new Error('Could not read wallet balance');
  }

  const result = buildResult(wallet, quote, balance);
  result.minHoldingUsd = minUsd;
  return result;
}

export async function verifyWalletHolding(
  wallet: string,
  mint = GAME_TOKEN_MINT,
  minUsd = MIN_HOLDING_USD
): Promise<VerifyHoldingResult> {
  return withTimeout(
    verifyWalletHoldingInner(wallet, mint, minUsd),
    20000,
    'Verification timed out'
  );
}
