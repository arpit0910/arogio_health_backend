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
exports.DiseasesAdministrationController = exports.PublicDiseasesController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const exceljs_1 = require("exceljs");
const jwt_auth_guard_1 = require("../../../common/authentication/jwt-auth.guard");
const current_user_decorator_1 = require("../../../common/authentication/current-user.decorator");
const administration_guard_1 = require("../../administration/guards/administration.guard");
const diseases_service_1 = require("../services/diseases.service");
const diseases_import_1 = require("../imports/diseases.import");
const upload = (0, platform_express_1.FileInterceptor)('file', {
    limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 1, fieldSize: 4096 },
});
let PublicDiseasesController = class PublicDiseasesController {
    service;
    constructor(service) {
        this.service = service;
    }
    list(query) {
        return this.service.list(query);
    }
    detail(id) {
        return this.service.detail(id);
    }
};
exports.PublicDiseasesController = PublicDiseasesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PublicDiseasesController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PublicDiseasesController.prototype, "detail", null);
exports.PublicDiseasesController = PublicDiseasesController = __decorate([
    (0, common_1.Controller)('public/diseases'),
    __metadata("design:paramtypes", [diseases_service_1.DiseasesService])
], PublicDiseasesController);
let DiseasesAdministrationController = class DiseasesAdministrationController {
    service;
    constructor(service) {
        this.service = service;
    }
    list(query) {
        return this.service.list(query, true);
    }
    async template(format, response) {
        response.setHeader('Cache-Control', 'private, no-store');
        if (format === 'csv') {
            response
                .type('text/csv')
                .attachment('diseases-template.csv')
                .send('\uFEFF' + diseases_import_1.diseaseHeaders.join(',') + '\r\n');
            return;
        }
        const workbook = new exceljs_1.Workbook(), sheet = workbook.addWorksheet('Diseases');
        sheet.columns = diseases_import_1.diseaseHeaders.map((header) => ({
            header,
            key: header,
            width: 30,
            style: { numFmt: '@' },
        }));
        sheet.views = [{ state: 'frozen', ySplit: 1 }];
        sheet.getRow(1).font = { bold: true };
        response
            .type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            .attachment('diseases-template.xlsx')
            .send(Buffer.from(await workbook.xlsx.writeBuffer()));
    }
    preview(user, file) {
        return this.service.preview(user.userId, file);
    }
    apply(user, file, token) {
        return this.service.apply(user.userId, file, token);
    }
    detail(id) {
        return this.service.detail(id, true);
    }
    create(user, body) {
        return this.service.create(user.userId, body);
    }
    update(user, id, body) {
        return this.service.update(user.userId, id, body);
    }
    remove(user, id, query) {
        return this.service.remove(user.userId, id, query);
    }
};
exports.DiseasesAdministrationController = DiseasesAdministrationController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DiseasesAdministrationController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('template'),
    __param(0, (0, common_1.Query)('format')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DiseasesAdministrationController.prototype, "template", null);
__decorate([
    (0, common_1.Post)('import/preview'),
    (0, common_1.UseInterceptors)(upload),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], DiseasesAdministrationController.prototype, "preview", null);
__decorate([
    (0, common_1.Post)('import/apply'),
    (0, common_1.UseInterceptors)(upload),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)('previewToken')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", void 0)
], DiseasesAdministrationController.prototype, "apply", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DiseasesAdministrationController.prototype, "detail", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], DiseasesAdministrationController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], DiseasesAdministrationController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], DiseasesAdministrationController.prototype, "remove", null);
exports.DiseasesAdministrationController = DiseasesAdministrationController = __decorate([
    (0, common_1.Controller)('admin/diseases'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, administration_guard_1.SuperAdministratorGuard),
    __metadata("design:paramtypes", [diseases_service_1.DiseasesService])
], DiseasesAdministrationController);
//# sourceMappingURL=diseases.controller.js.map