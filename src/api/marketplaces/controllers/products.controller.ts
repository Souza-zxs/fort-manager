import { Request, Response, NextFunction } from 'express';
import { ProductsService } from '../services/products.service.js';
import { AuthenticatedResponse } from '../shared/middleware/auth.middleware.js';
import { ProductSyncService } from '../services/product-sync.service.js';

interface AuthenticatedRequest extends Request {
  userId: string;
}

export class ProductsController {
  constructor(private readonly productsService: ProductSyncService) {}  

  listProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).userId;
      const products = await this.productsService.listProducts(userId);
      (res as AuthenticatedResponse).json({ products });
    } catch (err) {
      next(err);
    }
  };

  syncProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as AuthenticatedRequest).userId;
     const { integrationId } = req.params as { integrationId: string };

      // Valida que a integração pertence ao usuário — seguindo o mesmo padrão do IntegrationController
      const result = await this.productsService.syncProducts(integrationId, userId);
      (res as AuthenticatedResponse).json(result);
    } catch (err) {
      next(err);
    }
  };
}