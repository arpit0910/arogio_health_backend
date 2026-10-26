"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ApiExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const api_error_1 = require("./api-error");
const database_error_1 = require("./database-error");
let ApiExceptionFilter = ApiExceptionFilter_1 = class ApiExceptionFilter {
    logger = new common_1.Logger(ApiExceptionFilter_1.name);
    catch(exception, host) {
        const context = host.switchToHttp();
        const request = context.getRequest();
        const response = context.getResponse();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let code = 'INTERNAL_ERROR';
        let message = 'An unexpected error occurred';
        let details;
        if (exception instanceof api_error_1.ApiError) {
            ({ status, code, message, details } = exception);
        }
        else if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const body = exception.getResponse();
            if (typeof body === 'object' && body !== null) {
                const parsed = body;
                code = parsed.code ?? `HTTP_${status}`;
                message = parsed.message ?? exception.message;
                details = parsed.details;
            }
            else {
                message = String(body);
                code = `HTTP_${status}`;
            }
        }
        const requestId = request.id ?? response.getHeader('x-request-id') ?? 'unknown';
        if (status >= common_1.HttpStatus.INTERNAL_SERVER_ERROR && !(exception instanceof api_error_1.ApiError)) {
            this.logger.error({
                event: 'unhandled_api_error',
                requestId,
                databaseErrorCode: (0, database_error_1.getDatabaseErrorCode)(exception) ?? 'UNKNOWN',
            });
        }
        response.status(status).json({
            error: {
                code,
                message,
                ...(details === undefined ? {} : { details }),
                requestId,
                timestamp: new Date().toISOString(),
                path: request.originalUrl,
            },
        });
    }
};
exports.ApiExceptionFilter = ApiExceptionFilter;
exports.ApiExceptionFilter = ApiExceptionFilter = ApiExceptionFilter_1 = __decorate([
    (0, common_1.Catch)()
], ApiExceptionFilter);
//# sourceMappingURL=api-exception.filter.js.map