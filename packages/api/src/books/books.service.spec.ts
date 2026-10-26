import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { BooksService } from './books.service';
import { Authors, Books, Genre } from './entities/books.entity';

// Chainable stub for the SUM query builder; `getRawOne` returns the raw row.
interface QueryBuilderMock {
  setFindOptions: jest.Mock<QueryBuilderMock>;
  select: jest.Mock<QueryBuilderMock>;
  getRawOne: jest.Mock<Promise<{ total: string | null }>>;
}

const mockQueryBuilder = (): QueryBuilderMock => {
  const qb: QueryBuilderMock = {
    setFindOptions: jest.fn(() => qb),
    select: jest.fn(() => qb),
    getRawOne: jest.fn<Promise<{ total: string | null }>, []>(),
  };
  return qb;
};

const mockRepository = () => {
  const queryBuilder = mockQueryBuilder();
  return {
    create: jest.fn(<T extends object>(entity: T): T => entity),
    save: jest.fn(<T extends object>(entity: T) =>
      Promise.resolve({ id: 1, ...entity }),
    ),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
    queryBuilder,
    createQueryBuilder: jest.fn(() => queryBuilder),
  };
};

describe('BooksService', () => {
  let service: BooksService;
  let booksRepository: ReturnType<typeof mockRepository>;
  let authorsRepository: ReturnType<typeof mockRepository>;
  let genreRepository: ReturnType<typeof mockRepository>;

  beforeEach(async () => {
    booksRepository = mockRepository();
    authorsRepository = mockRepository();
    genreRepository = mockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        { provide: getRepositoryToken(Books), useValue: booksRepository },
        { provide: getRepositoryToken(Authors), useValue: authorsRepository },
        { provide: getRepositoryToken(Genre), useValue: genreRepository },
      ],
    }).compile();

    service = module.get<BooksService>(BooksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a book, reusing an existing genre and creating a new author', async () => {
    authorsRepository.findOne.mockResolvedValue(null);
    genreRepository.findOne.mockResolvedValue({ id: 'g1', name: 'Fiction' });

    const result = await service.create({
      title: ' Dune ',
      author: 'Frank Herbert',
      genre: 'fiction',
      price: 9.99,
    });

    expect(authorsRepository.save).toHaveBeenCalledWith({
      name: 'Frank Herbert',
    });
    expect(genreRepository.save).not.toHaveBeenCalled();
    expect(booksRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ price: new Decimal('9.99') }),
    );
    expect(result).toEqual({
      id: 1,
      title: 'Dune',
      price: 9.99,
      author: 'Frank Herbert',
      genre: 'Fiction',
    });
  });

  it('rejects invalid payloads', async () => {
    await expect(
      service.create({ title: '', author: 'A', genre: 'G', price: -1 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(booksRepository.save).not.toHaveBeenCalled();
  });

  it('throws NotFound for a missing book', async () => {
    booksRepository.findOne.mockResolvedValue(null);
    await expect(service.findOne(42)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFound when deleting a missing book', async () => {
    booksRepository.delete.mockResolvedValue({ affected: 0 });
    await expect(service.remove(42)).rejects.toBeInstanceOf(NotFoundException);
  });

  describe('discount', () => {
    // DB drivers return SUM(DECIMAL) as a string (or null for no rows).
    const mockSum = (total: string | null) =>
      booksRepository.queryBuilder.getRawOne.mockResolvedValue({ total });

    it('applies total * (100 - discount) / 100 to the genre total', async () => {
      genreRepository.findOne.mockResolvedValue({ id: 'g1', name: 'Fiction' });
      mockSum('125.00');

      const result = await service.discount('fiction', 10);

      expect(booksRepository.queryBuilder.setFindOptions).toHaveBeenCalledWith({
        where: { genre: { id: 'g1' } },
      });
      expect(booksRepository.queryBuilder.select).toHaveBeenCalledWith(
        'SUM(book.price)',
        'total',
      );
      expect(result).toEqual({
        genre: 'Fiction',
        discounted_percentage: 10,
        total_discounted_price: 112.5,
      });
    });

    it('returns 0 for a genre with no books', async () => {
      genreRepository.findOne.mockResolvedValue({ id: 'g1', name: 'Fiction' });
      mockSum(null);

      const result = await service.discount('Fiction', 4);
      expect(result.total_discounted_price).toBe(0);
    });

    it('throws NotFound for an unknown genre', async () => {
      genreRepository.findOne.mockResolvedValue(null);
      await expect(service.discount('Nope', 10)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(booksRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it.each([0, 100])('accepts boundary discount %p', async (discount) => {
      genreRepository.findOne.mockResolvedValue({ id: 'g1', name: 'Fiction' });
      mockSum('125.00');

      const result = await service.discount('Fiction', discount);
      expect(result.total_discounted_price).toBe(discount === 0 ? 125 : 0);
    });

    it('rounds to 2 decimal places', async () => {
      genreRepository.findOne.mockResolvedValue({ id: 'g1', name: 'Fiction' });
      mockSum('30.03');

      const result = await service.discount('Fiction', 10);
      expect(result.total_discounted_price).toBe(27.03); // 27.027
    });

    it.each([-5, 100.5, 150, NaN, Infinity])(
      'rejects invalid discount %p',
      async (discount) => {
        await expect(
          service.discount('Fiction', discount),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(genreRepository.findOne).not.toHaveBeenCalled();
      },
    );
  });
});
