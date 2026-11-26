type Video = readonly [
    id: string,
    title: string,
    description: string,
    durationSeconds: number | null
];
export declare const wellnessVideos: {
    yoga: {
        video: Video;
        author: string;
        titleHi: string;
    }[];
    meditation: {
        video: Video;
        author: string;
        titleHi: string;
    }[];
};
export {};
