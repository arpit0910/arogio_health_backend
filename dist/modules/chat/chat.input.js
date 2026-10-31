"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatInput = void 0;
const zod_1 = require("zod");
exports.chatInput = zod_1.z
    .object({
    useSavedHealth: zod_1.z.boolean().default(false),
    messages: zod_1.z
        .array(zod_1.z
        .object({
        role: zod_1.z.enum(['user', 'assistant']),
        content: zod_1.z.string().trim().min(1).max(4000),
    })
        .strict())
        .min(1)
        .max(21),
})
    .strict()
    .superRefine(({ messages }, context) => {
    if (messages.some((message, index) => message.role !== (index % 2 === 0 ? 'user' : 'assistant')) ||
        messages.at(-1)?.role !== 'user') {
        context.addIssue({
            code: 'custom',
            message: 'Conversation must alternate and end with your question.',
        });
    }
    if (messages.some((message) => message.role === 'user' && message.content.length > 2000) ||
        messages.reduce((sum, message) => sum + message.content.length, 0) > 20000) {
        context.addIssue({ code: 'custom', message: 'Conversation is too long. Start a new chat.' });
    }
});
//# sourceMappingURL=chat.input.js.map