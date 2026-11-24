import { BadRequestException, Body, ConflictException, Controller, Get, Headers, HttpException, Logger, Param, Post, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { z } from 'zod';
import { maxDirectoryApprovalSize } from '../../../common/directory/admin-status';
import { JwtAuthGuard } from '../../../common/authentication/jwt-auth.guard';
import { CurrentUser } from '../../../common/authentication/current-user.decorator';
import type { RequestUser } from '../../../common/authentication/request-user';
import { SuperAdministratorGuard } from '../guards/administration.guard';
import { HospitalsService } from '../../hospitals/services/hospitals.service';
import { DoctorsService } from '../../doctors/services/doctors.service';
import { HealthResourcesService } from '../../health-resources/services/health-resources.service';
import { CareDirectoryService } from '../../care-directory/services/care-directory.service';

const items = z.array(z.object({ id: z.uuid(), expectedVersion: z.number().int().positive().optional(), expectedUpdatedAt: z.iso.datetime().optional() }).strict()).min(1).max(maxDirectoryApprovalSize);
const detailedBatchInput = z.object({
  items,
  reviewerName: z.string().trim().min(3).max(160), reviewerQualification: z.string().trim().min(3).max(160),
  evidence: z.string().trim().min(20).max(4000), confirmedDetails: z.literal(true),
}).strict();
const batchInput = z.union([z.object({ items }).strict(), detailedBatchInput])
  .refine(value => new Set(value.items.map(item => item.id)).size === value.items.length, 'Select each record only once.');

@Controller('admin/directory-approvals')
@UseGuards(JwtAuthGuard, SuperAdministratorGuard)
export class DirectoryApprovalsController {
  private readonly logger = new Logger(DirectoryApprovalsController.name);
  constructor(private readonly hospitals: HospitalsService, private readonly doctors: DoctorsService, private readonly banks: HealthResourcesService, private readonly care: CareDirectoryService) {}
  @Get('summary')
  async summary() {
    const [hospitals, doctors, banks] = await Promise.all([this.hospitals.list({ limit: 1 }, true), this.doctors.list({ limit: 1 }, true), this.banks.listBanks({ limit: 1 }, true)]);
    return { hospitals: hospitals.summary, doctors: doctors.summary, 'blood-banks': banks.summary };
  }
  @Post(':kind')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async approve(
    @CurrentUser() actor: RequestUser,
    @Param('kind') rawKind: string,
    @Body() body: unknown,
    @Headers('accept') accept: string | undefined,
    @Res() response: Response,
  ) {
    const parsed = batchInput.safeParse(body), kind = z.enum(['hospitals', 'doctors', 'blood-banks']).safeParse(rawKind);
    if (!parsed.success || !kind.success) throw new BadRequestException(parsed.success ? 'Choose hospitals, doctors or blood banks.' : parsed.error.issues.map(issue => issue.message).join('; '));
    const { items, ...review } = 'reviewerName' in parsed.data ? parsed.data : {
      items: parsed.data.items,
      reviewerName: 'Signed-in administrator',
      reviewerQualification: 'Super administrator',
      evidence: 'Listing details approved by the signed-in administrator.',
      confirmedDetails: true,
    };
    if (items.some(item => kind.data === 'blood-banks' ? !item.expectedUpdatedAt || item.expectedVersion !== undefined : !item.expectedVersion || item.expectedUpdatedAt !== undefined)) throw new BadRequestException('Refresh the list and select records with their current version.');
    const stream = accept?.split(',').some((type) => type.trim() === 'application/x-ndjson');
    if (stream) {
      response.status(201).set({
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Cache-Control': 'no-store, no-transform',
        'X-Accel-Buffering': 'no',
      });
      response.flushHeaders();
    }
    const writeProgress = (event: object) => {
      if (stream && !response.destroyed && !response.writableEnded) {
        response.write(`${JSON.stringify(event)}\n`);
      }
    };
    const results: { id: string; name: string; status: 'approved' | 'failed'; message: string }[] = [];
    let approved = 0;
    for (const item of items) {
      let name = item.id;
      try {
        if (kind.data === 'hospitals') {
          const row = await this.hospitals.detail(item.id, true); name = row.name_en;
          if (!row.listed) throw new ConflictException('Inactive hospital. Use Show in app before approving.');
          await this.hospitals.review(actor.userId, item.id, { ...review, expectedVersion: item.expectedVersion, publish: true });
        } else if (kind.data === 'doctors') {
          const row = await this.doctors.detail(item.id, true); name = row.name_en;
          if (!row.published && row.reviewedAt) throw new ConflictException('Withdrawn doctor. Review and restore this record individually.');
          await this.doctors.review(actor.userId, item.id, { ...review, expectedVersion: item.expectedVersion, publish: true });
        } else {
          const row = await this.banks.bank(item.id); name = row.name_en;
          if (!row.is_active) throw new ConflictException('Inactive blood bank. Activate this record before approving.');
          await this.care.reviewBank(item.id, actor.userId, { ...review, expectedUpdatedAt: item.expectedUpdatedAt, publish: true }, true);
        }
        results.push({ id: item.id, name, status: 'approved', message: 'Approval recorded.' });
        approved++;
      } catch (error) {
        let message = 'Approval could not be completed. Refresh and try again.';
        if (error instanceof HttpException) {
          const response = error.getResponse();
          message = typeof response === 'string' ? response : error.message;
        } else this.logger.error('Unexpected failure while approving a directory record.');
        results.push({ id: item.id, name, status: 'failed', message });
      }
      writeProgress({ type: 'progress', processed: results.length, approved, failed: results.length - approved });
    }
    const result = { approved, failed: results.length - approved, results };
    if (stream) {
      writeProgress({ type: 'complete', ...result });
      if (!response.destroyed) response.end();
    } else {
      response.status(201).json(result);
    }
  }
}
