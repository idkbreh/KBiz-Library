import { Test, TestingModule } from '@nestjs/testing';
import { KbizController } from './kbiz.controller';

describe('KbizController', () => {
  let controller: KbizController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KbizController],
    }).compile();

    controller = module.get<KbizController>(KbizController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
