import type { VerifyHoldingResult } from './gateTypes';

function verifyApiUrl(wallet: string): string {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  return `${base}api/verify-holding?wallet=${encodeURIComponent(wallet)}`;
}

export async function verifyHoldingApi(wallet: string): Promise<VerifyHoldingResult> {
  const res = await fetch(verifyApiUrl(wallet), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  const body = (await res.json().catch(() => ({}))) as VerifyHoldingResult & { error?: string };
  if (!res.ok) {
    throw new Error(body.error || `Verification API HTTP ${res.status}`);
  }
  return body;
}
