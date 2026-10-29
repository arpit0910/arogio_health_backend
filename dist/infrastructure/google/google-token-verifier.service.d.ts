import { ConfigService } from '@nestjs/config';
export interface VerifiedGoogleIdentity {
    subject: string;
    email: string | null;
    emailVerified: boolean;
    name: string | null;
}
export declare abstract class GoogleTokenVerifier {
    abstract verify(idToken: string): Promise<VerifiedGoogleIdentity>;
}
export declare class GoogleTokenVerifierService implements GoogleTokenVerifier {
    private readonly client;
    private readonly audiences;
    constructor(config: ConfigService);
    verify(idToken: string): Promise<VerifiedGoogleIdentity>;
}
