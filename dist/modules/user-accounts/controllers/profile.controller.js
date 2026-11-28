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
exports.ProfileController = void 0;
const delete_account_dto_1 = require("../requests/delete-account.dto");
const referral_dto_1 = require("../requests/referral.dto");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../../common/authentication/current-user.decorator");
const jwt_auth_guard_1 = require("../../../common/authentication/jwt-auth.guard");
const authentication_response_dto_1 = require("../../authentication/responses/authentication-response.dto");
const update_profile_dto_1 = require("../requests/update-profile.dto");
const user_accounts_service_1 = require("../services/user-accounts.service");
let ProfileController = class ProfileController {
    profiles;
    constructor(profiles) {
        this.profiles = profiles;
    }
    applyReferral(user, input) {
        return this.profiles.applyReferral(user.userId, input.referralCode);
    }
    deleteAccount(user, input) {
        return this.profiles.deleteAccount(user.userId, input.confirm);
    }
    view(user) {
        return this.profiles.getMe(user.userId);
    }
    create(user, input) {
        return this.profiles.createProfile(user.userId, input);
    }
    update(user, input) {
        return this.profiles.updateMe(user.userId, input);
    }
};
exports.ProfileController = ProfileController;
__decorate([
    (0, common_1.Post)('referral'),
    (0, swagger_1.ApiOperation)({ summary: 'Record a referrer once, before completing account setup' }),
    (0, swagger_1.ApiOkResponse)({ type: authentication_response_dto_1.SafeUserDto }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, referral_dto_1.ApplyReferralDto]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "applyReferral", null);
__decorate([
    (0, common_1.Delete)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Soft-delete your account; verified sign-in within 30 days restores it',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, delete_account_dto_1.DeleteAccountDto]),
    __metadata("design:returntype", void 0)
], ProfileController.prototype, "deleteAccount", null);
__decorate([
    (0, common_1.Get)('view'),
    (0, swagger_1.ApiOperation)({ summary: 'View your profile' }),
    (0, swagger_1.ApiOkResponse)({ type: authentication_response_dto_1.SafeUserDto }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "view", null);
__decorate([
    (0, common_1.Post)('create'),
    (0, swagger_1.ApiOperation)({ summary: 'Create your profile; retries return the existing profile' }),
    (0, swagger_1.ApiCreatedResponse)({ type: authentication_response_dto_1.SafeUserDto }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_profile_dto_1.UpdateProfileDto]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)('update'),
    (0, swagger_1.ApiOperation)({ summary: 'Update personal details, preferences or setup progress' }),
    (0, swagger_1.ApiOkResponse)({ type: authentication_response_dto_1.SafeUserDto }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_profile_dto_1.UpdateProfileDto]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "update", null);
exports.ProfileController = ProfileController = __decorate([
    (0, swagger_1.ApiTags)('profile'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('profile'),
    __metadata("design:paramtypes", [user_accounts_service_1.UserAccountsService])
], ProfileController);
//# sourceMappingURL=profile.controller.js.map