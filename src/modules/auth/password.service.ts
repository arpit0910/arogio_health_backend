import { Injectable } from '@nestjs/common';
import { Algorithm, hash, verify } from '@node-rs/argon2';

const HASH_OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const;

@Injectable()
export class PasswordService {
  private readonly dummyHash = hash('not-a-real-user-password', HASH_OPTIONS);

  hash(password: string): Promise<string> {
    return hash(password, HASH_OPTIONS);
  }

  async verify(passwordHash: string | null | undefined, password: string): Promise<boolean> {
    const valid = await verify(passwordHash ?? (await this.dummyHash), password);
    return Boolean(passwordHash) && valid;
  }
}
