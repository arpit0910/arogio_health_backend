import type { RequestUser } from '../../../common/authentication/request-user';
import { JeevaAssistantService } from '../services/jeeva-assistant.service';
export declare class JeevaAssistantController {
    private readonly chat;
    constructor(chat: JeevaAssistantService);
    reply(user: RequestUser, body: unknown): Promise<{
        message: {
            role: "assistant";
            content: string;
        };
        kind: "medication" | "urgent" | "harmful" | "off_topic";
        createdAt: string;
        savedHealthIncluded: boolean;
    } | {
        message: {
            role: "assistant";
            content: string;
        };
        kind: "answer";
        createdAt: string;
        savedHealthIncluded: boolean;
    }>;
}
