/**
 * Format Expo Push Token (ExponentPushToken[…]).
 * Refuse les chaînes vides / junk avant INSERT (S10 / P2-5).
 */
const EXPO_PUSH_TOKEN_RE = /^ExponentPushToken\[[^\s\[\]]+\]$/;

export function isExpoPushToken(token: string): boolean {
  return EXPO_PUSH_TOKEN_RE.test(token);
}
