"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLoggerConfig = createLoggerConfig;
const node_crypto_1 = require("node:crypto");
function createLoggerConfig(config) {
    return {
        pinoHttp: {
            level: config.getOrThrow('LOG_LEVEL'),
            genReqId(request, response) {
                const requestId = (0, node_crypto_1.randomUUID)();
                response.setHeader('x-request-id', requestId);
                return requestId;
            },
            redact: {
                paths: [
                    'req.headers.authorization',
                    'req.headers.cookie',
                    'req.body.password',
                    'req.body.refreshToken',
                    'req.body.idToken',
                    'res.headers["set-cookie"]',
                ],
                censor: '[REDACTED]',
            },
            serializers: {
                req(request) {
                    return {
                        id: request.id,
                        method: request.method,
                        url: request.url?.startsWith('/api/v1/wellness')
                            ? '/api/v1/wellness/[private]'
                            : request.url,
                    };
                },
            },
        },
    };
}
//# sourceMappingURL=logger.config.js.map