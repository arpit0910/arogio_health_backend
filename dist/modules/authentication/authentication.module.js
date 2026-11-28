"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthenticationModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const jwt_auth_guard_1 = require("../../common/authentication/jwt-auth.guard");
const google_token_verifier_service_1 = require("../../infrastructure/google/google-token-verifier.service");
const authentication_controller_1 = require("./controllers/authentication.controller");
const authentication_repository_1 = require("./repositories/authentication.repository");
const authentication_service_1 = require("./services/authentication.service");
const jwt_strategy_1 = require("./strategies/jwt.strategy");
const password_hashing_service_1 = require("./services/password-hashing.service");
let AuthenticationModule = class AuthenticationModule {
};
exports.AuthenticationModule = AuthenticationModule;
exports.AuthenticationModule = AuthenticationModule = __decorate([
    (0, common_1.Module)({
        imports: [
            passport_1.PassportModule,
            jwt_1.JwtModule.registerAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    secret: config.getOrThrow('JWT_ACCESS_SECRET'),
                    signOptions: {
                        issuer: config.getOrThrow('JWT_ISSUER'),
                        audience: config.getOrThrow('JWT_AUDIENCE'),
                        expiresIn: config.getOrThrow('JWT_ACCESS_TTL_SECONDS'),
                    },
                }),
            }),
        ],
        controllers: [authentication_controller_1.AuthenticationController],
        providers: [
            authentication_service_1.AuthenticationService,
            authentication_repository_1.AuthenticationRepository,
            password_hashing_service_1.PasswordHashingService,
            jwt_strategy_1.JwtStrategy,
            jwt_auth_guard_1.JwtAuthGuard,
            { provide: google_token_verifier_service_1.GoogleTokenVerifier, useClass: google_token_verifier_service_1.GoogleTokenVerifierService },
        ],
        exports: [jwt_auth_guard_1.JwtAuthGuard],
    })
], AuthenticationModule);
//# sourceMappingURL=authentication.module.js.map