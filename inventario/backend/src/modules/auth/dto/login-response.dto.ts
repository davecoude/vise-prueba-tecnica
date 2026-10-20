import { ApiProperty } from '@nestjs/swagger';
import type {
  AuthenticatedUser,
  LoginResponse,
} from '../interfaces/auth.interfaces';

export class LoginResponseDto implements LoginResponse {
  /** @example eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... */
  accessToken!: string;

  @ApiProperty({ enum: ['Bearer'], example: 'Bearer' })
  tokenType!: 'Bearer';

  /** @example 1h */
  expiresIn!: string;
}

export class AuthenticatedUserDto implements AuthenticatedUser {
  /** @example 1 */
  id!: number;

  /** @example admin@vise.com */
  email!: string;
}
