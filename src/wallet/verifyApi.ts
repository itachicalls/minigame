import type { VerifyHoldingResult } from './gateTypes';
import { verifyHoldingClient } from './verifyClient';
import { fetchWithTimeout } from './fetchUtils';
import { VERIFY_API_URLS } from './config';

const SERVER_TIMEOUT_MS = 6000;

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

function verifyApiUrls(): string[] {
  const urls = new Set<string>();
  for (const url of VERIFY_API_URLS) {
    if (url) urls.add(url.replace(/\/$/, ''));
  }
  const dev = devApiUrl();
  if (dev) urls.add(dev);
  return [...urls];
}

function firstSuccessful<T>(tasks: Array<() => Promise<T>>): Promise<T> {
  return new Promise((resolve, reject) => {
    if (tasks.length === 0) {
      reject(new Error('No verification paths available'));
      return;
    }

    let failures = 0;
    let lastError: unknown;

    for (const task of tasks) {
      task().then(
        (value) => resolve(value),
        (err) => {
          lastError = err;
          failures += 1;
          if (failures === tasks.length) {
            reject(lastError instanceof Error ? lastError : new Error('Verification failed'));
          }
        }
      );
    }
  });
}

/** Race server APIs and direct client check — first success wins. */
export async function verifyHoldingApi(wallet: string): Promise<VerifyHoldingResult> {
  const serverUrls = verifyApiUrls();
  const tasks: Array<() => Promise<VerifyHoldingResult>> = serverUrls.map(
    (url) => () =>
      fetchServerVerify(url, wallet).then((result) => {
        if (result) return result;
        throw new Error('Server returned invalid response');
      })
  );
  tasks.push(() => verifyHoldingClient(wallet));

  return firstSuccessful(tasks);
}
