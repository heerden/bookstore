import { ApiProperty } from '@nestjs/swagger';

export class ViewBookDTO {
  @ApiProperty({
    description: 'Unique identifier of the book',
    example: 1,
  })
  id!: number;

  @ApiProperty({
    description: 'Title of the book',
    example: 'Jock of the Bushveld',
  })
  title!: string;

  @ApiProperty({
    description: 'Author of the book',
    example: 'James Percy FitzPatrick',
  })
  author!: string;

  @ApiProperty({
    description: 'Genre of the book',
    example: 'Fiction',
  })
  genre!: string;

  @ApiProperty({
    description:
      'Price of the book as a decimal number with up to 2 decimal places. ' +
      'Trailing zeros are not preserved in JSON (12.50 is returned as 12.5); ' +
      'clients are responsible for display formatting.',
    example: 19.99,
  })
  price!: number;
}
