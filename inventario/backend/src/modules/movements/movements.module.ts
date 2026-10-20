import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsModule } from '../products/products.module';
import { Movement } from './entities/movement.entity';
import { MovementsController } from './movements.controller';
import { MovementsService } from './movements.service';

@Module({
  imports: [TypeOrmModule.forFeature([Movement]), ProductsModule],
  controllers: [MovementsController],
  providers: [MovementsService],
})
export class MovementsModule {}
