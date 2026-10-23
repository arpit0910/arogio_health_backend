export interface SmsProvider {
  sendOtp(destination: string, code: string): Promise<void>;
}
