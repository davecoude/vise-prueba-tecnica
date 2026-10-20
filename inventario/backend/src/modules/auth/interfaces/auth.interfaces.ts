import { Request } from 'express';

// Claims que viajan dentro del JWT. `sub` es string según el RFC 7519
export interface JwtPayload {
  sub: string;
  email: string;
}

// usuario autenticado que el guard adjunta al request
export interface AuthenticatedUser {
  id: number;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
}