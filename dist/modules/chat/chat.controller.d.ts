import type { RequestUser } from '../../common/auth/request-user';
import { ChatService } from './chat.service';
export declare class ChatController {
    private readonly chat;
    constructor(chat: ChatService);
    reply(user: RequestUser, body: unknown): Promise<{
        message: {
            role: "assistant";
            content: string;
        };
        createdAt: string;
        savedHealthIncluded: boolean;
    }>;
}
