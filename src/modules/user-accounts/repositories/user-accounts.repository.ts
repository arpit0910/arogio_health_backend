import { Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { DatabaseService } from '../../../database/database.service';
import { authenticationSessions, userAccounts, type User } from '../../../database/schema';
import type { HeightUnit, WeightUnit } from '../../../common/health-measurements/measurements';

@Injectable()
export class UserAccountsRepository {
  constructor(private readonly database: DatabaseService) {}

  async softDelete(id: string) {
    return this.database.db.transaction(async (tx) => {
      const now = new Date(),
        recoverableUntil = new Date(now.getTime() + 30 * 86400000);
      const [user] = await tx
        .update(userAccounts)
        .set({ status: 'disabled', deletionRequestedAt: now, recoverableUntil, updatedAt: now })
        .where(and(eq(userAccounts.id, id), eq(userAccounts.status, 'active')))
        .returning();
      if (!user) return undefined;
      await tx
        .update(authenticationSessions)
        .set({ revokedAt: now })
        .where(and(eq(authenticationSessions.userId, id), isNull(authenticationSessions.revokedAt)));
      return {
        deletionRequestedAt: now.toISOString(),
        recoverableUntil: recoverableUntil.toISOString(),
      };
    });
  }

  async findById(id: string): Promise<User | undefined> {
    const [user] = await this.database.db.select().from(userAccounts).where(eq(userAccounts.id, id)).limit(1);
    return user;
  }

  async applyReferral(
    userId: string,
    code: string,
  ): Promise<
    | { kind: 'saved'; user: User }
    | { kind: 'unavailable' | 'closed' | 'invalid' | 'self' | 'already-set' }
  > {
    return this.database.db.transaction(async (tx) => {
      const [user] = await tx
        .select()
        .from(userAccounts)
        .where(eq(userAccounts.id, userId))
        .limit(1)
        .for('update');
      if (!user || user.status !== 'active') return { kind: 'unavailable' };
      const [referrer] = await tx.select().from(userAccounts).where(eq(userAccounts.referralCode, code)).limit(1);
      if (!referrer || referrer.status !== 'active' || !referrer.profileCompletedAt)
        return { kind: 'invalid' };
      if (user.id === referrer.id) return { kind: 'self' };
      if (user.referredByUserId === referrer.id) return { kind: 'saved', user };
      if (user.referredByUserId) return { kind: 'already-set' };
      if (user.profileCompletedAt) return { kind: 'closed' };
      const [updated] = await tx
        .update(userAccounts)
        .set({ referredByUserId: referrer.id, referredAt: new Date(), updatedAt: new Date() })
        .where(eq(userAccounts.id, userId))
        .returning();
      return { kind: 'saved', user: updated! };
    });
  }

  async updateProfile(
    id: string,
    changes: {
      profileSetup?: Record<string, unknown>;
      profileCompletedAt?: Date;
      fullName?: string;
      username?: string;
      heightValue?: number;
      heightUnit?: HeightUnit;
      weightValue?: number;
      weightUnit?: WeightUnit;
      heightCm?: number;
      weightKg?: number;
    },
  ): Promise<User | undefined> {
    const [user] = await this.database.db
      .update(userAccounts)
      .set({ ...changes, updatedAt: new Date() })
      .where(and(eq(userAccounts.id, id), eq(userAccounts.status, 'active')))
      .returning();
    return user;
  }
}
