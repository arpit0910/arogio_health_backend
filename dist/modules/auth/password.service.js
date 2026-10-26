"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordService = void 0;
const common_1 = require("@nestjs/common");
const argon2_1 = require("@node-rs/argon2");
const HASH_OPTIONS = {
    algorithm: 2,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
    outputLen: 32,
};
let PasswordService = class PasswordService {
    dummyHash = (0, argon2_1.hash)('not-a-real-user-password', HASH_OPTIONS);
    hash(password) {
        return (0, argon2_1.hash)(password, HASH_OPTIONS);
    }
    async verify(passwordHash, password) {
        const valid = await (0, argon2_1.verify)(passwordHash ?? (await this.dummyHash), password);
        return Boolean(passwordHash) && valid;
    }
};
exports.PasswordService = PasswordService;
exports.PasswordService = PasswordService = __decorate([
    (0, common_1.Injectable)()
], PasswordService);
//# sourceMappingURL=password.service.js.map