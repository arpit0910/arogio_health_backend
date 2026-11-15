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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CareDirectoryAdministrationController = exports.CareDirectoryController = exports.CareDirectorySearchController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const jwt_auth_guard_1 = require("../../../common/authentication/jwt-auth.guard");
const administration_guard_1 = require("../../administration/guards/administration.guard");
const current_user_decorator_1 = require("../../../common/authentication/current-user.decorator");
const care_directory_service_1 = require("../services/care-directory.service");
const health_resources_service_1 = require("../../health-resources/services/health-resources.service");
const zod_1 = require("zod");
const common_2 = require("@nestjs/common");
let CareDirectorySearchController = class CareDirectorySearchController {
    care;
    directory;
    constructor(care, directory) {
        this.care = care;
        this.directory = directory;
    }
    async search(query) {
        const q = zod_1.z
            .object({ search: zod_1.z.string().trim().max(150).default('') })
            .strict()
            .safeParse(query);
        if (!q.success)
            throw new common_2.BadRequestException('Search must be at most 150 characters.');
        const search = q.data.search.normalize('NFC');
        const [providers, articles, bloodBanks] = await Promise.all([
            this.care.list({ search, limit: 10 }),
            this.directory.listArticles({ search, limit: 5 }),
            this.directory.listBanks({ search, limit: 5 }, false, true),
        ]);
        return { providers, articles, bloodBanks };
    }
};
exports.CareDirectorySearchController = CareDirectorySearchController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CareDirectorySearchController.prototype, "search", null);
exports.CareDirectorySearchController = CareDirectorySearchController = __decorate([
    (0, common_1.Controller)('care-search'),
    __metadata("design:paramtypes", [care_directory_service_1.CareDirectoryService,
        health_resources_service_1.HealthResourcesService])
], CareDirectorySearchController);
let CareDirectoryController = class CareDirectoryController {
    service;
    constructor(service) {
        this.service = service;
    }
    reportBank(id, body) {
        return this.service.reportBank(id, body);
    }
    list(query) {
        return this.service.list(query);
    }
    detail(id) {
        return this.service.detail(id);
    }
    report(id, body) {
        return this.service.report(id, body);
    }
};
exports.CareDirectoryController = CareDirectoryController;
__decorate([
    (0, common_1.Post)('blood-banks/:id/corrections'),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 60000 } }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CareDirectoryController.prototype, "reportBank", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CareDirectoryController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CareDirectoryController.prototype, "detail", null);
__decorate([
    (0, common_1.Post)(':id/corrections'),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 60000 } }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CareDirectoryController.prototype, "report", null);
exports.CareDirectoryController = CareDirectoryController = __decorate([
    (0, common_1.Controller)('care'),
    __metadata("design:paramtypes", [care_directory_service_1.CareDirectoryService])
], CareDirectoryController);
let CareDirectoryAdministrationController = class CareDirectoryAdministrationController {
    service;
    constructor(service) {
        this.service = service;
    }
    reviewBank(id, u, body) {
        return this.service.reviewBank(id, u.userId, body);
    }
    list(query) {
        return this.service.list(query, true);
    }
    queue() {
        return this.service.correctionQueue();
    }
    resolve(id, u, body) {
        return this.service.resolve(id, u.userId, body);
    }
    detail(id) {
        return this.service.detail(id, true);
    }
    create(u, body) {
        return this.service.save(null, u.userId, body);
    }
    save(id, u, body) {
        return this.service.save(id, u.userId, body);
    }
    review(id, u, body) {
        return this.service.review(id, u.userId, body);
    }
    affiliations(id, u, body) {
        return this.service.affiliations(id, u.userId, body);
    }
};
exports.CareDirectoryAdministrationController = CareDirectoryAdministrationController;
__decorate([
    (0, common_1.Post)('blood-banks/:id/review'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], CareDirectoryAdministrationController.prototype, "reviewBank", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CareDirectoryAdministrationController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('corrections'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CareDirectoryAdministrationController.prototype, "queue", null);
__decorate([
    (0, common_1.Patch)('corrections/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], CareDirectoryAdministrationController.prototype, "resolve", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CareDirectoryAdministrationController.prototype, "detail", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], CareDirectoryAdministrationController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], CareDirectoryAdministrationController.prototype, "save", null);
__decorate([
    (0, common_1.Post)(':id/review'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], CareDirectoryAdministrationController.prototype, "review", null);
__decorate([
    (0, common_1.Put)(':id/affiliations'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], CareDirectoryAdministrationController.prototype, "affiliations", null);
exports.CareDirectoryAdministrationController = CareDirectoryAdministrationController = __decorate([
    (0, common_1.Controller)('admin/care'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, administration_guard_1.SuperAdministratorGuard),
    __metadata("design:paramtypes", [care_directory_service_1.CareDirectoryService])
], CareDirectoryAdministrationController);
//# sourceMappingURL=care-directory.controller.js.map