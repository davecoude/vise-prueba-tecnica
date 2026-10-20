import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  DUMMY_PASSWORD_HASH,
  verifyPassword,
} from '../../common/security/password.util';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import type { JwtPayload, LoginResponse } from './interfaces/auth.interfaces';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login({ email, password }: LoginDto): Promise<LoginResponse> {
    const user = await this.usersService.findByEmailWithPassword(email);

    // siempre se ejecuta bcrypt → no se puede inferir si el email existe
    const isValid = await verifyPassword(
      password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );
    if (!user || !isValid) {
      // mensaje generico a proposito: no revela que dato fallo
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload: JwtPayload = { sub: String(user.id), email: user.email };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      tokenType: 'Bearer',
      expiresIn: this.config.getOrThrow<string>('JWT_EXPIRES_IN'),
    };
  }
}
