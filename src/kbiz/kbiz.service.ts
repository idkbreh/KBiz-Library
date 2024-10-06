import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import KBiz from './Kbiz';

@Injectable()
export class KbizService {
  private kBizClient: KBiz;

  constructor(private configService: ConfigService) {
    const config = {
      username: this.configService.get<string>('USERNAME'),
      password: this.configService.get<string>('PASSWORD'),
      bankAccountNumber: this.configService.get<string>('BANK_ACCOUNT_NUMBER'),
    };
    this.kBizClient = new KBiz(config);
  }

  async initializeSession() {
    return await this.kBizClient.initializeSession();
  }

  async getBalance(){
    const userInfo = await this.kBizClient.initializeSession()
    return userInfo
  }

  async getTransactionList(limitRow: number) {
    return await this.kBizClient.getTransactionList(limitRow);
  }
}