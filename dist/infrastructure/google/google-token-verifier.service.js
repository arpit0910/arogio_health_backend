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
exports.GoogleTokenVerifierService = exports.GoogleTokenVerifier = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const google_auth_library_1 = require("google-auth-library");
class GoogleTokenVerifier {
}
exports.GoogleTokenVerifier = GoogleTokenVerifier;
let GoogleTokenVerifierService = class GoogleTokenVerifierService {
    client = new google_auth_library_1.OAuth2Client();
    audiences;
    constructor(config) {
        this.audiences = config.getOrThrow('GOOGLE_CLIENT_IDS');
    }
    async verify(idToken) {
        const ticket = await this.client.verifyIdToken({ idToken, audience: this.audiences });
        const payload = ticket.getPayload();
        if (!payload?.sub)
            throw new Error('Google token has no subject');
        return {
            subject: payload.sub,
            email: payload.email?.trim().toLowerCase() ?? null,
            emailVerified: payload.email_verified === true,
            name: payload.name?.trim() || null,
        };
    }
};
exports.GoogleTokenVerifierService = GoogleTokenVerifierService;
exports.GoogleTokenVerifierService = GoogleTokenVerifierService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], GoogleTokenVerifierService);
//# sourceMappingURL=google-token-verifier.service.js.map