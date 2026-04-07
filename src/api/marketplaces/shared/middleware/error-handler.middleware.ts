import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/errors';

interface ResponseType extends Response {
  status (code: number): ResponseType;
  json: (body: { status: string; message: string }) => ResponseType;
}

export function errorHandler(
  error: Error,
  _req: Request,
  res: ResponseType,
  _next: NextFunction,
): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      status: 'error',
      message: error.message,
    });
    return;
  }

  console.error('[Unhandled Error]', error);

  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
}
