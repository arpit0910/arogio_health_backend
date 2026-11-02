import { ConfigService } from '@nestjs/config';
import { appHelp } from './chat.guide';
import { ChatService } from './chat.service';
import type { ChatContextService } from './chat-context.service';

describe('Grounded Arogio help', () => {
  afterEach(() => jest.restoreAllMocks());
  it('uses real water controls without invented plus buttons or drink categories', () => {
    const answer = appHelp('How do I log water in Arogio?', false)!;
    expect(answer).toContain('Log a drink');
    expect(answer).toContain('Other amounts');
    expect(answer).not.toMatch(/plus|type of drink|Settings or Plan/i);
    expect(appHelp('How much water should I drink?', false)).toBeNull();
  });
  it('explains existing clinician schedules without prescribing or recommending a dose', () => {
    expect(appHelp('How do medicine reminders work?', false)).toMatch(
      /already supplied by your clinician/,
    );
    expect(appHelp('Arogio में पानी कैसे दर्ज करूँ?', true)).toMatch(/Water खोलें/);
  });
  it('does not substitute app FAQ copy for general health questions', () => {
    expect(appHelp('What does blood pressure mean?', false)).toBeNull();
  });
  it('explains privacy defaults and does not invent unsupported app tracking', () => {
    expect(appHelp('Does Arogio track blood pressure?', false)).toContain(
      'does not currently log blood pressure',
    );
    expect(appHelp('How does Jeeva use saved health records?', false)).toContain('off by default');
  });
  it('routes app help after safety triage without exposing saved records or generating invented steps', async () => {
    const fetch = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({ choices: [{ message: { content: '{"decision":"allow"}' } }] }),
        ),
      );
    const context = { forUser: jest.fn() };
    const service = new ChatService(
      new ConfigService({ NVIDIA_API_KEY: 'fixture' }),
      context as unknown as ChatContextService,
    );
    const result = await service.reply('account', {
      messages: [{ role: 'user', content: 'How do I log water in Arogio?' }],
    });
    expect(result.kind).toBe('answer');
    expect(result.message.content).toContain('Other amounts');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(context.forUser).not.toHaveBeenCalled();
  });
});
