import * as bcrypt from 'bcrypt';
import { BadRequestException } from '@nestjs/common';
import {
  BCRYPT_ROUNDS,
  PASSWORD_MIN_LENGTH,
} from '../constants/auth.constants';

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, passwordHash);
}

export function assertPasswordMeetsPolicy(password: string): void {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new BadRequestException({
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
      code: 'PASSWORD_TOO_SHORT',
    });
  }
}

export async function assertNewPasswordDistinctFromCurrent(
  newPassword: string,
  currentPasswordHash: string | null,
): Promise<void> {
  if (!currentPasswordHash) {
    return;
  }
  const same = await verifyPassword(newPassword, currentPasswordHash);
  if (same) {
    throw new BadRequestException({
      message: 'New password must differ from the current password',
      code: 'PASSWORD_UNCHANGED',
    });
  }
}
