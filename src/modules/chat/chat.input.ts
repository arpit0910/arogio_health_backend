import { z } from 'zod';

export const chatInput = z
  .object({
    useSavedHealth: z.boolean().default(false),
    messages: z
      .array(
        z
          .object({
            role: z.enum(['user', 'assistant']),
            content: z.string().trim().min(1).max(4000),
          })
          .strict(),
      )
      .min(1)
      .max(21),
  })
  .strict()
  .superRefine(({ messages }, context) => {
    if (
      messages.some(
        (message, index) => message.role !== (index % 2 === 0 ? 'user' : 'assistant'),
      ) ||
      messages.at(-1)?.role !== 'user'
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Conversation must alternate and end with your question.',
      });
    }
    if (
      messages.some((message) => message.role === 'user' && message.content.length > 2000) ||
      messages.reduce((sum, message) => sum + message.content.length, 0) > 20000
    ) {
      context.addIssue({ code: 'custom', message: 'Conversation is too long. Start a new chat.' });
    }
  });
