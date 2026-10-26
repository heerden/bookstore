import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { Authors, Books, Genre } from './entities/books.entity';
import { Raw, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateBookDto } from './dto/create-book.dto';
import { ViewBookDTO } from './dto/view-book.dto';
import { ViewDiscountedPricingDto } from './dto/view-discounted-pricing.dto';

// Case-insensitive exact match on a name column, so `?genre=fiction` matches "Fiction".
const nameEquals = (name: string) =>
  Raw((alias) => `LOWER(${alias}) = LOWER(:name)`, { name });

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Books)
    private readonly booksRepository: Repository<Books>,
    @InjectRepository(Authors)
    private readonly authorsRepository: Repository<Authors>,
    @InjectRepository(Genre)
    private readonly genreRepository: Repository<Genre>,
  ) {}

  async create(createBookDto: CreateBookDto): Promise<ViewBookDTO> {
    this.validate(createBookDto);

    const book = this.booksRepository.create({
      title: createBookDto.title.trim(),
      price: new Decimal(createBookDto.price),
      author: await this.findOrCreateAuthor(createBookDto.author),
      genre: await this.findOrCreateGenre(createBookDto.genre),
    });

    return this.toView(await this.booksRepository.save(book));
  }

  async findOne(id: number): Promise<ViewBookDTO> {
    return this.toView(await this.getBookOrFail(id));
  }

  async findGenre(genre: string): Promise<ViewBookDTO[]> {
    const books = await this.booksRepository.find({
      where: { genre: { name: nameEquals(genre) } },
      relations: { author: true, genre: true },
      order: { id: 'ASC' },
    });

    return books.map((book) => this.toView(book));
  }

  // Full replacement of a book (PUT semantics).
  async save(id: number, updateBookDto: CreateBookDto): Promise<ViewBookDTO> {
    this.validate(updateBookDto);

    const book = await this.getBookOrFail(id);
    book.title = updateBookDto.title.trim();
    book.price = new Decimal(updateBookDto.price);
    book.author = await this.findOrCreateAuthor(updateBookDto.author);
    book.genre = await this.findOrCreateGenre(updateBookDto.genre);

    return this.toView(await this.booksRepository.save(book));
  }

  async remove(id: number): Promise<void> {
    const result = await this.booksRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`Book #${id} not found`);
    }
  }

  // Sum of all book prices in the genre, after a percentage discount:
  // total * (100 - discount) / 100, e.g. discount=10 -> 90% of the total.
  // `discount` must be within 0..100 so the result can't go negative.
  async discount(
    genre: string,
    discount: number,
  ): Promise<ViewDiscountedPricingDto> {
    if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
      throw new BadRequestException(
        'discount must be a percentage between 0 and 100',
      );
    }

    const existing = await this.genreRepository.findOne({
      where: { name: nameEquals(genre.trim()) },
    });
    if (!existing) {
      throw new NotFoundException(`Genre "${genre}" not found`);
    }

    // SUM runs in the DB; returns null when the genre has no books.
    // Same query as Repository.sum(), but we keep the raw DECIMAL string
    // (sum() would parseFloat it) so the value stays exact until the response.
    const raw = await this.booksRepository
      .createQueryBuilder('book')
      .setFindOptions({ where: { genre: { id: existing.id } } })
      .select('SUM(book.price)', 'total')
      .getRawOne<{ total: string | number | null }>();
    const total = new Decimal(raw?.total ?? 0);

    // decimal.js avoids floating point drift on currency values.
    const multiplier = new Decimal(100).minus(discount).div(100);
    const discounted = total
      .times(multiplier)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
      .toNumber();

    return {
      genre: existing.name,
      discounted_percentage: discount,
      total_discounted_price: discounted,
    };
  }

  private async getBookOrFail(id: number): Promise<Books> {
    const book = await this.booksRepository.findOne({
      where: { id },
      relations: { author: true, genre: true },
    });
    if (!book) {
      throw new NotFoundException(`Book #${id} not found`);
    }
    return book;
  }

  private async findOrCreateAuthor(name: string): Promise<Authors> {
    const trimmed = name.trim();
    const existing = await this.authorsRepository.findOne({
      where: { name: nameEquals(trimmed) },
    });
    return (
      existing ??
      (await this.authorsRepository.save(
        this.authorsRepository.create({ name: trimmed }),
      ))
    );
  }

  private async findOrCreateGenre(name: string): Promise<Genre> {
    const trimmed = name.trim();
    const existing = await this.genreRepository.findOne({
      where: { name: nameEquals(trimmed) },
    });
    return (
      existing ??
      (await this.genreRepository.save(
        this.genreRepository.create({ name: trimmed }),
      ))
    );
  }

  // Lightweight validation (no class-validator in the project yet).
  // Limits mirror the column lengths in books.entity.ts.
  private validate(dto: CreateBookDto): void {
    const errors: string[] = [];
    const requireString = (field: keyof CreateBookDto, max: number) => {
      const value = dto?.[field];
      if (typeof value !== 'string' || !value.trim()) {
        errors.push(`${field} is required`);
      } else if (value.trim().length > max) {
        errors.push(`${field} must be at most ${max} characters`);
      }
    };

    requireString('title', 200);
    requireString('author', 200);
    requireString('genre', 20);

    const price = dto?.price;
    if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
      errors.push('price must be a non-negative number');
    }

    if (errors.length) {
      throw new BadRequestException(errors);
    }
  }

  // API boundary: Decimal -> JSON number. Safe because DECIMAL(10,2) fits well
  // within a double's ~15 significant digits.
  private toView(book: Books): ViewBookDTO {
    return {
      id: book.id,
      title: book.title,
      price: book.price.toNumber(),
      author: book.author?.name,
      genre: book.genre?.name,
    };
  }
}
