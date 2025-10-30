import { Request, Response, NextFunction } from 'express';
import { ZodObject, ZodError } from 'zod';
import { AppError } from './error.middleware';

export const validateRequest = (schema: ZodObject<any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessage = error.issues.map(
          (err: any) => `${err.path.join('.')}: ${err.message}`
        ).join(', ');

        next(new AppError(errorMessage, 400));
      } else {
        next(error);
      }
    }
  };
};