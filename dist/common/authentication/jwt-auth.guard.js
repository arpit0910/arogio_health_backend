"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const api_error_1 = require("../errors/api-error");
let JwtAuthGuard = class JwtAuthGuard extends (0, passport_1.AuthGuard)('jwt') {
    handleRequest(error, user, info, context) {
        if (error)
            throw error instanceof Error ? error : new Error('Authentication failed');
        if (user)
            return user;
        const request = context.switchToHttp().getRequest();
        if (!/^Bearer\s+\S+/i.test(request.headers.authorization ?? '')) {
            throw new api_error_1.ApiError('ACCESS_TOKEN_REQUIRED', 'Sign in and provide a Bearer access token.', common_1.HttpStatus.UNAUTHORIZED);
        }
        if (info?.name === 'TokenExpiredError') {
            throw new api_error_1.ApiError('ACCESS_TOKEN_EXPIRED', 'Your access token has expired. Refresh your session or sign in again.', common_1.HttpStatus.UNAUTHORIZED);
        }
        throw new api_error_1.ApiError('INVALID_ACCESS_TOKEN', 'The access token is invalid. Sign in again.', common_1.HttpStatus.UNAUTHORIZED);
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = __decorate([
    (0, common_1.Injectable)()
], JwtAuthGuard);
//# sourceMappingURL=jwt-auth.guard.js.map