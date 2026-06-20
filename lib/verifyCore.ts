import { PublicKey } from '@solana/web3.js';

export const GAME_TOKEN_MINT = 'BzStxA5qec2FurM26CjuFcGQ1en9uKTQd2D1eiVJpump';
export const MIN_HOLDING_USD = 3;

const WALLET_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

const RPC_TIMEOUT_MS = 5000;
const QUOTE_TIMEOUT_MS = 5000;
const VERIFY_TIMEOUT_MS = 12000;
const QUOTE_CACHE_MS = 45_000;

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

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number }
): Promise<Response> {
  const timeoutMs = init?.timeoutMs ?? RPC_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const { timeoutMs: _timeout, ...rest } = init ?? {};
    return await fetch(input, { ...rest, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

async function rpcCallOnce<T>(endpoint: string, method: string, params: unknown[]): Promise<T> {
  const res = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    timeoutMs: RPC_TIMEOUT_MS,
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);

  const json = (await res.json()) as { result?: T; error?: unknown };
  if (json.error) throw new Error(rpcErrorMessage(json.error));
  if (json.result === undefined) throw new Error('RPC returned no result');
  return json.result;
}

async function rpcCall<T>(rpcUrls: string[], method: string, params: unknown[]): Promise<T> {
  if (rpcUrls.length === 0) throw new Error('No RPC endpoints configured');

  const attempts = rpcUrls.map((endpoint) => rpcCallOnce<T>(endpoint, method, params));
  const results = await Promise.allSettled(attempts);

  for (const result of results) {
    if (result.status === 'fulfilled') return result.value;
  }

  const firstError = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
  throw firstError?.reason instanceof Error ? firstError.reason : new Error('Could not reach Solana');
}

function associatedTokenAddress(owner: string, mint: string): string {
  const ownerKey = new PublicKey(owner);
  const mintKey = new PublicKey(mint);
  const [address] = PublicKey.findProgramAddressSync(
    [ownerKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mintKey.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return address.toBase58();
}

function isMissingAccountError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return (
    msg.includes('could not find account') ||
    msg.includes('account not found') ||
    msg.includes('invalid param') ||
    msg.includes('-32602')
  );
}

async function getSplTokenBalance(rpcUrls: string[], owner: string, mint: string): Promise<number> {
  const ata = associatedTokenAddress(owner, mint);
  try {
    const result = await rpcCall<{ value: { uiAmount: number | null } }>(rpcUrls, 'getTokenAccountBalance', [
      ata,
    ]);
    return result.value.uiAmount ?? 0;
  } catch (err) {
    if (isMissingAccountError(err)) return 0;
    throw err;
  }
}

interface DexPair {
  priceUsd?: string;
  liquidity?: { usd?: number };
  baseToken?: { symbol?: string };
}

async function fetchTokenQuoteDex(mint: string): Promise<{ priceUsd: number; symbol: string } | null> {
  const res = await fetchWithTimeout(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
    timeoutMs: QUOTE_TIMEOUT_MS,
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
    timeoutMs: QUOTE_TIMEOUT_MS,
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

  const [dex, jupiter] = await Promise.allSettled([
    fetchTokenQuoteDex(mint),
    fetchTokenQuoteJupiter(mint),
  ]);

  const quote =
    (dex.status === 'fulfilled' ? dex.value : null) ??
    (jupiter.status === 'fulfilled' ? jupiter.value : null);

  if (quote) quoteCache = { mint, quote, at: Date.now() };
  return quote;
}

function buildResult(
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
      tokenSymbol: 'GAME',
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

async function verifyHoldingInner(
  wallet: string,
  rpcUrls: string[],
  mint: string,
  minUsd: number
): Promise<VerifyHoldingResult> {
  if (!WALLET_RE.test(wallet)) {
    throw new Error('Invalid Solana wallet address');
  }

  const [quoteResult, balanceResult] = await Promise.allSettled([
    fetchTokenQuote(mint),
    getSplTokenBalance(rpcUrls, wallet, mint),
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

  return buildResult(wallet, mint, minUsd, quote, balance);
}

export async function verifyHolding(
  wallet: string,
  rpcUrls: string[],
  mint = GAME_TOKEN_MINT,
  minUsd = MIN_HOLDING_USD
): Promise<VerifyHoldingResult> {
  return withTimeout(
    verifyHoldingInner(wallet, rpcUrls, mint, minUsd),
    VERIFY_TIMEOUT_MS,
    'Balance check timed out. Tap Recheck.'
  );
}

export const BROWSER_RPC_URLS = [
  'https://solana-rpc.publicnode.com',
  'https://api.mainnet-beta.solana.com',
];
