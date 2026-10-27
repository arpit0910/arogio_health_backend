import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { ConfigService } from '@nestjs/config';
import type { Params } from 'nestjs-pino';

export function createLoggerConfig(config: ConfigService): Params {
  return {
    pinoHttp: {
      level: config.getOrThrow<string>('LOG_LEVEL'),
      genReqId(request, response) {
        // Correlation IDs must be server-generated before they enter the public monitor.
        const requestId = randomUUID();
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
        req(request: IncomingMessage & { id?: string }) {
          return { id: request.id, method: request.method, url: request.url };
        },
      },
    },
  };
}
