import {
  Controller,
  Body,
  Delete,
  Get,
  Post,
  Put,
  Param,
  Query,
  ParseIntPipe,
  ParseFloatPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { ViewBookDTO } from './dto/view-book.dto';
import { ViewDiscountedPricingDto } from './dto/view-discounted-pricing.dto';

@ApiTags('books')
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  // POST books
  @Post()
  @ApiOperation({ summary: 'Create a new book' })
  @ApiResponse({
    status: 201,
    description: 'Book created successfully',
    type: ViewBookDTO,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
  })
  create(@Body() createBookDto: CreateBookDto): Promise<ViewBookDTO> {
    return this.booksService.create(createBookDto);
  }

  // GET /books/discounted-price?genre=Fiction&discount=10
  @Get('discounted-price')
  @ApiOperation({
    summary: 'Calculate total discounted price for all books in a genre',
  })
  @ApiQuery({
    name: 'genre',
    type: String,
    required: true,
    description: 'Genre name to calculate discount for',
    example: 'Fiction',
  })
  @ApiQuery({
    name: 'discount',
    type: Number,
    required: true,
    description: 'Discount percentage (0-100)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Discounted pricing calculated successfully',
    type: ViewDiscountedPricingDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid discount percentage or missing genre',
  })
  @ApiResponse({
    status: 404,
    description: 'Genre not found',
  })
  discountedprice(
    @Query('genre') genre?: string,
    @Query('discount', ParseFloatPipe) discount: number = 0,
  ): Promise<ViewDiscountedPricingDto> {
    // NOTE: must be declared ABOVE `@Get(':id')`, otherwise `:id` captures the request first
    if (!genre?.trim()) {
      throw new BadRequestException('Query parameter "genre" is required');
    }
    return this.booksService.discount(genre.trim(), discount);
  }

  // GET books/1
  @Get(':id')
  @ApiOperation({ summary: 'Get a book by ID' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Unique book identifier',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Book found',
    type: ViewBookDTO,
  })
  @ApiResponse({
    status: 404,
    description: 'Book not found',
  })
  read(@Param('id', ParseIntPipe) id: number): Promise<ViewBookDTO> {
    return this.booksService.findOne(id);
  }

  // GET books?genre=fiction
  // NOTE: declared before `:id`; genre is a query filter on the collection,
  // so it does not collide with the `:id` path param below.
  @Get()
  @ApiOperation({ summary: 'Find books by genre' })
  @ApiQuery({
    name: 'genre',
    type: String,
    required: true,
    description: 'Genre name to filter books by',
    example: 'Fiction',
  })
  @ApiResponse({
    status: 200,
    description: 'List of books matching the genre',
    type: [ViewBookDTO],
  })
  @ApiResponse({
    status: 400,
    description: 'Query parameter "genre" is required',
  })
  readGenre(@Query('genre') genre?: string): Promise<ViewBookDTO[]> {
    if (!genre?.trim()) {
      throw new BadRequestException('Query parameter "genre" is required');
    }
    return this.booksService.findGenre(genre.trim());
  }

  // PUT books/1
  @Put(':id')
  @ApiOperation({ summary: 'Update an existing book by ID' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Unique book identifier',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Book updated successfully',
    type: ViewBookDTO,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
  })
  @ApiResponse({
    status: 404,
    description: 'Book not found',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBookDto: CreateBookDto,
  ): Promise<ViewBookDTO> {
    return this.booksService.save(id, updateBookDto);
  }

  // DELETE books/1 - based on id
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a book by ID' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Unique book identifier',
    example: 1,
  })
  @ApiResponse({
    status: 204,
    description: 'Book deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Book not found',
  })
  delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.booksService.remove(id);
  }
}
