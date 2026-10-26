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
let UsersService = class UsersService {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async getMe(userId) {
        const user = await this.repository.findById(userId);
        if (!user || user.status !== 'active') {
            throw new api_error_1.ApiError('USER_NOT_FOUND', 'User is unavailable', common_1.HttpStatus.NOT_FOUND);
        }
        return (0, auth_response_dto_1.toSafeUser)(user);
    }
    async updateMe(userId, input) {
        if (input.fullName === undefined &&
            input.username === undefined &&
            input.heightValue === undefined &&
            input.heightUnit === undefined &&
            input.weightValue === undefined &&
            input.weightUnit === undefined) {
            throw new api_error_1.ApiError('VALIDATION_FAILED', 'At least one profile field is required', common_1.HttpStatus.BAD_REQUEST);
        }
        try {
            const user = await this.repository.updateProfile(userId, {
                ...input,
                ...(0, measurements_1.normalizeMeasurements)(input),
            });
            if (!user || user.status !== 'active') {
                throw new api_error_1.ApiError('USER_NOT_FOUND', 'User is unavailable', common_1.HttpStatus.NOT_FOUND);
            }
            return (0, auth_response_dto_1.toSafeUser)(user);
        }
        catch (error) {
            if ((0, database_error_1.isUniqueViolation)(error, 'users_username_unique')) {
                throw new api_error_1.ApiError('USERNAME_TAKEN', 'This username is unavailable', common_1.HttpStatus.CONFLICT);
            }
            throw error;
        }
    }
    async saveSetup(userId, input) {
        const existing = await this.repository.findById(userId);
        if (!existing || existing.status !== 'active') {
            throw new api_error_1.ApiError('USER_NOT_FOUND', 'User is unavailable', common_1.HttpStatus.NOT_FOUND);
        }
        const { complete, heightValue, heightUnit, weightValue, weightUnit, ...details } = input;
        const suppliedDetails = Object.fromEntries(Object.entries(details).filter(([, value]) => value !== undefined));
        const setup = { ...existing.profileSetup, ...suppliedDetails };
        if (details.dateOfBirth) {
            const date = new Date(details.dateOfBirth + 'T00:00:00Z');
            if (!Number.isFinite(date.getTime()) ||
                date.toISOString().slice(0, 10) !== details.dateOfBirth ||
                date > new Date() ||
                date.getUTCFullYear() < 1900) {
                throw new api_error_1.ApiError('VALIDATION_FAILED', 'Enter a valid date of birth in the past', common_1.HttpStatus.BAD_REQUEST);
            }
        }
        const measurements = { heightValue, heightUnit, weightValue, weightUnit };
        const normalized = (0, measurements_1.normalizeMeasurements)(measurements);
        if (complete &&
            (!setup.dateOfBirth ||
                !setup.activityLevel ||
                !Array.isArray(setup.healthGoals) ||
                !setup.healthGoals.length ||
                !(heightValue ?? existing.heightValue) ||
                !(weightValue ?? existing.weightValue))) {
            throw new api_error_1.ApiError('VALIDATION_FAILED', 'Complete personal details, activity level and at least one health goal', common_1.HttpStatus.BAD_REQUEST);
        }
        const user = await this.repository.updateProfile(userId, {
            ...measurements,
            ...normalized,
            profileSetup: { ...setup, step: complete ? 7 : (setup.step ?? 0) },
            ...(complete ? { profileCompletedAt: existing.profileCompletedAt ?? new Date() } : {}),
        });
        if (!user)
            throw new api_error_1.ApiError('USER_NOT_FOUND', 'User is unavailable', common_1.HttpStatus.NOT_FOUND);
        return (0, auth_response_dto_1.toSafeUser)(user);
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_repository_1.UsersRepository])
], UsersService);
//# sourceMappingURL=users.service.js.map