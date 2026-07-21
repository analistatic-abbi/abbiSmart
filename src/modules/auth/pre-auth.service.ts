import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { hashSha256 } from '../../common/utils/crypto.util';

interface PreAuthEntry {
  usuarioId: number;
  expiresAt: number;
}

@Injectable()
export class PreAuthService {
  private readonly store = new Map<string, PreAuthEntry>();

  constructor(private readonly configService: ConfigService) {}

  createToken(usuarioId: number): string {
    const rawToken = randomBytes(32).toString('hex');
    const expiresMinutes =
      this.configService.get<number>('security.preAuthExpiresMinutes') ?? 15;

    this.store.set(hashSha256(rawToken), {
      usuarioId,
      expiresAt: Date.now() + expiresMinutes * 60 * 1000,
    });

    return rawToken;
  }

  validateToken(rawToken: string): number | null {
    const entry = this.store.get(hashSha256(rawToken));

    if (!entry) {
      return null;
    }

    if (entry.expiresAt < Date.now()) {
      this.store.delete(hashSha256(rawToken));
      return null;
    }

    return entry.usuarioId;
  }

  revokeToken(rawToken: string): void {
    this.store.delete(hashSha256(rawToken));
  }
}
