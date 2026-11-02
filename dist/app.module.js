"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const directory_module_1 = require("./modules/directory/directory.module");
const admin_module_1 = require("./modules/admin/admin.module");
const home_module_1 = require("./modules/home/home.module");
const chat_module_1 = require("./modules/chat/chat.module");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const throttler_1 = require("@nestjs/throttler");
const nestjs_pino_1 = require("nestjs-pino");
const logger_config_1 = require("./common/logging/logger.config");
const env_schema_1 = require("./config/env.schema");
const database_module_1 = require("./database/database.module");
const health_module_1 = require("./modules/health/health.module");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const status_module_1 = require("./modules/status/status.module");
const wellness_module_1 = require("./modules/wellness/wellness.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                cache: true,
                envFilePath: process.env.NODE_ENV === 'production'
                    ? ['.env.production', '.env']
                    : ['.env.local', '.env'],
                validate: env_schema_1.validateEnvironment,
            }),
            nestjs_pino_1.LoggerModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: logger_config_1.createLoggerConfig,
            }),
            throttler_1.ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
            database_module_1.DatabaseModule,
            admin_module_1.AdminModule,
            directory_module_1.DirectoryModule,
            home_module_1.HomeModule,
            chat_module_1.ChatModule,
            health_module_1.HealthModule,
            status_module_1.StatusModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            wellness_module_1.WellnessModule,
        ],
        providers: [{ provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard }],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map