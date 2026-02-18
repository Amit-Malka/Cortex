import { describe, it, expect, beforeEach } from '@jest/globals';

jest.mock('../../lib/prisma');

jest.mock('openai', () => {
  class APIError extends Error {
    status: number;
    constructor(message: string, _request: unknown, status: number) {
      super(message);
      this.status = status;
    }
  }

  const MockOpenAI: any = jest.fn();
  MockOpenAI.APIError = APIError;

  return { __esModule: true, default: MockOpenAI };
});

import OpenAI from 'openai';
import prisma from '../../lib/prisma';
import llmService from '../../services/llmService';

const MockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

const makeFile = (overrides = {}) => ({
  name: 'Report.pdf',
  mimeType: 'application/pdf',
  size: BigInt(1024),
  modifiedTime: new Date('2024-06-01'),
  ownerName: 'Owner',
  isStarred: false,
  ...overrides,
});

describe('LlmService', () => {
  let mockResponsesCreate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    (llmService as any).client = null;

    process.env.OPENAI_API_KEY = 'test-key';
    process.env.OPENAI_MODEL = 'gpt-test';

    mockResponsesCreate = jest.fn();
    MockedOpenAI.mockImplementation(() => ({
      responses: { create: mockResponsesCreate },
    }) as any);
  });

  // ─── Missing API key ────────────────────────────────────────────────────────

  it('throws AppError 500 when OPENAI_API_KEY is not set', async () => {
    delete process.env.OPENAI_API_KEY;
    (prisma.file.findMany as jest.Mock).mockResolvedValue([makeFile()]);

    await expect(llmService.generateChatResponse('user-1', 'hello')).rejects.toMatchObject({
      statusCode: 500,
      message: expect.stringContaining('OPENAI_API_KEY'),
    });
  });

  // ─── System prompt — no files ───────────────────────────────────────────────

  it('constructs a "no files" system prompt when the user has no files', async () => {
    (prisma.file.findMany as jest.Mock).mockResolvedValue([]);
    mockResponsesCreate.mockResolvedValue({ output_text: 'Please sync your drive.' });

    await llmService.generateChatResponse('user-1', 'what files do I have?');

    const callArgs = mockResponsesCreate.mock.calls[0][0] as any;
    const systemMsg = callArgs.input.find((m: any) => m.role === 'system');
    expect(systemMsg.content).toContain('no files');
  });

  // ─── System prompt — with files ─────────────────────────────────────────────

  it('includes CSV-formatted file data in the system prompt', async () => {
    (prisma.file.findMany as jest.Mock).mockResolvedValue([
      makeFile({ name: 'Budget.xlsx', mimeType: 'application/vnd.ms-excel', size: BigInt(2048) }),
    ]);
    mockResponsesCreate.mockResolvedValue({ output_text: 'You have 1 file.' });

    await llmService.generateChatResponse('user-1', 'list my files');

    const callArgs = mockResponsesCreate.mock.calls[0][0] as any;
    const systemMsg = callArgs.input.find((m: any) => m.role === 'system');
    expect(systemMsg.content).toContain('Budget.xlsx');
    expect(systemMsg.content).toContain('Name,Type,Size,Date,Owner,Starred');
  });

  it('escapes file names containing commas in CSV', async () => {
    (prisma.file.findMany as jest.Mock).mockResolvedValue([
      makeFile({ name: 'Budget, Q1.xlsx' }),
    ]);
    mockResponsesCreate.mockResolvedValue({ output_text: 'ok' });

    await llmService.generateChatResponse('user-1', 'hi');

    const callArgs = mockResponsesCreate.mock.calls[0][0] as any;
    const systemMsg = callArgs.input.find((m: any) => m.role === 'system');
    expect(systemMsg.content).toContain('"Budget, Q1.xlsx"');
  });

  it('appends the user message to the input array', async () => {
    (prisma.file.findMany as jest.Mock).mockResolvedValue([]);
    mockResponsesCreate.mockResolvedValue({ output_text: 'response' });

    await llmService.generateChatResponse('user-1', 'my question');

    const callArgs = mockResponsesCreate.mock.calls[0][0] as any;
    const userMsg = callArgs.input.find((m: any) => m.role === 'user');
    expect(userMsg.content).toBe('my question');
  });

  it('appends additional context as a second system message when provided', async () => {
    (prisma.file.findMany as jest.Mock).mockResolvedValue([]);
    mockResponsesCreate.mockResolvedValue({ output_text: 'ok' });

    await llmService.generateChatResponse('user-1', 'hi', 'extra context here');

    const callArgs = mockResponsesCreate.mock.calls[0][0] as any;
    const contextMsg = callArgs.input.find((m: any) => m.content?.includes('extra context here'));
    expect(contextMsg).toBeDefined();
  });

  // ─── Response parsing ────────────────────────────────────────────────────────

  it('returns output_text from the response', async () => {
    (prisma.file.findMany as jest.Mock).mockResolvedValue([]);
    mockResponsesCreate.mockResolvedValue({ output_text: 'Here is my answer.' });

    const reply = await llmService.generateChatResponse('user-1', 'hi');

    expect(reply).toBe('Here is my answer.');
  });

  it('falls back to output array with text property', async () => {
    (prisma.file.findMany as jest.Mock).mockResolvedValue([]);
    mockResponsesCreate.mockResolvedValue({
      output: [{ text: 'Answer from output array.' }],
    });

    const reply = await llmService.generateChatResponse('user-1', 'hi');

    expect(reply).toBe('Answer from output array.');
  });

  it('falls back to choices[0].message.content (chat completion format)', async () => {
    (prisma.file.findMany as jest.Mock).mockResolvedValue([]);
    mockResponsesCreate.mockResolvedValue({
      choices: [{ message: { content: 'Legacy format reply.' } }],
    });

    const reply = await llmService.generateChatResponse('user-1', 'hi');

    expect(reply).toBe('Legacy format reply.');
  });

  it('returns refusal message when response has a refusal', async () => {
    (prisma.file.findMany as jest.Mock).mockResolvedValue([]);
    mockResponsesCreate.mockResolvedValue({ refusal: 'I cannot help with that.' });

    const reply = await llmService.generateChatResponse('user-1', 'bad request');

    expect(reply).toContain('I cannot help with that.');
  });

  it('throws AppError when no parseable reply is found', async () => {
    (prisma.file.findMany as jest.Mock).mockResolvedValue([]);
    mockResponsesCreate.mockResolvedValue({ status: 'incomplete', id: 'x', object: 'y' });

    await expect(llmService.generateChatResponse('user-1', 'hi')).rejects.toMatchObject({
      statusCode: 500,
    });
  });

  // ─── OpenAI error code mapping ───────────────────────────────────────────────

  it('throws AppError 401 for OpenAI 401 error', async () => {
    (prisma.file.findMany as jest.Mock).mockResolvedValue([]);
    const apiError = new (OpenAI as any).APIError('Unauthorized', null, 401);
    mockResponsesCreate.mockRejectedValue(apiError);

    await expect(llmService.generateChatResponse('user-1', 'hi')).rejects.toMatchObject({
      statusCode: 401,
      message: expect.stringContaining('Invalid OpenAI API key'),
    });
  });

  it('throws AppError 429 for OpenAI rate limit error', async () => {
    (prisma.file.findMany as jest.Mock).mockResolvedValue([]);
    const apiError = new (OpenAI as any).APIError('Rate limited', null, 429);
    mockResponsesCreate.mockRejectedValue(apiError);

    await expect(llmService.generateChatResponse('user-1', 'hi')).rejects.toMatchObject({
      statusCode: 429,
    });
  });

  it('throws AppError 503 for OpenAI 500 error', async () => {
    (prisma.file.findMany as jest.Mock).mockResolvedValue([]);
    const apiError = new (OpenAI as any).APIError('Server error', null, 500);
    mockResponsesCreate.mockRejectedValue(apiError);

    await expect(llmService.generateChatResponse('user-1', 'hi')).rejects.toMatchObject({
      statusCode: 503,
    });
  });
});
