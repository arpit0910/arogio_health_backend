import { isUniqueViolation } from '../../common/errors/database-error';
import { Injectable } from '@nestjs/common';
import { and, eq, isNull, type InferInsertModel } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { authIdentities, authSessions, users, type User } from '../../database/schema';
import type { HeightUnit, WeightUnit } from '../../common/health/measurements';

type NewSession = InferInsertModel<typeof authSessions> & {
  id: string;
  userId: string;
  familyId: string;
};

export type RotationResult =
  | { kind: 'rotated'; userId: string; sessionId: string }
  | { kind: 'invalid' | 'expired' | 'reused' | 'disabled' };

@Injectable()
export class AuthRepository {
  constructor(private readonly database: DatabaseService) {}

  async findUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.database.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return user;
  }

  async findUserByReferralCode(code: string): Promise<User | undefined> {
    const [user] = await this.database.db
      .select()
      .from(users)
      .where(eq(users.referralCode, code))
      .limit(1);
    return user;
  }

  private async retryReferralCollision<T>(action: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await action();
      } catch (error) {
        if (attempt >= 4 || !isUniqueViolation(error, 'users_referral_code_unique')) throw error;
      }
    }
  }

  async findUserById(id: string): Promise<User | undefined> {
    const [user] = await this.database.db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async createPasswordUser(input: {
    email: string;
    passwordHash: string;
    referredByUserId?: string;
    fullName?: string;
    heightValue?: number;
    heightUnit?: HeightUnit;
    weightValue?: number;
    weightUnit?: WeightUnit;
    heightCm?: number;
    weightKg?: number;
  }): Promise<User> {
    const [user] = await this.retryReferralCollision(() =>
      this.database.db
        .insert(users)
        .values({
          referredByUserId: input.referredByUserId,
          referredAt: input.referredByUserId ? new Date() : undefined,
          email: input.email,
          passwordHash: input.passwordHash,
          fullName: input.fullName,
          heightValue: input.heightValue,
          heightUnit: input.heightUnit,
          weightValue: input.weightValue,
          weightUnit: input.weightUnit,
          heightCm: input.heightCm,
          weightKg: input.weightKg,
        })
        .returning(),
    );
    if (!user) throw new Error('User insert returned no row');
    return user;
  }

  async findGoogleUser(subject: string): Promise<User | undefined> {
    const [result] = await this.database.db
      .select({ user: users })
      .from(authIdentities)
      .innerJoin(users, eq(authIdentities.userId, users.id))
      .where(
        and(eq(authIdentities.provider, 'google'), eq(authIdentities.providerSubject, subject)),
      )
      .limit(1);
    return result?.user;
  }

  async createGoogleUser(input: {
    subject: string;
    referredByUserId?: string;
    email: string | null;
    fullName: string | null;
    emailVerified: boolean;
  }): Promise<User> {
    try {
      return await this.retryReferralCollision(() =>
        this.database.db.transaction(async (tx) => {
          const [user] = await tx
            .insert(users)
            .values({
              referredByUserId: input.referredByUserId,
              referredAt: input.referredByUserId ? new Date() : undefined,
              email: input.email,
              fullName: input.fullName,
              emailVerifiedAt: input.emailVerified && input.email ? new Date() : null,
            })
            .returning();
          if (!user) throw new Error('Google user insert returned no row');
          await tx.insert(authIdentities).values({
            userId: user.id,
            provider: 'google',
            providerSubject: input.subject,
            providerEmail: input.email,
          });
          return user;
        }),
      );
    } catch (error) {
      const existing = await this.findGoogleUser(input.subject);
      if (existing) return existing;
      throw error;
    }
  }

  async createSession(session: NewSession): Promise<void> {
    await this.database.db.insert(authSessions).values(session);
  }

  async rotateSession(input: {
    currentTokenHash: string;
    replacement: NewSession;
    now: Date;
  }): Promise<RotationResult> {
    return this.database.db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(authSessions)
        .where(eq(authSessions.tokenHash, input.currentTokenHash))
        .limit(1)
        .for('update');

      if (!current) return { kind: 'invalid' };

      if (current.revokedAt) {
        await tx
          .update(authSessions)
          .set({ revokedAt: input.now })
          .where(and(eq(authSessions.familyId, current.familyId), isNull(authSessions.revokedAt)));
        return { kind: 'reused' };
      }

      if (current.expiresAt <= input.now) {
        await tx
          .update(authSessions)
          .set({ revokedAt: input.now, lastUsedAt: input.now })
          .where(eq(authSessions.id, current.id));
        return { kind: 'expired' };
      }

      const [user] = await tx.select().from(users).where(eq(users.id, current.userId)).limit(1);
      if (!user || user.status !== 'active') {
        await tx
          .update(authSessions)
          .set({ revokedAt: input.now })
          .where(and(eq(authSessions.familyId, current.familyId), isNull(authSessions.revokedAt)));
        return { kind: 'disabled' };
      }

      await tx.insert(authSessions).values({
        ...input.replacement,
        userId: current.userId,
        familyId: current.familyId,
      });
      await tx
        .update(authSessions)
        .set({
          revokedAt: input.now,
          lastUsedAt: input.now,
          replacedBySessionId: input.replacement.id,
        })
        .where(eq(authSessions.id, current.id));
      return { kind: 'rotated', userId: current.userId, sessionId: input.replacement.id };
    });
  }

  async revokeSession(tokenHash: string, now: Date): Promise<void> {
    await this.database.db
      .update(authSessions)
      .set({ revokedAt: now, lastUsedAt: now })
      .where(and(eq(authSessions.tokenHash, tokenHash), isNull(authSessions.revokedAt)));
  }
}
