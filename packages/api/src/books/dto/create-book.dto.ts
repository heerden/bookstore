import { ApiProperty } from '@nestjs/swagger';

export class CreateBookDto {
  @ApiProperty({
    description: 'Title of the book',
    example: 'Jock of the Bushveld',
    maxLength: 200,
  })
  title!: string;

  @ApiProperty({
    description: 'Author of the book',
    example: 'James Percy FitzPatrick',
    maxLength: 200,
  })
  author!: string;

  @ApiProperty({
    description: 'Genre of the book',
    example: 'Adventure',
    maxLength: 20,
  })
  genre!: string;

  @ApiProperty({
    description:
      'Price of the book as a non-negative decimal number. ' +
      'Stored with 2 decimal places.',
    example: 199.99,
    minimum: 0,
  })
  price!: number;
}
