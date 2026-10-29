"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureApplication = configureApplication;
const node_path_1 = require("node:path");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const swagger_1 = require("@nestjs/swagger");
const express_1 = require("express");
const helmet_1 = __importDefault(require("helmet"));
const nestjs_pino_1 = require("nestjs-pino");
const api_exception_filter_1 = require("../common/errors/api-exception.filter");
const validation_exception_factory_1 = require("../common/validation/validation-exception.factory");
const request_activity_service_1 = require("../modules/status/request-activity.service");
function configureApplication(app) {
    const config = app.get(config_1.ConfigService);
    app.useLogger(app.get(nestjs_pino_1.Logger));
    app.enableShutdownHooks();
    app.use((0, helmet_1.default)());
    app.use(app.get(request_activity_service_1.RequestActivityService).middleware);
    app.useStaticAssets((0, node_path_1.join)(__dirname, '..', 'modules', 'admin', 'public'), {
        prefix: '/admin-assets/',
        index: false,
        maxAge: 0,
    });
    app.use((request, response, next) => {
        if (request.method === 'GET' && (request.path === '/admin' || request.path === '/admin/')) {
            response.setHeader('Cache-Control', 'no-store');
            response.sendFile((0, node_path_1.join)(__dirname, '..', 'modules', 'admin', 'public', 'index.html'));
        }
        else
            next();
    });
    app.useStaticAssets((0, node_path_1.join)(__dirname, '..', 'modules', 'status', 'public'), {
        prefix: '/status-assets/',
        index: false,
        maxAge: 0,
    });
    app.use((request, response, next) => {
        if (request.method !== 'GET' || request.path !== '/') {
            next();
            return;
        }
        response.setHeader('Cache-Control', 'no-store');
        response.sendFile((0, node_path_1.join)(__dirname, '..', 'modules', 'status', 'public', 'index.html'));
    });
    app.use((0, express_1.json)({ limit: '1mb' }));
    app.use((0, express_1.urlencoded)({ extended: false, limit: '1mb' }));
    app.enableCors({
        origin: config.getOrThrow('CORS_ORIGINS'),
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    });
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new common_1.ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        stopAtFirstError: false,
        exceptionFactory: validation_exception_factory_1.validationExceptionFactory,
    }));
    app.useGlobalFilters(new api_exception_filter_1.ApiExceptionFilter());
    if (config.getOrThrow('SWAGGER_ENABLED')) {
        const swaggerConfig = new swagger_1.DocumentBuilder()
            .setTitle('Arogio Health API')
            .setDescription('Arogio Health backend API')
            .setVersion('1.0')
            .addBearerAuth()
            .build();
        swagger_1.SwaggerModule.setup('api/docs', app, swagger_1.SwaggerModule.createDocument(app, swaggerConfig));
    }
}
//# sourceMappingURL=configure-application.js.map