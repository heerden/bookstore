import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Authors, Books, Genre } from './entities/books.entity';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';

@Module({
  imports: [TypeOrmModule.forFeature([Books, Authors, Genre])],
  controllers: [BooksController],
  providers: [BooksService],
})
export class BooksModule {}
