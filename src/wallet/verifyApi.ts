import type { VerifyHoldingResult } from './gateTypes';
import { verifyHoldingClient } from './verifyClient';
import { fetchWithTimeout } from './fetchUtils';

const SERVER_TIMEOUT_MS = 8000;

function configuredApiUrl(): string | null {
  const url = import.meta.env.VITE_VERIFY_API_URL?.trim();
  return url ? url.replace(/\/$/, '') : null;
}

function devApiUrl(): string | null {
  if (import.meta.env.PROD) return null;
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  return `${base}api/verify-holding`.replace(/([^:]\/)\/+/g, '$1');
}

function looksLikeHtml(raw: string): boolean {
  const sample = raw.trim().slice(0, 64).toLowerCase();
  return sample.startsWith('<!doctype') || sample.startsWith('<html') || sample.includes('<head');
}

function isValidResult(body: unknown): body is VerifyHoldingResult {
  return (
    body != null &&
    typeof body === 'object' &&
    typeof (body as VerifyHoldingResult).message === 'string' &&
    typeof (body as VerifyHoldingResult).granted === 'boolean'
  );
}

async function fetchServerVerify(baseUrl: string, wallet: string): Promise<VerifyHoldingResult | null> {
  const joiner = baseUrl.includes('?') ? '&' : '?';
  const url = `${baseUrl}${joiner}wallet=${encodeURIComponent(wallet)}`;

  const res = await fetchWithTimeout(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    timeoutMs: SERVER_TIMEOUT_MS,
  });

  const raw = await res.text();
  if (!raw || looksLikeHtml(raw)) return null;

  let body: VerifyHoldingResult & { error?: unknown };
  try {
    body = JSON.parse(raw) as VerifyHoldingResult & { error?: unknown };
  } catch {
    return null;
  }

  if (!res.ok || !isValidResult(body)) return null;
  return body;
}

/** Server API when configured; always falls back to direct client check. */
export async function verifyHoldingApi(wallet: string): Promise<VerifyHoldingResult> {
  const serverUrl = configuredApiUrl() ?? devApiUrl();
  if (serverUrl) {
    try {
      const result = await fetchServerVerify(serverUrl, wallet);
      if (result) return result;
    } catch {
      /* fall through to client */
    }
  }

  return verifyHoldingClient(wallet);
}
