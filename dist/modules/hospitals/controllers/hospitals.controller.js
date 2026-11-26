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
exports.HospitalsAdministrationController = exports.PublicHospitalsController = void 0;
const provider_image_1 = require("../../../common/media/provider-image");
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const exceljs_1 = require("exceljs");
const jwt_auth_guard_1 = require("../../../common/authentication/jwt-auth.guard");
const current_user_decorator_1 = require("../../../common/authentication/current-user.decorator");
const administration_guard_1 = require("../../administration/guards/administration.guard");
const hospitals_service_1 = require("../services/hospitals.service");
const hospitals_import_1 = require("../imports/hospitals.import");
const upload = (0, platform_express_1.FileInterceptor)('file', {
    limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 1, fieldSize: 4096 },
});
let PublicHospitalsController = class PublicHospitalsController {
    service;
    constructor(service) {
        this.service = service;
    }
    list(query) {
        return this.service.list(query);
    }
    nearby(body) {
        return this.service.nearby(body);
    }
    async image(id, response) {
        (0, provider_image_1.sendProviderImage)(response, await this.service.image(id));
    }
    detail(id) {
        return this.service.detail(id);
    }
};
exports.PublicHospitalsController = PublicHospitalsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PublicHospitalsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('nearby'),
    (0, common_1.HttpCode)(200),
    (0, common_1.Header)('Cache-Control', 'private, no-store'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PublicHospitalsController.prototype, "nearby", null);
__decorate([
    (0, common_1.Get)(':id/image'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PublicHospitalsController.prototype, "image", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PublicHospitalsController.prototype, "detail", null);
exports.PublicHospitalsController = PublicHospitalsController = __decorate([
    (0, common_1.Controller)('public/hospitals'),
    __metadata("design:paramtypes", [hospitals_service_1.HospitalsService])
], PublicHospitalsController);
let HospitalsAdministrationController = class HospitalsAdministrationController {
    service;
    constructor(service) {
        this.service = service;
    }
    async image(id, response) {
        (0, provider_image_1.sendProviderImage)(response, await this.service.image(id, true));
    }
    uploadImage(user, id, file, body) {
        return this.service.uploadImage(user.userId, id, file, body);
    }
    removeImage(user, id, query) {
        return this.service.removeImage(user.userId, id, query);
    }
    list(query) {
        return this.service.list(query, true);
    }
    async template(format, response) {
        response.setHeader('Cache-Control', 'private, no-store');
        if (format === 'csv') {
            response
                .type('text/csv')
                .attachment('hospitals-template.csv')
                .send('\uFEFF' + hospitals_import_1.hospitalHeaders.join(',') + '\r\n');
            return;
        }
        const workbook = new exceljs_1.Workbook(), sheet = workbook.addWorksheet('Hospitals');
        sheet.columns = hospitals_import_1.hospitalHeaders.map((header) => ({
            header,
            key: header,
            width: 30,
            style: { numFmt: '@' },
        }));
        sheet.views = [{ state: 'frozen', ySplit: 1 }];
        sheet.getRow(1).font = { bold: true };
        response
            .type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            .attachment('hospitals-template.xlsx')
            .send(Buffer.from(await workbook.xlsx.writeBuffer()));
    }
    preview(user, file) {
        return this.service.preview(user.userId, file);
    }
    apply(user, file, token) {
        return this.service.apply(user.userId, file, token);
    }
    visibility(user, id, body) {
        return this.service.visibility(user.userId, id, body);
    }
    review(user, id, body) {
        return this.service.review(user.userId, id, body);
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
exports.HospitalsAdministrationController = HospitalsAdministrationController;
__decorate([
    (0, common_1.Get)(':id/image'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], HospitalsAdministrationController.prototype, "image", null);
__decorate([
    (0, common_1.Put)(':id/image'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        limits: { fileSize: 4 * 1024 * 1024, files: 1, fields: 2, fieldSize: 1024 },
    })),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.UploadedFile)()),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", void 0)
], HospitalsAdministrationController.prototype, "uploadImage", null);
__decorate([
    (0, common_1.Delete)(':id/image'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], HospitalsAdministrationController.prototype, "removeImage", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HospitalsAdministrationController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('template'),
    __param(0, (0, common_1.Query)('format')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], HospitalsAdministrationController.prototype, "template", null);
__decorate([
    (0, common_1.Post)('import/preview'),
    (0, common_1.UseInterceptors)(upload),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], HospitalsAdministrationController.prototype, "preview", null);
__decorate([
    (0, common_1.Post)('import/apply'),
    (0, common_1.UseInterceptors)(upload),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)('previewToken')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", void 0)
], HospitalsAdministrationController.prototype, "apply", null);
__decorate([
    (0, common_1.Post)(':id/visibility'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], HospitalsAdministrationController.prototype, "visibility", null);
__decorate([
    (0, common_1.Post)(':id/review'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], HospitalsAdministrationController.prototype, "review", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], HospitalsAdministrationController.prototype, "detail", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], HospitalsAdministrationController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], HospitalsAdministrationController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], HospitalsAdministrationController.prototype, "remove", null);
exports.HospitalsAdministrationController = HospitalsAdministrationController = __decorate([
    (0, common_1.Controller)('admin/hospitals'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, administration_guard_1.SuperAdministratorGuard),
    __metadata("design:paramtypes", [hospitals_service_1.HospitalsService])
], HospitalsAdministrationController);
//# sourceMappingURL=hospitals.controller.js.map