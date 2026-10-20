import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Excluye un endpoint del guard JWT global. Usar con moderacion
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);