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
exports.PublicMeditationLibraryController = exports.MeditationLibraryController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../../../common/authentication/current-user.decorator");
const practice_history_service_1 = require("../services/practice-history.service");
const jwt_auth_guard_1 = require("../../../common/authentication/jwt-auth.guard");
const meditation_library_service_1 = require("../services/meditation-library.service");
let MeditationLibraryController = class MeditationLibraryController {
    meditation;
    progress;
    constructor(meditation, progress) {
        this.meditation = meditation;
        this.progress = progress;
    }
    list(query) {
        return this.meditation.list(query);
    }
    history(user) { return this.progress.list(user.userId); }
    complete(user, body) { return this.progress.complete(user.userId, body); }
};
exports.MeditationLibraryController = MeditationLibraryController;
__decorate([
    (0, common_1.Get)('content'),
    (0, common_1.Header)('Cache-Control', 'private, no-cache'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MeditationLibraryController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('progress'),
    (0, common_1.Header)('Cache-Control', 'private, no-store'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MeditationLibraryController.prototype, "history", null);
__decorate([
    (0, common_1.Post)('progress'),
    (0, common_1.Header)('Cache-Control', 'private, no-store'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], MeditationLibraryController.prototype, "complete", null);
exports.MeditationLibraryController = MeditationLibraryController = __decorate([
    (0, common_1.Controller)('meditation'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [meditation_library_service_1.MeditationLibraryService, practice_history_service_1.PracticeHistoryService])
], MeditationLibraryController);
let PublicMeditationLibraryController = class PublicMeditationLibraryController {
    meditation;
    constructor(meditation) {
        this.meditation = meditation;
    }
    list(query) { return this.meditation.list(query); }
    detail(id) {
        return this.meditation.get(id, false);
    }
};
exports.PublicMeditationLibraryController = PublicMeditationLibraryController;
__decorate([
    (0, common_1.Get)('content'),
    (0, common_1.Header)('Cache-Control', 'no-cache'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PublicMeditationLibraryController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('content/:id'),
    (0, common_1.Header)('Cache-Control', 'no-cache'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PublicMeditationLibraryController.prototype, "detail", null);
exports.PublicMeditationLibraryController = PublicMeditationLibraryController = __decorate([
    (0, common_1.Controller)('public/meditation'),
    __metadata("design:paramtypes", [meditation_library_service_1.MeditationLibraryService])
], PublicMeditationLibraryController);
//# sourceMappingURL=meditation-library.controller.js.map