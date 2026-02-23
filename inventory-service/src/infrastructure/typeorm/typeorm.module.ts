import { TypeOrmModule } from '@nestjs/typeorm';
import { connectionOptions } from './data-source';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...connectionOptions,
      autoLoadEntities: true,
      migrationsRun: process.env.NODE_ENV === 'local',
    }),
  ],
})
export class TypeORMInfrastructureModule {}
