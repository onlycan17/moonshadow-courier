const NICKNAME_MIN_LENGTH = 2;
const NICKNAME_MAX_LENGTH = 12;
const NICKNAME_ALLOWED_PATTERN = /^[가-힣a-zA-Z0-9]+$/;

export type NicknameValidationResult =
  | { ok: true }
  | { ok: false; reason: 'empty' | 'tooShort' | 'tooLong' | 'invalidChars' };

export function normalizeNickname(raw: string): string {
  return raw.trim().normalize('NFC');
}

export function validateNickname(nickname: string): NicknameValidationResult {
  if (nickname.length === 0) {
    return { ok: false, reason: 'empty' };
  }

  const normalizedNickname = nickname.normalize('NFC');
  const codePointLength = Array.from(normalizedNickname).length;

  if (codePointLength < NICKNAME_MIN_LENGTH) {
    return { ok: false, reason: 'tooShort' };
  }

  if (codePointLength > NICKNAME_MAX_LENGTH) {
    return { ok: false, reason: 'tooLong' };
  }

  if (!NICKNAME_ALLOWED_PATTERN.test(normalizedNickname)) {
    return { ok: false, reason: 'invalidChars' };
  }

  return { ok: true };
}
