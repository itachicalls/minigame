export interface WalletPublicKey {
  toBase58(): string;
  toString(): string;
}

export interface SolanaWalletProvider {
  isPhantom?: boolean;
  isSolflare?: boolean;
  isConnected?: boolean;
  publicKey: WalletPublicKey | null;
  connect(opts?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: WalletPublicKey }>;
  disconnect(): Promise<void>;
  on?(event: 'disconnect' | 'accountChanged', handler: (...args: unknown[]) => void): void;
  removeListener?(
    event: 'disconnect' | 'accountChanged',
    handler: (...args: unknown[]) => void
  ): void;
}

declare global {
  interface Window {
    solana?: SolanaWalletProvider;
    solflare?: SolanaWalletProvider;
  }
}

export function getWalletProvider(): SolanaWalletProvider | null {
  if (window.solana?.connect) return window.solana;
  if (window.solflare?.connect) return window.solflare;
  return null;
}

export function walletAddress(provider: SolanaWalletProvider): string | null {
  const key = provider.publicKey;
  if (!key) return null;
  return typeof key.toBase58 === 'function' ? key.toBase58() : key.toString();
}
