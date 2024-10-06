import { Controller, Post, Body, Get } from '@nestjs/common';
import { KbizService } from './kbiz.service'; // Corrected import

@Controller('api')
export class KBizController {
  constructor(private readonly kBizService: KbizService) {}

  @Post('check-transaction')
  async checkTransaction(
    @Body('amountTransaction') amountTransaction: number
  ) {
    const userInfo = await this.kBizService.initializeSession();
    if (!userInfo) {
      return { success: false, message: 'Account error !' };
    }

    const transactionList = await this.kBizService.getTransactionList(amountTransaction);
    console.log(transactionList)
    return { success: true, transactions: transactionList };
  }

  @Get('check-balance')
  async checkBalance() {
    const userInfo = await this.kBizService.initializeSession();
    if (!userInfo) {
      return { success: false, message: 'Account error !' };
    }else{
      return { success: true, balance: userInfo['accountSummaryList'][0]['acctBalance'] }; // Corrected return statement
    }
  } //End process
}