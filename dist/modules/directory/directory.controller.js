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
exports.DirectoryController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../common/auth/jwt-auth.guard");
const directory_service_1 = require("./directory.service");
let DirectoryController = class DirectoryController {
    directory;
    constructor(directory) {
        this.directory = directory;
    }
    articles(query) {
        return this.directory.listArticles(query);
    }
    article(id) {
        return this.directory.article(id);
    }
    banks(query) {
        return this.directory.listBanks(query);
    }
    nearby(body) {
        return this.directory.nearby(body);
    }
};
exports.DirectoryController = DirectoryController;
__decorate([
    (0, common_1.Get)('articles'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DirectoryController.prototype, "articles", null);
__decorate([
    (0, common_1.Get)('articles/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DirectoryController.prototype, "article", null);
__decorate([
    (0, common_1.Get)('blood-banks'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DirectoryController.prototype, "banks", null);
__decorate([
    (0, common_1.Post)('blood-banks/nearby'),
    (0, common_1.HttpCode)(200),
    (0, common_1.Header)('Cache-Control', 'private, no-store'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DirectoryController.prototype, "nearby", null);
exports.DirectoryController = DirectoryController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [directory_service_1.DirectoryService])
], DirectoryController);
//# sourceMappingURL=directory.controller.js.map