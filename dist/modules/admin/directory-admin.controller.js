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
exports.DirectoryAdminController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const jwt_auth_guard_1 = require("../../common/auth/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/auth/current-user.decorator");
const directory_service_1 = require("../directory/directory.service");
const admin_guard_1 = require("./admin.guard");
const admin_service_1 = require("./admin.service");
const exceljs_1 = require("exceljs");
const import_1 = require("../directory/import");
const upload = (0, platform_express_1.FileInterceptor)('file', {
    limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 0 },
});
let DirectoryAdminController = class DirectoryAdminController {
    directory;
    audit;
    constructor(directory, audit) {
        this.directory = directory;
        this.audit = audit;
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
exports.DirectoryAdminController = DirectoryAdminController;
__decorate([
    (0, common_1.Get)(':kind'),
    __param(0, (0, common_1.Param)('kind')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DirectoryAdminController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':kind/template'),
    __param(0, (0, common_1.Param)('kind')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DirectoryAdminController.prototype, "template", null);
__decorate([
    (0, common_1.Get)(':kind/:id'),
    __param(0, (0, common_1.Param)('kind')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], DirectoryAdminController.prototype, "get", null);
__decorate([
    (0, common_1.Post)(':kind/import/preview'),
    (0, common_1.UseInterceptors)(upload),
    __param(0, (0, common_1.Param)('kind')),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DirectoryAdminController.prototype, "preview", null);
__decorate([
    (0, common_1.Post)(':kind/import/apply'),
    (0, common_1.UseInterceptors)(upload),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('kind')),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], DirectoryAdminController.prototype, "import", null);
__decorate([
    (0, common_1.Post)(':kind'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('kind')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], DirectoryAdminController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':kind/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('kind')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", void 0)
], DirectoryAdminController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':kind/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('kind')),
    __param(2, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], DirectoryAdminController.prototype, "remove", null);
exports.DirectoryAdminController = DirectoryAdminController = __decorate([
    (0, common_1.Controller)('admin/content'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, admin_guard_1.SuperAdminGuard),
    __metadata("design:paramtypes", [directory_service_1.DirectoryService,
        admin_service_1.AdminService])
], DirectoryAdminController);
//# sourceMappingURL=directory-admin.controller.js.map