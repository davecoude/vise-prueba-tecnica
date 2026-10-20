import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiErrorResponses,
  ApiProtected,
} from '../../common/swagger/api-docs.decorators';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import {
  AuthenticatedUserDto,
  LoginResponseDto,
} from './dto/login-response.dto';
import type {
  AuthenticatedUser,
  LoginResponse,
} from './interfaces/auth.interfaces';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK) // login no crea un recurso → 200, no 201
  @ApiOperation({ summary: 'Inicia sesión y devuelve un JWT con expiración' })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiErrorResponses(400, 401)
  login(@Body() dto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(dto);
  }

  @Get('me')
  @ApiProtected()
  @ApiOperation({ summary: 'Devuelve el usuario autenticado del token' })
  @ApiOkResponse({ type: AuthenticatedUserDto })
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }
}
