import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { UnauthorizedError } from '../errors/errors';

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

    const supabaseUrl =
      process.env.SUPABASE_URL ??
      process.env.VITE_SUPABASE_URL ?? '';

    const supabaseAnonKey =
      process.env.SUPABASE_ANON_KEY ??
      process.env.VITE_SUPABASE_ANON_KEY ?? '';

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
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