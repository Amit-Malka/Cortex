import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import AppError from '../../utils/AppError';
import catchAsync from '../../utils/catchAsync';
import { signToken, verifyToken } from '../../utils/jwt';
import { initBigIntSerializer } from '../../utils/bigintSerializer';
import errorHandler from '../../middleware/errorHandler';

// ─── AppError ────────────────────────────────────────────────────────────────

describe('AppError', () => {
  it('sets status to "fail" for 4xx codes', () => {
    expect(new AppError('Not found', 404).status).toBe('fail');
    expect(new AppError('Unauthorized', 401).status).toBe('fail');
    expect(new AppError('Bad request', 400).status).toBe('fail');
  });

  it('sets status to "error" for 5xx codes', () => {
    expect(new AppError('Server error', 500).status).toBe('error');
    expect(new AppError('Unavailable', 503).status).toBe('error');
  });

  it('always sets isOperational to true', () => {
    expect(new AppError('test', 400).isOperational).toBe(true);
    expect(new AppError('test', 500).isOperational).toBe(true);
  });

  it('inherits from Error with correct message', () => {
    const err = new AppError('Something failed', 422);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('Something failed');
    expect(err.statusCode).toBe(422);
  });
});

// ─── catchAsync ──────────────────────────────────────────────────────────────

describe('catchAsync', () => {
  const mockReq = {} as Request;
  const mockRes = {} as Response;
  const mockNext = jest.fn() as unknown as NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the wrapped function with req, res, next', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    const wrapped = catchAsync(handler as any);
    wrapped(mockReq, mockRes, mockNext);
    await Promise.resolve();
    expect(handler).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
  });

  it('calls next(error) when the handler rejects', async () => {
    const error = new Error('boom');
    const handler = jest.fn().mockRejectedValue(error);
    const wrapped = catchAsync(handler as any);
    wrapped(mockReq, mockRes, mockNext);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(mockNext).toHaveBeenCalledWith(error);
  });

  it('does not call next when the handler resolves', async () => {
    const handler = jest.fn().mockResolvedValue('ok');
    const wrapped = catchAsync(handler as any);
    wrapped(mockReq, mockRes, mockNext);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(mockNext).not.toHaveBeenCalled();
  });
});

// ─── JWT ─────────────────────────────────────────────────────────────────────

describe('jwt utils', () => {
  const userId = 'user-abc-123';

  it('signToken returns a three-part JWT string', () => {
    const token = signToken(userId);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('verifyToken decodes the userId from a signed token', () => {
    const token = signToken(userId);
    const payload = verifyToken(token);
    expect(payload.userId).toBe(userId);
  });

  it('verifyToken throws on an invalid token', () => {
    expect(() => verifyToken('not.a.valid.jwt')).toThrow();
  });

  it('verifyToken throws on a tampered token', () => {
    const token = signToken(userId);
    const tampered = token.slice(0, -5) + 'XXXXX';
    expect(() => verifyToken(tampered)).toThrow();
  });

  it('signToken throws when JWT_SECRET is missing', () => {
    const original = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    expect(() => signToken(userId)).toThrow('JWT_SECRET is not defined');
    process.env.JWT_SECRET = original;
  });

  it('verifyToken throws when JWT_SECRET is missing', () => {
    const token = signToken(userId);
    const original = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    expect(() => verifyToken(token)).toThrow('JWT_SECRET is not defined');
    process.env.JWT_SECRET = original;
  });
});

// ─── BigInt Serializer ────────────────────────────────────────────────────────

describe('initBigIntSerializer', () => {
  it('serializes BigInt values to strings in JSON.stringify', () => {
    initBigIntSerializer();
    const result = JSON.stringify({ size: BigInt(9999999999999) });
    expect(result).toBe('{"size":"9999999999999"}');
  });

  it('serializes BigInt(0) correctly', () => {
    initBigIntSerializer();
    expect(JSON.stringify({ n: BigInt(0) })).toBe('{"n":"0"}');
  });
});

// ─── errorHandler middleware ──────────────────────────────────────────────────

describe('errorHandler middleware', () => {
  const makeRes = () => {
    const res = {
      status: jest.fn(),
      json: jest.fn(),
    } as unknown as Response;
    (res.status as jest.Mock).mockReturnValue(res);
    return res;
  };

  const req = {} as Request;
  const next = jest.fn() as unknown as NextFunction;

  afterEach(() => {
    process.env.NODE_ENV = 'test';
  });

  it('in development mode, sends full error details including stack', () => {
    process.env.NODE_ENV = 'development';
    const err = new AppError('Dev error', 400);
    const res = makeRes();
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    const body = (res.json as jest.Mock).mock.calls[0][0] as any;
    expect(body.message).toBe('Dev error');
    expect(body.stack).toBeDefined();
  });

  it('in production mode, sends message but not stack for operational errors', () => {
    process.env.NODE_ENV = 'production';
    const err = new AppError('Operational error', 404);
    const res = makeRes();
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    const body = (res.json as jest.Mock).mock.calls[0][0] as any;
    expect(body.message).toBe('Operational error');
    expect(body.stack).toBeUndefined();
  });

  it('in production mode, hides details for non-operational errors', () => {
    process.env.NODE_ENV = 'production';
    const err = new Error('Raw unhandled error');
    const res = makeRes();
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    const body = (res.json as jest.Mock).mock.calls[0][0] as any;
    expect(body.message).toBe('Something went wrong');
  });

  it('preserves statusCode and status from AppError', () => {
    process.env.NODE_ENV = 'development';
    const err = new AppError('Forbidden', 403);
    const res = makeRes();
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    const body = (res.json as jest.Mock).mock.calls[0][0] as any;
    expect(body.status).toBe('fail');
  });

  it('wraps non-AppError as 500 in development', () => {
    process.env.NODE_ENV = 'development';
    const err = new Error('Generic error');
    const res = makeRes();
    errorHandler(err, req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
