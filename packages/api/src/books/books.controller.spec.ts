import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';

describe('BooksController', () => {
  let controller: BooksController;
  const booksService = {
    create: jest.fn(),
    findOne: jest.fn(),
    findGenre: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    discount: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BooksController],
      providers: [{ provide: BooksService, useValue: booksService }],
    }).compile();

    controller = module.get<BooksController>(BooksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates read/update/delete to the service with the numeric id', async () => {
    const dto = { title: 'T', author: 'A', genre: 'G', price: 1 };
    await controller.read(1);
    await controller.update(2, dto);
    await controller.delete(3);
    expect(booksService.findOne).toHaveBeenCalledWith(1);
    expect(booksService.save).toHaveBeenCalledWith(2, dto);
    expect(booksService.remove).toHaveBeenCalledWith(3);
  });

  it('requires the genre query parameter', () => {
    expect(() => controller.readGenre(undefined)).toThrow(BadRequestException);
    expect(() => controller.readGenre('  ')).toThrow(BadRequestException);
  });

  it('filters by trimmed genre', async () => {
    await controller.readGenre(' fiction ');
    expect(booksService.findGenre).toHaveBeenCalledWith('fiction');
  });

  it('requires the genre query parameter for discounted price', () => {
    expect(() => controller.discountedprice(undefined, 10)).toThrow(
      BadRequestException,
    );
    expect(() => controller.discountedprice('  ', 10)).toThrow(
      BadRequestException,
    );
    expect(booksService.discount).not.toHaveBeenCalled();
  });

  it('delegates discounted price with trimmed genre and discount', async () => {
    await controller.discountedprice(' Fiction ', 10);
    expect(booksService.discount).toHaveBeenCalledWith('Fiction', 10);
  });
});
