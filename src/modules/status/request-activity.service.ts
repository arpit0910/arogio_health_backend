import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import {
  type ResponseSummary,
  summarizeSuccess,
  summarizeError,
} from '../../common/logging/response-summary';

interface RequestEvent {
  timestamp: string;
  method: string;
  route: string;
  status: number;
  durationMs: number;
  kind: 'api' | 'probe';
  requestId: string;
  authentication: 'absent' | 'provided' | 'authenticated';
  source: 'client' | 'monitor' | 'labelled-smoke-test';
  response: ResponseSummary;
  contentType: string;
  responseBytes: number | null;
}

@Injectable()
export class RequestActivityService {
  private readonly instanceId = randomUUID();
  private readonly startedAt = new Date().toISOString();
  private readonly recent: RequestEvent[] = [];
  private apiRequests = 0;
  private clientErrors = 0;
  private serverErrors = 0;
  private probes = 0;

  // Finish listeners also observe requests rejected by guards or validation.
  readonly middleware = (request: Request, response: Response, next: NextFunction): void => {
    response.setHeader('x-arogio-service', 'arogio-health-api');
    const requestId = randomUUID();
    (request as Request & { id: string }).id = requestId;
    response.setHeader('x-request-id', requestId);
    const started = performance.now();
    const path = request.path.replace(/\/+$/, '');
    response.on('finish', () => {
      if (
        !path.startsWith('/api/v1/') ||
        ['/api/v1/diagnostics', '/api/v1/monitoring/requests'].includes(path)
      )
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
      // Store registered route patterns only. Never store raw URLs, query strings,
      // bodies, headers or IPs. The published request ID is generated above.
      const registered: unknown = (request.route as { path?: unknown } | undefined)?.path;
      const route =
        typeof registered === 'string' && !registered.includes('*')
          ? registered
          : '(unmatched API route)';
      const method = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'].includes(
        request.method,
      )
        ? request.method
        : 'OTHER';
      if (kind === 'probe') this.probes += 1;
      else {
        this.apiRequests += 1;
        if (response.statusCode >= 500) this.serverErrors += 1;
        else if (response.statusCode >= 400) this.clientErrors += 1;
      }
      this.recent.unshift({
        timestamp: new Date().toISOString(),
        method,
        route,
        status: response.statusCode,
        durationMs: Math.round((performance.now() - started) * 10) / 10,
        kind,
        requestId,
        authentication: (request as Request & { user?: unknown }).user
          ? 'authenticated'
          : /^Bearer\s+\S+/i.test(request.headers.authorization ?? '')
            ? 'provided'
            : 'absent',
        source: smokeTest ? 'labelled-smoke-test' : monitor ? 'monitor' : 'client',
        response:
          (response.locals.requestDiagnostic as ResponseSummary | undefined) ??
          (response.statusCode >= 400
            ? summarizeError(
                response.statusCode,
                `HTTP_${response.statusCode}`,
                undefined,
                undefined,
              )
            : summarizeSuccess(response.statusCode)),
        contentType: String(response.getHeader('content-type') ?? '').slice(0, 100),
        responseBytes:
          response.getHeader('content-length') === undefined
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
}
