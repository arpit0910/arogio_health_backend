"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestActivityService = void 0;
const node_crypto_1 = require("node:crypto");
const common_1 = require("@nestjs/common");
const response_summary_1 = require("../../common/logging/response-summary");
let RequestActivityService = class RequestActivityService {
    instanceId = (0, node_crypto_1.randomUUID)();
    startedAt = new Date().toISOString();
    recent = [];
    apiRequests = 0;
    clientErrors = 0;
    serverErrors = 0;
    probes = 0;
    middleware = (request, response, next) => {
        response.setHeader('x-arogio-service', 'arogio-health-api');
        const requestId = (0, node_crypto_1.randomUUID)();
        request.id = requestId;
        response.setHeader('x-request-id', requestId);
        const started = performance.now();
        const path = request.path.replace(/\/+$/, '');
        response.on('finish', () => {
            if (!path.startsWith('/api/v1/') ||
                ['/api/v1/diagnostics', '/api/v1/monitoring/requests'].includes(path))
                return;
            const smokeTest = request.headers['x-arogio-diagnostic'] === 'smoke-test';
            const monitor = [
                '/api/v1/health',
                '/api/v1/ready',
                '/api/v1/diagnostics/ping',
                '/api/v1/health/liveness',
                '/api/v1/health/readiness',
                '/api/v1/monitoring/ping',
            ].includes(path);
            const kind = monitor || smokeTest ? 'probe' : 'api';
            const registered = request.route?.path;
            const route = typeof registered === 'string' && !registered.includes('*')
                ? registered
                : '(unmatched API route)';
            const method = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'].includes(request.method)
                ? request.method
                : 'OTHER';
            if (kind === 'probe')
                this.probes += 1;
            else {
                this.apiRequests += 1;
                if (response.statusCode >= 500)
                    this.serverErrors += 1;
                else if (response.statusCode >= 400)
                    this.clientErrors += 1;
            }
            this.recent.unshift({
                timestamp: new Date().toISOString(),
                method,
                route,
                status: response.statusCode,
                durationMs: Math.round((performance.now() - started) * 10) / 10,
                kind,
                requestId,
                authentication: request.user
                    ? 'authenticated'
                    : /^Bearer\s+\S+/i.test(request.headers.authorization ?? '')
                        ? 'provided'
                        : 'absent',
                source: smokeTest ? 'labelled-smoke-test' : monitor ? 'monitor' : 'client',
                response: response.locals.requestDiagnostic ??
                    (response.statusCode >= 400
                        ? (0, response_summary_1.summarizeError)(response.statusCode, `HTTP_${response.statusCode}`, undefined, undefined)
                        : (0, response_summary_1.summarizeSuccess)(response.statusCode)),
                contentType: String(response.getHeader('content-type') ?? '').slice(0, 100),
                responseBytes: response.getHeader('content-length') === undefined
                    ? null
                    : Number(response.getHeader('content-length')),
            });
            this.recent.length = Math.min(this.recent.length, 50);
        });
        next();
    };
    snapshot() {
        return {
            service: 'arogio-health-api',
            instanceId: this.instanceId,
            startedAt: this.startedAt,
            timestamp: new Date().toISOString(),
            apiPrefix: '/api/v1',
            counts: {
                apiRequests: this.apiRequests,
                clientErrors: this.clientErrors,
                serverErrors: this.serverErrors,
                probes: this.probes,
            },
            recent: this.recent.map((event) => ({ ...event })),
        };
    }
};
exports.RequestActivityService = RequestActivityService;
exports.RequestActivityService = RequestActivityService = __decorate([
    (0, common_1.Injectable)()
], RequestActivityService);
//# sourceMappingURL=request-activity.service.js.map