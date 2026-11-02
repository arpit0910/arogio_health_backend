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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const api_error_1 = require("../../common/errors/api-error");
const database_error_1 = require("../../common/errors/database-error");
const measurements_1 = require("../../common/health/measurements");
const auth_response_dto_1 = require("../auth/dto/auth-response.dto");
const users_repository_1 = require("./users.repository");
const defined = (fields) => Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
let UsersService = class UsersService {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async activeUser(userId) {
        const user = await this.repository.findById(userId);
        if (!user || user.status !== 'active')
            throw new api_error_1.ApiError('USER_NOT_FOUND', 'User is unavailable', common_1.HttpStatus.NOT_FOUND);
        return user;
    }
    async applyReferral(userId, code) {
        const result = await this.repository.applyReferral(userId, code.trim().toUpperCase());
        if (result.kind === 'saved')
            return (0, auth_response_dto_1.toSafeUser)(result.user);
        const messages = {
            unavailable: 'User is unavailable',
            invalid: 'This referral code is not available. Check the code or continue without it.',
            self: 'You cannot use your own referral code.',
            'already-set': 'A referrer has already been recorded for this account.',
            closed: 'Referral codes can only be added before account setup is complete.',
        };
        throw new api_error_1.ApiError('REFERRAL_' + result.kind.replace('-', '_').toUpperCase(), messages[result.kind], result.kind === 'unavailable' ? common_1.HttpStatus.NOT_FOUND : common_1.HttpStatus.BAD_REQUEST);
    }
    async deleteAccount(userId, confirmed) {
        if (confirmed !== true)
            throw new api_error_1.ApiError('CONFIRMATION_REQUIRED', 'Confirm account deletion first', common_1.HttpStatus.BAD_REQUEST);
        const account = await this.activeUser(userId);
        if (account.role === 'super_admin')
            throw new api_error_1.ApiError('ADMIN_ACCOUNT_PROTECTED', 'Manage administrator accounts through the seeder', common_1.HttpStatus.FORBIDDEN);
        const result = await this.repository.softDelete(userId);
        if (!result)
            throw new api_error_1.ApiError('USER_NOT_FOUND', 'User is unavailable', common_1.HttpStatus.NOT_FOUND);
        return result;
    }
    async getMe(userId) {
        return (0, auth_response_dto_1.toSafeUser)(await this.activeUser(userId));
    }
    async createProfile(userId, input) {
        const existing = await this.activeUser(userId);
        return existing.profileSetup ? (0, auth_response_dto_1.toSafeUser)(existing) : this.updateMe(userId, input);
    }
    async updateMe(userId, input) {
        if (!Object.values(input).some((value) => value !== undefined))
            throw new api_error_1.ApiError('VALIDATION_FAILED', 'At least one profile field is required', common_1.HttpStatus.BAD_REQUEST);
        const { fullName, username, heightValue, heightUnit, weightValue, weightUnit, complete, ...details } = input;
        const measurements = (0, measurements_1.normalizeMeasurements)({
            heightValue,
            heightUnit,
            weightValue,
            weightUnit,
        });
        const supplied = defined(details);
        const changes = {
            ...defined({ fullName, username }),
            ...measurements,
        };
        if (Object.keys(supplied).length || complete) {
            const existing = await this.activeUser(userId);
            const setup = { ...existing.profileSetup, ...supplied };
            validateBirthDate(input.dateOfBirth);
            if (input.healthGoals &&
                !input.healthGoals.length &&
                (existing.profileCompletedAt || complete))
                throw new api_error_1.ApiError('VALIDATION_FAILED', 'Choose at least one health goal', common_1.HttpStatus.BAD_REQUEST);
            validatePhoto(input.photo);
            if (complete &&
                (!setup.dateOfBirth ||
                    !setup.activityLevel ||
                    !Array.isArray(setup.healthGoals) ||
                    !setup.healthGoals.length ||
                    !(heightValue ?? existing.heightValue) ||
                    !(weightValue ?? existing.weightValue)))
                throw new api_error_1.ApiError('VALIDATION_FAILED', 'Complete personal details, activity level and at least one health goal', common_1.HttpStatus.BAD_REQUEST);
            changes.profileSetup = { ...setup, ...(complete ? { setupDeferred: false } : {}), step: complete ? 7 : (setup.step ?? 0) };
            if (complete)
                changes.profileCompletedAt = existing.profileCompletedAt ?? new Date();
        }
        try {
            const user = await this.repository.updateProfile(userId, changes);
            if (!user || user.status !== 'active')
                throw new api_error_1.ApiError('USER_NOT_FOUND', 'User is unavailable', common_1.HttpStatus.NOT_FOUND);
            return (0, auth_response_dto_1.toSafeUser)(user);
        }
        catch (error) {
            if ((0, database_error_1.isUniqueViolation)(error, 'users_username_unique'))
                throw new api_error_1.ApiError('USERNAME_TAKEN', 'This username is unavailable', common_1.HttpStatus.CONFLICT);
            throw error;
        }
    }
    saveSetup(userId, input) {
        return this.updateMe(userId, input);
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_repository_1.UsersRepository])
], UsersService);
function validateBirthDate(value) {
    if (value === undefined)
        return;
    const date = new Date(value + 'T00:00:00Z');
    if (!Number.isFinite(date.getTime()) ||
        date.toISOString().slice(0, 10) !== value ||
        date > new Date() ||
        date.getUTCFullYear() < 1900)
        throw new api_error_1.ApiError('VALIDATION_FAILED', 'Enter a valid date of birth in the past', common_1.HttpStatus.BAD_REQUEST);
}
function validatePhoto(photo) {
    if (!photo)
        return;
    const bytes = Buffer.from(photo.split(',')[1] ?? '', 'base64');
    if (bytes.length > 160000 ||
        bytes.length < 4 ||
        bytes[0] !== 0xff ||
        bytes[1] !== 0xd8 ||
        bytes[2] !== 0xff)
        throw new api_error_1.ApiError('VALIDATION_FAILED', 'Choose a JPEG photo smaller than 160 KB', common_1.HttpStatus.BAD_REQUEST);
}
//# sourceMappingURL=users.service.js.map