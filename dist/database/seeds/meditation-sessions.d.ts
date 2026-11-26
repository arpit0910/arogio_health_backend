type TimedPrompt = readonly [title: string, instruction: string, seconds: number];
type Session = {
    title: string;
    description: string;
    steps: readonly TimedPrompt[];
};
export declare const meditationSessions: readonly Session[];
export {};
