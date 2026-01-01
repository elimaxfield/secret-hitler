// Characters that are unambiguous (no 0/O, 1/I/L confusion)
const VALID_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Generate a random 6-character room code
 */
export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += VALID_CHARS.charAt(Math.floor(Math.random() * VALID_CHARS.length));
  }
  return code;
}

/**
 * Validate a room code format
 */
export function isValidRoomCode(code: string): boolean {
  if (!code || code.length !== 6) return false;
  const normalized = code.toUpperCase();
  return /^[A-Z0-9]{6}$/.test(normalized);
}

/**
 * Normalize a room code (uppercase, trimmed)
 */
export function normalizeRoomCode(code: string): string {
  return code.trim().toUpperCase();
}
