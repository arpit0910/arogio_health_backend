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
exports.UserAccountsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../../common/authentication/current-user.decorator");
const jwt_auth_guard_1 = require("../../../common/authentication/jwt-auth.guard");
const authentication_response_dto_1 = require("../../authentication/responses/authentication-response.dto");
const update_profile_dto_1 = require("../requests/update-profile.dto");
const profile_setup_dto_1 = require("../requests/profile-setup.dto");
const user_accounts_service_1 = require("../services/user-accounts.service");
let UserAccountsController = class UserAccountsController {
    users;
    constructor(users) {
        this.users = users;
    }
    getMe(currentUser) {
        return this.users.getMe(currentUser.userId);
    }
    updateMe(currentUser, input) {
        return this.users.updateMe(currentUser.userId, input);
    }
    saveSetup(currentUser, input) {
        return this.users.saveSetup(currentUser.userId, input);
    }
};
exports.UserAccountsController = UserAccountsController;
__decorate([
    (0, common_1.Get)('me'),
    (0, swagger_1.ApiOperation)({ summary: 'Get the current user profile' }),
    (0, swagger_1.ApiOkResponse)({ type: authentication_response_dto_1.SafeUserDto }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserAccountsController.prototype, "getMe", null);
__decorate([
    (0, common_1.Patch)('me'),
    (0, swagger_1.ApiOperation)({ summary: 'Update permitted current-user profile fields' }),
    (0, swagger_1.ApiOkResponse)({ type: authentication_response_dto_1.SafeUserDto }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_profile_dto_1.UpdateProfileDto]),
    __metadata("design:returntype", Promise)
], UserAccountsController.prototype, "updateMe", null);
__decorate([
    (0, common_1.Patch)(['me/profile-setup', 'me/setup']),
    (0, swagger_1.ApiOperation)({ summary: 'Save profile setup progress or complete setup' }),
    (0, swagger_1.ApiOkResponse)({ type: authentication_response_dto_1.SafeUserDto }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, profile_setup_dto_1.ProfileSetupDto]),
    __metadata("design:returntype", Promise)
], UserAccountsController.prototype, "saveSetup", null);
exports.UserAccountsController = UserAccountsController = __decorate([
    (0, swagger_1.ApiTags)('users'),
    (0, swagger_1.ApiExcludeController)(),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [user_accounts_service_1.UserAccountsService])
], UserAccountsController);
//# sourceMappingURL=user-accounts.controller.js.map