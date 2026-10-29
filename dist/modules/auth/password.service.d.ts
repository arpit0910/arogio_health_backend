export declare class PasswordService {
    private readonly dummyHash;
    hash(password: string): Promise<string>;
    verify(passwordHash: string | null | undefined, password: string): Promise<boolean>;
}
