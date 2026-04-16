import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../errors/errors.js';
import { getSupabaseClient } from '../../infra/database/supabase.js';

export interface AuthenticatedRequest extends Request {
  userId: string;
  headers: {
    authorization?: string;
  };
  params: {
    marketplace: string;
    id: string;
  };
  query: {
    code?: string;
    shop_id?: string;
  };
}

export type AuthenticatedResponse = Response;

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = (req as AuthenticatedRequest).headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7);
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    (req as AuthenticatedRequest).userId = data.user.id;
    next();
  } catch (error) {
    next(error);
  }
}