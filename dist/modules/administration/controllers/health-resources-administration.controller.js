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
exports.HealthResourcesAdministrationController = void 0;
const provider_image_1 = require("../../../common/media/provider-image");
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const jwt_auth_guard_1 = require("../../../common/authentication/jwt-auth.guard");
const current_user_decorator_1 = require("../../../common/authentication/current-user.decorator");
const health_resources_service_1 = require("../../health-resources/services/health-resources.service");
const administration_guard_1 = require("../guards/administration.guard");
const administration_service_1 = require("../services/administration.service");
const exceljs_1 = require("exceljs");
const import_1 = require("../../health-resources/imports/import");
const upload = (0, platform_express_1.FileInterceptor)('file', {
    limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 0 },
});
let HealthResourcesAdministrationController = class HealthResourcesAdministrationController {
    directory;
    audit;
    constructor(directory, audit) {
        this.directory = directory;
        this.audit = audit;
    }
    categories() {
        return this.directory.categories(true);
    }
    saveCategory(user, body) {
        return this.audit.audit(user.userId, 'article-category.save', null, () => this.directory.saveCategory(body));
    }
    list(kind, query) {
        return this.directory.adminList(this.directory.kind(kind), query);
    }
    async template(kind, response) {
        const type = this.directory.kind(kind), headers = type === 'articles' ? import_1.articleHeaders : import_1.bankHeaders;
        const workbook = new exceljs_1.Workbook(), sheet = workbook.addWorksheet(type === 'articles' ? 'Articles' : 'Blood banks');
        sheet.columns = headers.map((header) => ({
            header,
            key: header,
            width: /content|address/.test(header) ? 48 : 24,
            style: { numFmt: '@' },
        }));
        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF126349' } };
        sheet.views = [{ state: 'frozen', ySplit: 1 }];
        response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        response.setHeader('Content-Disposition', `attachment; filename="${type}-template.xlsx"`);
        response.setHeader('Cache-Control', 'private, no-store');
        response.send(Buffer.from(await workbook.xlsx.writeBuffer()));
    }
    async thumbnail(id, response) {
        (0, provider_image_1.sendProviderImage)(response, await this.directory.articleThumbnail(id, true));
    }
    articleVisibility(user, id, body) {
        return this.directory.setArticleVisibility(id, body, user.userId);
    }
    bloodBankVisibility(user, id, body) {
        return this.directory.setBloodBankVisibility(id, body, user.userId);
    }
    uploadThumbnail(user, id, file) {
        return this.audit.audit(user.userId, 'articles.thumbnail.upload', id, () => this.directory.saveArticleThumbnail(id, file));
    }
    deleteThumbnail(user, id) {
        return this.audit.audit(user.userId, 'articles.thumbnail.remove', id, () => this.directory.removeArticleThumbnail(id));
    }
    get(kind, id) {
        return this.directory.kind(kind) === 'articles'
            ? this.directory.article(id, true)
            : this.directory.bank(id);
    }
    preview(kind, file) {
        return this.directory.preview(this.directory.kind(kind), file);
    }
    import(user, kind, file) {
        const type = this.directory.kind(kind);
        return this.audit.audit(user.userId, `${type}.import`, null, () => this.directory.import(type, file));
    }
    create(user, kind, body) {
        const type = this.directory.kind(kind);
        return this.audit.audit(user.userId, `${type}.create`, null, () => this.directory.save(type, null, body));
    }
    update(user, kind, id, body) {
        const type = this.directory.kind(kind);
        return this.audit.audit(user.userId, `${type}.update`, id, () => this.directory.save(type, id, body));
    }
    remove(user, kind, id) {
        const type = this.directory.kind(kind);
        return this.audit.audit(user.userId, `${type}.delete`, id, () => this.directory.remove(type, id));
    }
};
exports.HealthResourcesAdministrationController = HealthResourcesAdministrationController;
__decorate([
    (0, common_1.Get)('article-categories'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthResourcesAdministrationController.prototype, "categories", null);
__decorate([
    (0, common_1.Post)('article-categories'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], HealthResourcesAdministrationController.prototype, "saveCategory", null);
__decorate([
    (0, common_1.Get)(':kind'),
    __param(0, (0, common_1.Param)('kind')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], HealthResourcesAdministrationController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':kind/template'),
    __param(0, (0, common_1.Param)('kind')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], HealthResourcesAdministrationController.prototype, "template", null);
__decorate([
    (0, common_1.Get)('articles/:id/thumbnail'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], HealthResourcesAdministrationController.prototype, "thumbnail", null);
__decorate([
    (0, common_1.Patch)('articles/:id/visibility'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], HealthResourcesAdministrationController.prototype, "articleVisibility", null);
__decorate([
    (0, common_1.Patch)('blood-banks/:id/visibility'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], HealthResourcesAdministrationController.prototype, "bloodBankVisibility", null);
__decorate([
    (0, common_1.Put)('articles/:id/thumbnail'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { limits: { fileSize: 4 * 1024 * 1024, files: 1, fields: 0 } })),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], HealthResourcesAdministrationController.prototype, "uploadThumbnail", null);
__decorate([
    (0, common_1.Delete)('articles/:id/thumbnail'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], HealthResourcesAdministrationController.prototype, "deleteThumbnail", null);
__decorate([
    (0, common_1.Get)(':kind/:id'),
    __param(0, (0, common_1.Param)('kind')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], HealthResourcesAdministrationController.prototype, "get", null);
__decorate([
    (0, common_1.Post)(':kind/import/preview'),
    (0, common_1.UseInterceptors)(upload),
    __param(0, (0, common_1.Param)('kind')),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], HealthResourcesAdministrationController.prototype, "preview", null);
__decorate([
    (0, common_1.Post)(':kind/import/apply'),
    (0, common_1.UseInterceptors)(upload),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('kind')),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], HealthResourcesAdministrationController.prototype, "import", null);
__decorate([
    (0, common_1.Post)(':kind'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('kind')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], HealthResourcesAdministrationController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':kind/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('kind')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", void 0)
], HealthResourcesAdministrationController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':kind/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('kind')),
    __param(2, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], HealthResourcesAdministrationController.prototype, "remove", null);
exports.HealthResourcesAdministrationController = HealthResourcesAdministrationController = __decorate([
    (0, common_1.Controller)('admin/content'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, administration_guard_1.SuperAdministratorGuard),
    __metadata("design:paramtypes", [health_resources_service_1.HealthResourcesService,
        administration_service_1.AdministrationService])
], HealthResourcesAdministrationController);
//# sourceMappingURL=health-resources-administration.controller.js.map