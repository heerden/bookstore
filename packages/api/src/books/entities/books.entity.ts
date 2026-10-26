import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  type Relation,
} from 'typeorm';
import { Decimal } from 'decimal.js';
import { DecimalTransformer } from '../../common/transformers/decimal.transformer';

@Entity()
export class Books {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 200 })
  title!: string;

  // Exact decimal in the domain; converted to a JSON number only at the API boundary
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: new DecimalTransformer(),
  })
  price!: Decimal;

  // Relation<> avoids emitting `docs:type` metadata that references Authors/Genre
  // before they are declared below (would throw "Cannot access before initialization")
  @ManyToOne(() => Authors, (author) => author.books)
  @JoinColumn()
  author!: Relation<Authors>;

  @ManyToOne(() => Genre, (genre) => genre.book)
  @JoinColumn()
  genre!: Relation<Genre>;
}

@Entity()
export class Authors {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 200 })
  name!: string;

  @OneToMany(() => Books, (book) => book.author)
  books!: Books[];
}

@Entity()
export class Genre {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 20 })
  name!: string;

  @OneToMany(() => Books, (book) => book.genre)
  book!: Books[];
}
