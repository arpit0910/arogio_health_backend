import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';
import { containsDose, immediateConcern } from './chat.safety';
import type { ChatContextService } from './chat-context.service';

const response = (content: string) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }));
const decision = (value: string) => response(JSON.stringify({ decision: value }));
const input = (content: string) => ({ messages: [{ role: 'user', content }] });
const service = (key = 'test-key') =>
  new ChatService(new ConfigService({ NVIDIA_API_KEY: key }), {
    forUser: jest.fn(),
  } as unknown as ChatContextService);

describe('Jeeva safety routing', () => {
  afterEach(() => jest.restoreAllMocks());
  it.each(["I can't breathe", 'I want to kill myself', 'मुझे सांस नहीं आ रही है'])(
    'routes an urgent disclosure without a provider or saved health access: %s',
    async (text) => {
      const fetch = jest.spyOn(globalThis, 'fetch');
      const result = await service('').reply('account', input(text));
      expect(result.kind).toBe('urgent');
      expect(result.savedHealthIncluded).toBe(false);
      expect(fetch).not.toHaveBeenCalled();
      expect(result.message.content).not.toContain(text);
    },
  );
  it.each(['medication', 'harmful', 'urgent', 'off_topic'])(
    'returns only approved copy for a classified %s request',
    async (category) => {
      const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(decision(category));
      const result = await service().reply(
        'account',
        input('A question requiring a safety decision'),
      );
      expect(result.kind).toBe(category);
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );
  it.each([
    'What dose of paracetamol should I take?',
    'Which medicine should I take for fever?',
    'दवा कितनी लेनी चाहिए?',
  ])('blocks a clear prescribing request without an external call: %s', async (text) => {
    const fetch = jest.spyOn(globalThis, 'fetch');
    expect(await service('').reply('account', input(text))).toMatchObject({ kind: 'medication' });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('withholds an unsafe generated reply before it reaches the client', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(decision('allow'))
      .mockResolvedValueOnce(response('Start the fictional drug for your symptoms.'))
      .mockResolvedValueOnce(decision('medication'));
    const result = await service().reply('account', input('What could help me feel better?'));
    expect(result.kind).toBe('medication');
    expect(result.message.content).not.toContain('fictional drug');
  });
  it('also blocks numeric dose content independently of the model verdict', async () => {
    const fetch = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(decision('allow'))
      .mockResolvedValueOnce(response('Take 500 mg of the medicine.'));
    const result = await service().reply('account', input('Explain my medicine'));
    expect(result.kind).toBe('medication');
    expect(result.message.content).not.toContain('500');
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('allows reviewed general health education and app navigation, preserving the original answer', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(decision('allow'))
      .mockResolvedValueOnce(response('Open Water and choose Log a drink.'))
      .mockResolvedValueOnce(decision('allow'));
    const result = await service().reply(
      'account',
      input('Can you explain a healthy sleep routine?'),
    );
    expect(result).toMatchObject({
      kind: 'answer',
      message: { content: 'Open Water and choose Log a drink.' },
    });
  });
  it.each(['not-json', '{"decision":"allow","extra":"bypass"}', '{"decision":"unknown"}'])(
    'fails closed on malformed safety decisions: %s',
    async (content) => {
      const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(response(content));
      await expect(service().reply('account', input('Explain sleep'))).rejects.toMatchObject({
        code: 'CHAT_UNAVAILABLE',
      });
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );
  it('never returns the candidate if the final safety review fails', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(decision('allow'))
      .mockResolvedValueOnce(response('Unreviewed candidate'))
      .mockRejectedValueOnce(new Error('review unavailable'));
    await expect(service().reply('account', input('Explain sleep'))).rejects.toMatchObject({
      code: 'CHAT_UNAVAILABLE',
    });
  });
  it('shares one timeout across triage, answer and review', async () => {
    const fetch = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(decision('allow'))
      .mockResolvedValueOnce(response('General sleep information.'))
      .mockResolvedValueOnce(decision('allow'));
    await service().reply('account', input('What is sleep?'));
    expect(new Set(fetch.mock.calls.map(([, options]) => options?.signal)).size).toBe(1);
  });
  it('does not confuse educational emergency terms or hydration measurements with immediate danger or drug doses', () => {
    expect(immediateConcern('What is a stroke?')).toBe(false);
    expect(containsDose('Your water log has 250 ml.')).toBe(false);
    expect(containsDose('Take two tablets.')).toBe(true);
    expect(containsDose('Take 5 ml of syrup.')).toBe(true);
    expect(containsDose('Use two puffs.')).toBe(true);
    expect(containsDose('Glucose readings use mg/dL, for example 100 mg/dL.')).toBe(false);
    expect(containsDose('५०० मिलीग्राम')).toBe(true);
  });
});
