"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLoggerConfig = createLoggerConfig;
const node_crypto_1 = require("node:crypto");
function createLoggerConfig(config) {
    return {
        pinoHttp: {
            level: config.getOrThrow('LOG_LEVEL'),
            genReqId(request, response) {
                const incoming = request.headers['x-request-id'];
                const requestId = typeof incoming === 'string' && incoming.length <= 128 ? incoming : (0, node_crypto_1.randomUUID)();
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
                    return { id: request.id, method: request.method, url: request.url };
                },
            },
        },
    };
}
//# sourceMappingURL=logger.config.js.map