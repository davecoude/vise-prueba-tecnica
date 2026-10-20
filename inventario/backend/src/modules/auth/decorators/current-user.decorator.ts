import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedRequest, AuthenticatedUser } from '../interfaces/auth.interfaces';

// inyecta el usuario autenticado
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    // solo ocurriria si se usa en una ruta @Public(): falla de forma explícita
    if (!request.user) throw new UnauthorizedException();
    return request.user;
  },
);