import { Request, Response, NextFunction } from 'express';
import { MarketplaceAuthService } from '../services/auth.service';
import { MarketplaceSyncService } from '../services/sync.service';
import { IntegrationRepository } from '../repositories/integration.repository';
import { MarketplaceName } from '../types/marketplace.types';
import { BadRequestError } from '../shared/errors/errors';
import { AuthenticatedResponse } from '../shared/middleware/auth.middleware';

interface AuthenticatedRequest extends Request {
  userId: string;
  headers: { 
    authorization?: string; 
  };
  params: Record<string, string>;
  query: {
     code?: string;
      shop_id?: string; 
    };
}


function assertMarketplace(value: string): asserts value is MarketplaceName {
  if (value !== 'shopee' && value !== 'mercadolivre') {
    throw new BadRequestError(`Invalid marketplace: ${value}. Supported: shopee, mercadolivre`);
  }
}

export class IntegrationController {
  constructor(
    private readonly authService: MarketplaceAuthService,
    private readonly syncService: MarketplaceSyncService,
    private readonly integrationRepository: IntegrationRepository,
  ) {}

  getAuthUrl = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { marketplace } = (req as AuthenticatedRequest).params;
      assertMarketplace(marketplace);
      const userId = (req as AuthenticatedRequest).userId;
      const result = this.authService.getAuthorizationUrl(marketplace, userId);
      (res as AuthenticatedResponse).json(result);
    } catch (error) {
      next(error);
    }
  };

  handleCallback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { marketplace } = (req as AuthenticatedRequest).params;
      assertMarketplace(marketplace);

      const userId = (req as AuthenticatedRequest).userId;
      const body = (req as AuthenticatedRequest & { body?: Record<string, unknown> }).body ?? {};
      const code = typeof body.code === 'string' ? body.code : undefined;
      const shop_id = typeof body.shop_id === 'string' ? body.shop_id : undefined;
      const state = typeof body.state === 'string' ? body.state : undefined;

      if (!code) throw new BadRequestError('Missing authorization code');
      if (marketplace === 'mercadolivre' && !state) {
        throw new BadRequestError('Missing OAuth state');
      }
      if (marketplace === 'mercadolivre') {
        this.authService.validateCallbackState(state!, marketplace, userId);
      }

      const integration = await this.authService.handleCallback(marketplace, code, shop_id ?? '', userId);

      // Retorna DTO flat — compatível com CallbackResultDto no frontend
      (res as AuthenticatedResponse).status(201).json({
        id:          integration.id,
        marketplace: integration.marketplace,
        shopName:    integration.shopName,
        shopId:      integration.shopId,
      });
    } catch (error) {
      next(error);
    }
  };

  listIntegrations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).userId;
      const integrations = await this.integrationRepository.findByUserId(userId);
      (res as AuthenticatedResponse).json(
        integrations.map((i) => ({
          id: i.id,
          marketplace: i.marketplace,
          shopName: i.shopName,
          shopId: i.shopId,
          isActive: i.isActive,
          createdAt: i.createdAt,
        })),
      );
    } catch (error) {
      next(error);
    }
  };

  disconnect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = (req as AuthenticatedRequest).params;
      const userId = (req as AuthenticatedRequest).userId;
      await this.integrationRepository.findByIdForUser(id, userId);
      await this.integrationRepository.deactivate(id);
      (res as AuthenticatedResponse).json({ message: 'Integration disconnected' });
    } catch (error) {
      next(error);
    }
  };

  triggerSync = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = (req as AuthenticatedRequest).params;
      const userId = (req as AuthenticatedRequest).userId;
      await this.integrationRepository.findByIdForUser(id, userId);
      const result = await this.syncService.syncOrders(id);
      (res as AuthenticatedResponse).json(result);
    } catch (error) {
      next(error);
    }
  };
}
