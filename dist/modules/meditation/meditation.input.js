"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meditationListInput = exports.meditationInput = void 0;
exports.youtubeVideoId = youtubeVideoId;
const zod_1 = require("zod");
function youtubeVideoId(value) {
    try {
        const url = new URL(value);
        if (url.protocol !== 'https:' || url.username || url.password || url.port)
            return null;
        const host = url.hostname.toLowerCase();
        const parts = url.pathname.split('/').filter(Boolean);
        const id = host === 'youtu.be' && parts.length === 1
            ? parts[0]
            : ['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(host)
                ? url.pathname === '/watch'
                    ? url.searchParams.get('v')
                    : parts.length === 2 && ['embed', 'shorts', 'live'].includes(parts[0])
                        ? parts[1]
                        : null
                : null;
        return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }
    catch {
        return null;
    }
}
exports.meditationInput = zod_1.z
    .object({
    kind: zod_1.z.enum(['video', 'practice']),
    section: zod_1.z.enum(['affirmations', 'meditation', 'breathing', 'grounding']),
    title_en: zod_1.z.string().trim().min(1).max(160),
    title_hi: zod_1.z.string().trim().max(160).default(''),
    description_en: zod_1.z.string().trim().max(1000).default(''),
    description_hi: zod_1.z.string().trim().max(1000).default(''),
    preparation_en: zod_1.z.string().trim().max(2000).default(''),
    preparation_hi: zod_1.z.string().trim().max(2000).default(''),
    author: zod_1.z.string().trim().max(160).default(''),
    youtubeUrl: zod_1.z.string().trim().max(500).default(''),
    durationSeconds: zod_1.z.number().int().min(1).max(14400).nullable().default(null),
    steps: zod_1.z
        .array(zod_1.z
        .object({
        title_en: zod_1.z.string().trim().min(1).max(160),
        title_hi: zod_1.z.string().trim().max(160).default(''),
        instruction_en: zod_1.z.string().trim().min(1).max(2000),
        instruction_hi: zod_1.z.string().trim().max(2000).default(''),
        seconds: zod_1.z.number().int().min(1).max(900),
    })
        .strict())
        .max(40)
        .default([]),
    repeat: zod_1.z.number().int().min(1).max(60).default(1),
    published: zod_1.z.boolean().default(false),
    sortOrder: zod_1.z.number().int().min(0).max(100000).default(0),
    expectedUpdatedAt: zod_1.z.iso.datetime({ offset: true }).optional(),
})
    .strict()
    .superRefine((value, ctx) => {
    if (value.kind === 'video') {
        if (!youtubeVideoId(value.youtubeUrl))
            ctx.addIssue({
                code: 'custom',
                path: ['youtubeUrl'],
                message: 'Enter a valid HTTPS YouTube video link.',
            });
        if (value.steps.length || value.repeat !== 1)
            ctx.addIssue({
                code: 'custom',
                path: ['steps'],
                message: 'Videos cannot contain timed steps or repeats.',
            });
    }
    else {
        if (value.youtubeUrl)
            ctx.addIssue({
                code: 'custom',
                path: ['youtubeUrl'],
                message: 'Guided practices use steps, not a video URL.',
            });
        const duration = value.steps.reduce((sum, step) => sum + step.seconds, 0) * value.repeat;
        if (!value.steps.length || duration > 3600)
            ctx.addIssue({
                code: 'custom',
                path: ['steps'],
                message: 'Add timed steps with a total duration of up to 60 minutes.',
            });
    }
});
exports.meditationListInput = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).max(10000).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(24),
    search: zod_1.z.string().trim().max(150).default(''),
    section: zod_1.z.enum(['affirmations', 'meditation', 'breathing', 'grounding']).optional(),
    kind: zod_1.z.enum(['video', 'practice']).optional(),
});
//# sourceMappingURL=meditation.input.js.map