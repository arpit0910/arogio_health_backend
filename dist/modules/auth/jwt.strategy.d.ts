import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-jwt';
import type { RequestUser } from '../../common/auth/request-user';
interface AccessTokenPayload {
    sub: string;
    sid: string;
}
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    constructor(config: ConfigService);
    validate(payload: AccessTokenPayload): RequestUser;
}
export {};
