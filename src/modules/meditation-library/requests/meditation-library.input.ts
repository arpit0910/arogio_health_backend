import { z } from 'zod';

export function youtubeVideoId(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    const parts = url.pathname.split('/').filter(Boolean);
    const id =
      host === 'youtu.be' && parts.length === 1
        ? parts[0]
        : ['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(host)
          ? url.pathname === '/watch'
            ? url.searchParams.get('v')
            : parts.length === 2 && ['embed', 'shorts', 'live'].includes(parts[0]!)
              ? parts[1]
              : null
          : null;
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
function safeMediaUrl(value: string): boolean {
  if (!value) return true;
  if (/^posture:[a-z0-9-]+$/i.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

export const meditationInput = z
  .object({
    kind: z.enum(['video', 'practice']),
    section: z.enum(['affirmations', 'meditation', 'breathing', 'grounding', 'yoga', 'focus', 'rest']),
    title_en: z.string().trim().min(1).max(160),
    title_hi: z.string().trim().max(160).default(''),
    description_en: z.string().trim().max(1000).default(''),
    description_hi: z.string().trim().max(1000).default(''),
    preparation_en: z.string().trim().max(2000).default(''),
    preparation_hi: z.string().trim().max(2000).default(''),
    impact_en: z.string().trim().max(1000).default(''),
    impact_hi: z.string().trim().max(1000).default(''),
    sanskritName: z.string().trim().max(160).default(''),
    difficulty: z.enum(['gentle', 'beginner', 'intermediate']).default('gentle'),
    imageUrl: z.string().trim().max(500).default('').refine(safeMediaUrl, 'Enter a valid HTTPS image URL or posture key.'),
    audioUrl: z.string().trim().max(500).default('').refine((v) => !v || (safeMediaUrl(v) && !v.startsWith('posture:')), 'Enter a valid HTTPS audio URL.'),
    author: z.string().trim().max(160).default(''),
    youtubeUrl: z.string().trim().max(500).default(''),
    durationSeconds: z.number().int().min(1).max(14400).nullable().default(null),
    steps: z
      .array(
        z
          .object({
            title_en: z.string().trim().min(1).max(160),
            title_hi: z.string().trim().max(160).default(''),
            instruction_en: z.string().trim().min(1).max(2000),
            instruction_hi: z.string().trim().max(2000).default(''),
            seconds: z.number().int().min(1).max(900),
            sanskritName: z.string().trim().max(160).optional(),
            imageUrl: z.string().trim().max(500).refine(safeMediaUrl, 'Enter a valid HTTPS image URL or posture key.').optional(),
            impact_en: z.string().trim().max(1000).optional(),
            impact_hi: z.string().trim().max(1000).optional(),
            videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/).nullable().optional(),
            phase: z.enum(['warmup', 'main', 'cooldown']).optional(),
          })
          .strict(),
      )
      .max(40)
      .default([]),
    repeat: z.number().int().min(1).max(60).default(1),
    published: z.boolean().default(false),
    sortOrder: z.number().int().min(0).max(100000).default(0),
    expectedUpdatedAt: z.iso.datetime({ offset: true }).optional(),
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
    } else {
      if (value.youtubeUrl && !youtubeVideoId(value.youtubeUrl))
        ctx.addIssue({
          code: 'custom',
          path: ['youtubeUrl'],
          message: 'Enter a valid HTTPS YouTube video link.',
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
export const meditationListInput = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  search: z.string().trim().max(150).default(''),
  section: z.enum(['affirmations', 'meditation', 'breathing', 'grounding', 'yoga', 'focus', 'rest']).optional(),
  kind: z.enum(['video', 'practice']).optional(),
});
