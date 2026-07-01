// ============================================================
//  PKCE + state/nonce generation (RFC 7636)
// ============================================================
// Runs server-side only (Node adapter), so we use Node's crypto.
import { createHash, randomBytes } from 'node:crypto';

/** A high-entropy code_verifier (43–128 chars, base64url). */
export function generateCodeVerifier(): string {
  return randomBytes(32).toString('base64url');
}

/** code_challenge = BASE64URL(SHA256(verifier)). Method is always S256. */
export function generateCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

/** Opaque random value for the OAuth `state` (CSRF) and `nonce` (replay) params. */
export function generateRandom(bytes = 16): string {
  return randomBytes(bytes).toString('base64url');
}
