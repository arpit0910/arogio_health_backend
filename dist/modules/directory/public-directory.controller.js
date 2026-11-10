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
exports.PublicDirectoryController = void 0;
const common_1 = require("@nestjs/common");
const directory_service_1 = require("./directory.service");
let PublicDirectoryController = class PublicDirectoryController {
    directory;
    constructor(directory) {
        this.directory = directory;
    }
    articles(query) {
        return this.directory.listArticles(query);
    }
    categories() {
        return this.directory.categories();
    }
    article(id) {
        return this.directory.article(id);
    }
    banks(query) {
        return this.directory.listBanks(query, false, true);
    }
    nearby(body) {
        return this.directory.nearby(body, true);
    }
};
exports.PublicDirectoryController = PublicDirectoryController;
__decorate([
    (0, common_1.Get)('articles'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PublicDirectoryController.prototype, "articles", null);
__decorate([
    (0, common_1.Get)('article-categories'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PublicDirectoryController.prototype, "categories", null);
__decorate([
    (0, common_1.Get)('articles/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PublicDirectoryController.prototype, "article", null);
__decorate([
    (0, common_1.Get)('blood-banks'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PublicDirectoryController.prototype, "banks", null);
__decorate([
    (0, common_1.Post)('blood-banks/nearby'),
    (0, common_1.HttpCode)(200),
    (0, common_1.Header)('Cache-Control', 'private, no-store'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PublicDirectoryController.prototype, "nearby", null);
exports.PublicDirectoryController = PublicDirectoryController = __decorate([
    (0, common_1.Controller)('public'),
    __metadata("design:paramtypes", [directory_service_1.DirectoryService])
], PublicDirectoryController);
//# sourceMappingURL=public-directory.controller.js.map