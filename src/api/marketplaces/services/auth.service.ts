import { getAdapter } from '../adapters/adapter.registry';
import { IntegrationRepository } from '../repositories/integration.repository';
import {
  Integration,
  CreateIntegrationDto,
  UpdateTokensDto,
  MarketplaceName,
  MarketplaceAuthorizationUrl,
} from '../types/marketplace.types';
import { BadRequestError, TokenExpiredError } from '../shared/errors/errors';
import { secondsFromNow, isTokenNearExpiry, generateState } from '../shared/utils/index';
import { createHmac, timingSafeEqual } from 'crypto';

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

// Retry config for ML API
const RETRY_MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1000;
const RETRY_MAX_DELAY_MS = 5000;


interface OAuthStatePayload {
  nonce: string;
  marketplace: MarketplaceName;
  userId: string;
  issuedAt: number;
}

export class MarketplaceAuthService {
  constructor(private readonly integrationRepository: IntegrationRepository) {}

  getAuthorizationUrl(marketplace: MarketplaceName, userId: string): MarketplaceAuthorizationUrl {
    const adapter = getAdapter(marketplace);
    const state = this.createState({
      nonce: generateState(),
      marketplace,
      userId,
      issuedAt: Date.now(),
    });
    return adapter.getAuthorizationUrl(state);
  }

  validateCallbackState(state: string, marketplace: MarketplaceName, userId: string): void {
    const payload = this.parseState(state);

    if (!payload) {
      throw new BadRequestError('Invalid OAuth state');
    }

    if (payload.marketplace !== marketplace) {
      throw new BadRequestError('OAuth state marketplace mismatch');
    }

    if (payload.userId !== userId) {
      throw new BadRequestError('OAuth state user mismatch');
    }

    if (Date.now() - payload.issuedAt > OAUTH_STATE_TTL_MS) {
      throw new BadRequestError('OAuth state expired. Please restart the connection flow.');
    }
  }

  async handleCallback(
    marketplace: MarketplaceName,
    code: string,
    shopId: string,
    userId: string,
  ): Promise<Integration> {
    const adapter = getAdapter(marketplace);
    const tokens = await adapter.exchangeCode(code, shopId);

    const dto: CreateIntegrationDto = {
      userId,
      marketplace,
      shopId: tokens.shopId || shopId,
      shopName: tokens.shopName,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessTokenExpiresAt: secondsFromNow(tokens.accessTokenExpiresIn),
      refreshTokenExpiresAt: secondsFromNow(tokens.refreshTokenExpiresIn),
    };

    return this.integrationRepository.upsert(dto);
  }

  async getValidAccessToken(integration: Integration): Promise<string> {
    if (!isTokenNearExpiry(integration.accessTokenExpiresAt)) {
      return integration.accessToken;
    }

    if (isTokenNearExpiry(integration.refreshTokenExpiresAt)) {
      throw new TokenExpiredError(integration.marketplace);
    }

    return this.refreshAndPersistWithRetry(integration);
  }

  /**
   * Refresh token with exponential backoff retry
   */
  private async refreshAndPersistWithRetry(integration: Integration): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= RETRY_MAX_ATTEMPTS; attempt++) {
      try {
        return await this.refreshAndPersist(integration);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Only retry on transient errors
        const isRetryable = this.isRetryableError(error);
        if (!isRetryable || attempt === RETRY_MAX_ATTEMPTS) {
          console.error(`[ML] Token refresh failed after ${attempt} attempt(s): ${lastError.message}`);
          throw lastError;
        }

        const delay = Math.min(
          RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1),
          RETRY_MAX_DELAY_MS
        );
        console.warn(`[ML] Token refresh attempt ${attempt} failed, retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      // Retry on network errors, timeouts, 503, 429, 5xx
      return (
        message.includes('timeout') ||
        message.includes('econnrefused') ||
        message.includes('socket') ||
        message.includes('503') ||
        message.includes('429') ||
        message.includes('rate limit') ||
        message.includes('service unavailable')
      );
    }
    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async refreshAndPersist(integration: Integration): Promise<string> {
    const adapter = getAdapter(integration.marketplace);
    const tokens = await adapter.refreshTokens(integration.refreshToken, integration.shopId);

    const dto: UpdateTokensDto = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessTokenExpiresAt: secondsFromNow(tokens.accessTokenExpiresIn),
      refreshTokenExpiresAt: secondsFromNow(tokens.refreshTokenExpiresIn),
    };

    await this.integrationRepository.updateTokens(integration.id, dto);
    return tokens.accessToken;
  }

  private createState(payload: OAuthStatePayload): string {
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', this.getStateSecret())
      .update(encodedPayload)
      .digest('base64url');
    return `${encodedPayload}.${signature}`;
  }

  private parseState(state: string): OAuthStatePayload | null {
    const [encodedPayload, signature] = state.split('.');
    if (!encodedPayload || !signature) return null;

    const expectedSignature = createHmac('sha256', this.getStateSecret())
      .update(encodedPayload)
      .digest('base64url');

    const signatureBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    if (signatureBuffer.length !== expectedBuffer.length) return null;
    if (!timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

    try {
      const parsed = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8'),
      ) as OAuthStatePayload;

      if (
        typeof parsed?.nonce !== 'string' ||
        typeof parsed?.marketplace !== 'string' ||
        typeof parsed?.userId !== 'string' ||
        typeof parsed?.issuedAt !== 'number'
      ) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  private getStateSecret(): string {
    const secret = process.env.OAUTH_STATE_SECRET ?? process.env.SUPABASE_JWT_SECRET;
    if (!secret) {
      throw new Error('Missing OAUTH_STATE_SECRET (or SUPABASE_JWT_SECRET) for OAuth state validation');
    }
    return secret;
  }
}


