import { ApiProperty } from '@nestjs/swagger';

export class ViewDiscountedPricingDto {
  @ApiProperty({
    description: 'Genre name',
    example: 'Fiction',
  })
  genre!: string;

  @ApiProperty({
    description: 'Discount percentage applied',
    example: 10,
  })
  discounted_percentage!: number;

  @ApiProperty({
    description:
      'Total discounted price for all books in the genre, rounded half-up ' +
      'to 2 decimal places. Trailing zeros are not preserved in JSON ' +
      '(45.50 is returned as 45.5); clients are responsible for display formatting.',
    example: 45.5,
  })
  total_discounted_price!: number;
}
