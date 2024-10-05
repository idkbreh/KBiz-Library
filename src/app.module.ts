import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { KbizService } from './kbiz/kbiz.service';
import { KBizController } from './kbiz/kbiz.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController, KBizController],
  providers: [AppService, KbizService],
})
export class AppModule {}