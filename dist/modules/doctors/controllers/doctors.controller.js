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
exports.DoctorsAdministrationController = exports.PublicDoctorsController = void 0;
const provider_image_1 = require("../../../common/media/provider-image");
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const exceljs_1 = require("exceljs");
const jwt_auth_guard_1 = require("../../../common/authentication/jwt-auth.guard");
const current_user_decorator_1 = require("../../../common/authentication/current-user.decorator");
const administration_guard_1 = require("../../administration/guards/administration.guard");
const doctors_service_1 = require("../services/doctors.service");
const doctors_import_1 = require("../imports/doctors.import");
const upload = (0, platform_express_1.FileInterceptor)('file', {
    limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 1, fieldSize: 4096 },
});
let PublicDoctorsController = class PublicDoctorsController {
    service;
    constructor(service) {
        this.service = service;
    }
    list(query) {
        return this.service.list(query);
    }
    async image(id, response) {
        (0, provider_image_1.sendProviderImage)(response, await this.service.image(id));
    }
    detail(id) {
        return this.service.detail(id);
    }
};
exports.PublicDoctorsController = PublicDoctorsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PublicDoctorsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id/image'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PublicDoctorsController.prototype, "image", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PublicDoctorsController.prototype, "detail", null);
exports.PublicDoctorsController = PublicDoctorsController = __decorate([
    (0, common_1.Controller)('public/doctors'),
    __metadata("design:paramtypes", [doctors_service_1.DoctorsService])
], PublicDoctorsController);
let DoctorsAdministrationController = class DoctorsAdministrationController {
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
                .attachment('doctors-template.csv')
                .send('\uFEFF' + doctors_import_1.doctorHeaders.join(',') + '\r\n');
            return;
        }
        const workbook = new exceljs_1.Workbook(), sheet = workbook.addWorksheet('Doctors');
        sheet.columns = doctors_import_1.doctorHeaders.map((header) => ({
            header,
            key: header,
            width: 30,
            style: { numFmt: '@' },
        }));
        sheet.views = [{ state: 'frozen', ySplit: 1 }];
        sheet.getRow(1).font = { bold: true };
        response
            .type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            .attachment('doctors-template.xlsx')
            .send(Buffer.from(await workbook.xlsx.writeBuffer()));
    }
    preview(user, file) {
        return this.service.preview(user.userId, file);
    }
    apply(user, file, token) {
        return this.service.apply(user.userId, file, token);
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
exports.DoctorsAdministrationController = DoctorsAdministrationController;
__decorate([
    (0, common_1.Get)(':id/image'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DoctorsAdministrationController.prototype, "image", null);
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
], DoctorsAdministrationController.prototype, "uploadImage", null);
__decorate([
    (0, common_1.Delete)(':id/image'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], DoctorsAdministrationController.prototype, "removeImage", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DoctorsAdministrationController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('template'),
    __param(0, (0, common_1.Query)('format')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DoctorsAdministrationController.prototype, "template", null);
__decorate([
    (0, common_1.Post)('import/preview'),
    (0, common_1.UseInterceptors)(upload),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], DoctorsAdministrationController.prototype, "preview", null);
__decorate([
    (0, common_1.Post)('import/apply'),
    (0, common_1.UseInterceptors)(upload),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)('previewToken')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", void 0)
], DoctorsAdministrationController.prototype, "apply", null);
__decorate([
    (0, common_1.Post)(':id/review'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], DoctorsAdministrationController.prototype, "review", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DoctorsAdministrationController.prototype, "detail", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], DoctorsAdministrationController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], DoctorsAdministrationController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], DoctorsAdministrationController.prototype, "remove", null);
exports.DoctorsAdministrationController = DoctorsAdministrationController = __decorate([
    (0, common_1.Controller)('admin/doctors'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, administration_guard_1.SuperAdministratorGuard),
    __metadata("design:paramtypes", [doctors_service_1.DoctorsService])
], DoctorsAdministrationController);
//# sourceMappingURL=doctors.controller.js.map