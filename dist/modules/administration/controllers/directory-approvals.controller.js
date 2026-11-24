"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DirectoryApprovalsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DirectoryApprovalsController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const zod_1 = require("zod");
const admin_status_1 = require("../../../common/directory/admin-status");
const jwt_auth_guard_1 = require("../../../common/authentication/jwt-auth.guard");
const current_user_decorator_1 = require("../../../common/authentication/current-user.decorator");
const administration_guard_1 = require("../guards/administration.guard");
const hospitals_service_1 = require("../../hospitals/services/hospitals.service");
const doctors_service_1 = require("../../doctors/services/doctors.service");
const health_resources_service_1 = require("../../health-resources/services/health-resources.service");
const care_directory_service_1 = require("../../care-directory/services/care-directory.service");
const items = zod_1.z.array(zod_1.z.object({ id: zod_1.z.uuid(), expectedVersion: zod_1.z.number().int().positive().optional(), expectedUpdatedAt: zod_1.z.iso.datetime().optional() }).strict()).min(1).max(admin_status_1.maxDirectoryApprovalSize);
const detailedBatchInput = zod_1.z.object({
    items,
    reviewerName: zod_1.z.string().trim().min(3).max(160), reviewerQualification: zod_1.z.string().trim().min(3).max(160),
    evidence: zod_1.z.string().trim().min(20).max(4000), confirmedSource: zod_1.z.literal(true),
    sourceUrl: zod_1.z.url().max(2000).refine(value => { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; }).optional(),
}).strict();
const batchInput = zod_1.z.union([zod_1.z.object({ items }).strict(), detailedBatchInput])
    .refine(value => new Set(value.items.map(item => item.id)).size === value.items.length, 'Select each record only once.');
let DirectoryApprovalsController = DirectoryApprovalsController_1 = class DirectoryApprovalsController {
    hospitals;
    doctors;
    banks;
    care;
    logger = new common_1.Logger(DirectoryApprovalsController_1.name);
    constructor(hospitals, doctors, banks, care) {
        this.hospitals = hospitals;
        this.doctors = doctors;
        this.banks = banks;
        this.care = care;
    }
    async summary() {
        const [hospitals, doctors, banks] = await Promise.all([this.hospitals.list({ limit: 1 }, true), this.doctors.list({ limit: 1 }, true), this.banks.listBanks({ limit: 1 }, true)]);
        return { hospitals: hospitals.summary, doctors: doctors.summary, 'blood-banks': banks.summary };
    }
    async approve(actor, rawKind, body, accept, response) {
        // Keep the legacy shared-hosting artifact compatible with source-free bank reviews.
        if (rawKind === 'blood-banks' && body && typeof body === 'object' && !Array.isArray(body)) {
            const { sourceUrl, confirmedDetails, ...bankRequest } = body;
            body = confirmedDetails === true ? { ...bankRequest, confirmedSource: true } : bankRequest;
        }
        const parsed = batchInput.safeParse(body), kind = zod_1.z.enum(['hospitals', 'doctors', 'blood-banks', 'articles']).safeParse(rawKind);
        if (!parsed.success || !kind.success)
            throw new common_1.BadRequestException(parsed.success ? 'Choose articles, hospitals, doctors or blood banks.' : parsed.error.issues.map(issue => issue.message).join('; '));
        const { items, sourceUrl, ...review } = 'reviewerName' in parsed.data ? parsed.data : {
            items: parsed.data.items,
            sourceUrl: undefined,
            reviewerName: 'Signed-in administrator',
            reviewerQualification: 'Super administrator',
            evidence: rawKind === 'blood-banks' ? 'Listing details approved by the signed-in administrator.' : 'Approved using the directory record and its saved source.',
            confirmedSource: true,
        };
        const timestamped = kind.data === 'blood-banks' || kind.data === 'articles';
        if (items.some(item => timestamped ? !item.expectedUpdatedAt || item.expectedVersion !== undefined : !item.expectedVersion || item.expectedUpdatedAt !== undefined))
            throw new common_1.BadRequestException('Refresh the list and select records with their current version.');
        const stream = accept?.split(',').some(type => type.trim() === 'application/x-ndjson');
        if (stream) {
            response.status(201).set({
                'Content-Type': 'application/x-ndjson; charset=utf-8',
                'Cache-Control': 'no-store, no-transform',
                'X-Accel-Buffering': 'no',
            });
            response.flushHeaders();
        }
        const writeProgress = (event) => {
            if (stream && !response.destroyed && !response.writableEnded)
                response.write(`${JSON.stringify(event)}\n`);
        };
        const results = [];
        let approved = 0;
        for (const item of items) {
            let name = item.id;
            try {
                if (kind.data === 'hospitals') {
                    const row = await this.hospitals.detail(item.id, true);
                    name = row.name_en;
                    if (!row.listed)
                        throw new common_1.ConflictException('Inactive hospital. Use Show in app before approving.');
                    await this.hospitals.review(actor.userId, item.id, { ...review, expectedVersion: item.expectedVersion, publish: true });
                }
                else if (kind.data === 'doctors') {
                    const row = await this.doctors.detail(item.id, true);
                    name = row.name_en;
                    if (!row.published && row.reviewedAt)
                        throw new common_1.ConflictException('Withdrawn doctor. Review and restore this record individually.');
                    await this.doctors.review(actor.userId, item.id, { ...review, expectedVersion: item.expectedVersion, publish: true });
                }
                else if (kind.data === 'blood-banks') {
                    const row = await this.banks.bank(item.id);
                    name = row.name_en;
                    if (!row.is_active)
                        throw new common_1.ConflictException('Inactive blood bank. Activate this record before approving.');
                    await this.care.reviewBank(item.id, actor.userId, { ...review, expectedUpdatedAt: item.expectedUpdatedAt, publish: true }, true);
                }
                else {
                    const row = await this.banks.setArticleVisibility(item.id, { visible: true, expectedUpdatedAt: item.expectedUpdatedAt }, actor.userId);
                    name = row.title;
                }
                results.push({ id: item.id, name, status: 'approved', message: kind.data === 'articles' ? 'Article is published.' : 'Approval recorded.' });
                approved++;
            }
            catch (error) {
                let message = 'Approval could not be completed. Refresh and try again.';
                if (error instanceof common_1.HttpException) {
                    const response = error.getResponse();
                    message = typeof response === 'string' ? response : error.message;
                }
                else
                    this.logger.error('Unexpected failure while approving a directory record.');
                results.push({ id: item.id, name, status: 'failed', message });
            }
            writeProgress({ type: 'progress', processed: results.length, approved, failed: results.length - approved });
        }
        const result = { approved, failed: results.length - approved, results };
        if (stream) {
            writeProgress({ type: 'complete', ...result });
            if (!response.destroyed)
                response.end();
        }
        else {
            response.status(201).json(result);
        }
    }
};
exports.DirectoryApprovalsController = DirectoryApprovalsController;
__decorate([
    (0, common_1.Get)('summary'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DirectoryApprovalsController.prototype, "summary", null);
__decorate([
    (0, common_1.Post)(':kind'),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 60000 } }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('kind')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Headers)('accept')),
    __param(4, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, String, Object]),
    __metadata("design:returntype", Promise)
], DirectoryApprovalsController.prototype, "approve", null);
exports.DirectoryApprovalsController = DirectoryApprovalsController = DirectoryApprovalsController_1 = __decorate([
    (0, common_1.Controller)('admin/directory-approvals'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, administration_guard_1.SuperAdministratorGuard),
    __metadata("design:paramtypes", [hospitals_service_1.HospitalsService, doctors_service_1.DoctorsService, health_resources_service_1.HealthResourcesService, care_directory_service_1.CareDirectoryService])
], DirectoryApprovalsController);
//# sourceMappingURL=directory-approvals.controller.js.map
