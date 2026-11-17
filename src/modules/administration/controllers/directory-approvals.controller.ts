import { BadRequestException, Body, ConflictException, Controller, Get, HttpException, Logger, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { JwtAuthGuard } from '../../../common/authentication/jwt-auth.guard';
import { CurrentUser } from '../../../common/authentication/current-user.decorator';
import type { RequestUser } from '../../../common/authentication/request-user';
import { SuperAdministratorGuard } from '../guards/administration.guard';
import { HospitalsService } from '../../hospitals/services/hospitals.service';
import { DoctorsService } from '../../doctors/services/doctors.service';
import { HealthResourcesService } from '../../health-resources/services/health-resources.service';
import { CareDirectoryService } from '../../care-directory/services/care-directory.service';

const batchInput = z.object({
  items: z.array(z.object({ id: z.uuid(), expectedVersion: z.number().int().positive().optional(), expectedUpdatedAt: z.iso.datetime().optional() }).strict()).min(1).max(100),
  reviewerName: z.string().trim().min(3).max(160), reviewerQualification: z.string().trim().min(3).max(160),
  evidence: z.string().trim().min(20).max(4000), confirmedSource: z.literal(true),
  sourceUrl: z.url().max(2000).refine(value => { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; }).optional(),
}).strict().refine(value => new Set(value.items.map(item => item.id)).size === value.items.length, 'Select each record only once.');

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
  async approve(@CurrentUser() actor: RequestUser, @Param('kind') rawKind: string, @Body() body: unknown) {
    const parsed = batchInput.safeParse(body), kind = z.enum(['hospitals', 'doctors', 'blood-banks']).safeParse(rawKind);
    if (!parsed.success || !kind.success) throw new BadRequestException(parsed.success ? 'Choose hospitals, doctors or blood banks.' : parsed.error.issues.map(issue => issue.message).join('; '));
    const { items, sourceUrl, ...review } = parsed.data;
    if (items.some(item => kind.data === 'blood-banks' ? !item.expectedUpdatedAt || item.expectedVersion !== undefined : !item.expectedVersion || item.expectedUpdatedAt !== undefined)) throw new BadRequestException('Refresh the list and select records with their current version.');
    const results: { id: string; name: string; status: 'approved' | 'failed'; message: string }[] = [];
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
          if (!sourceUrl && !row.source_url) throw new BadRequestException('Add a shared HTTPS source URL or save a source URL on this blood bank before approval.');
          await this.care.reviewBank(item.id, actor.userId, { ...review, expectedUpdatedAt: item.expectedUpdatedAt, publish: true, sourceUrl: sourceUrl ?? row.source_url }, true);
        }
        results.push({ id: item.id, name, status: 'approved', message: 'Approved and source review recorded.' });
      } catch (error) {
        let message = 'Approval could not be completed. Refresh and try again.';
        if (error instanceof HttpException) {
          const response = error.getResponse();
          message = typeof response === 'string' ? response : error.message;
        } else this.logger.error('Unexpected failure while approving a directory record.');
        results.push({ id: item.id, name, status: 'failed', message });
      }
    }
    return { approved: results.filter(item => item.status === 'approved').length, failed: results.filter(item => item.status === 'failed').length, results };
  }
}
