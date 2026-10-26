import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

// Runs against the Docker `bookstore_test` database (see .development.env).
// The tests are ordered on purpose: they walk two books through the full CRUD
// lifecycle, sharing the ids returned by the POST requests.
describe('Books (e2e)', () => {
  let app: INestApplication<App>;

  // Case 1: the swagger example - never modified by these tests.
  const jock = {
    title: 'Jock of the Bushveld',
    author: 'James Percy FitzPatrick',
    genre: 'Adventure',
    price: 199.99,
  };

  // Case 2: updated and deleted during the lifecycle.
  const lore = {
    title: 'Lore of Running',
    author: 'Tim Noakes',
    genre: 'Sport',
    price: 999.0,
  };

  let jockId: number;
  let loreId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Dedicated test database: start every run from empty tables.
    await app
      .get(DataSource)
      .query(
        'TRUNCATE TABLE "books", "authors", "genre" RESTART IDENTITY CASCADE',
      );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Create', () => {
    it('POST /books creates Jock of the Bushveld (Adventure)', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/books')
        .send(jock)
        .expect(201);

      expect(body).toEqual({ id: expect.any(Number), ...jock });
      jockId = body.id;
    });

    it('POST /books creates Lore of Running (Sport)', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/books')
        .send(lore)
        .expect(201);

      expect(body).toEqual({ id: expect.any(Number), ...lore });
      expect(body.id).not.toBe(jockId);
      loreId = body.id;
    });

    it('POST /books rejects an invalid payload with 400', async () => {
      await request(app.getHttpServer())
        .post('/books')
        .send({ title: '', author: 'Nobody', genre: 'Sport', price: -1 })
        .expect(400);
    });
  });

  describe('Read', () => {
    it('GET /books/:id returns Jock of the Bushveld', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/books/${jockId}`)
        .expect(200);

      expect(body).toEqual({ id: jockId, ...jock });
    });

    it('GET /books/:id returns Lore of Running', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/books/${loreId}`)
        .expect(200);

      expect(body).toEqual({ id: loreId, ...lore });
    });

    it('GET /books/:id returns 404 for an unknown id', async () => {
      await request(app.getHttpServer()).get('/books/999999').expect(404);
    });

    it('GET /books/:id returns 400 for a non-numeric id', async () => {
      await request(app.getHttpServer()).get('/books/abc').expect(400);
    });

    it('GET /books?genre=Adventure lists only Jock', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/books')
        .query({ genre: 'Adventure' })
        .expect(200);

      expect(body).toEqual([{ id: jockId, ...jock }]);
    });

    it('GET /books?genre=sport is case-insensitive and lists only Lore', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/books')
        .query({ genre: 'sport' })
        .expect(200);

      expect(body).toEqual([{ id: loreId, ...lore }]);
    });

    it('GET /books without a genre returns 400', async () => {
      await request(app.getHttpServer()).get('/books').expect(400);
    });

    it('GET /books?genre=Unknown returns an empty list', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/books')
        .query({ genre: 'Unknown' })
        .expect(200);

      expect(body).toEqual([]);
    });
  });

  describe('Discounted price', () => {
    it('GET /books/discounted-price for Adventure at 10%', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/books/discounted-price')
        .query({ genre: 'Adventure', discount: 10 })
        .expect(200);

      // 199.99 * 0.9 = 179.991 -> 179.99
      expect(body).toEqual({
        genre: 'Adventure',
        discounted_percentage: 10,
        total_discounted_price: 179.99,
      });
    });

    it('GET /books/discounted-price for Sport at 10%', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/books/discounted-price')
        .query({ genre: 'Sport', discount: 10 })
        .expect(200);

      // 999 * 0.9 = 899.1
      expect(body).toEqual({
        genre: 'Sport',
        discounted_percentage: 10,
        total_discounted_price: 899.1,
      });
    });

    it('returns 400 for a discount above 100', async () => {
      await request(app.getHttpServer())
        .get('/books/discounted-price')
        .query({ genre: 'Sport', discount: 101 })
        .expect(400);
    });

    it('returns 404 for an unknown genre', async () => {
      await request(app.getHttpServer())
        .get('/books/discounted-price')
        .query({ genre: 'Unknown', discount: 10 })
        .expect(404);
    });
  });

  describe('Update', () => {
    it('PUT /books/:id updates the price of Lore of Running', async () => {
      const updated = { ...lore, price: 899.5 };

      const { body } = await request(app.getHttpServer())
        .put(`/books/${loreId}`)
        .send(updated)
        .expect(200);

      expect(body).toEqual({ id: loreId, ...updated });

      const { body: reread } = await request(app.getHttpServer())
        .get(`/books/${loreId}`)
        .expect(200);
      expect(reread).toEqual({ id: loreId, ...updated });
    });

    it('reflects the new price in the Sport discount', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/books/discounted-price')
        .query({ genre: 'Sport', discount: 10 })
        .expect(200);

      // 899.5 * 0.9 = 809.55
      expect(body.total_discounted_price).toBe(809.55);
    });

    it('PUT /books/:id returns 404 for an unknown id', async () => {
      await request(app.getHttpServer())
        .put('/books/999999')
        .send(lore)
        .expect(404);
    });

    it('PUT /books/:id returns 400 for an invalid payload', async () => {
      await request(app.getHttpServer())
        .put(`/books/${loreId}`)
        .send({ ...lore, price: 'free' })
        .expect(400);
    });

    it('leaves Jock of the Bushveld untouched', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/books/${jockId}`)
        .expect(200);

      expect(body).toEqual({ id: jockId, ...jock });
    });
  });

  describe('Change genre to Nonfiction', () => {
    // State at this point: Lore of Running was updated to 899.5 above,
    // Jock of the Bushveld is still the swagger example (199.99).
    const lorePrice = 899.5;

    it('PUT /books/:id moves Jock of the Bushveld to Nonfiction', async () => {
      const moved = { ...jock, genre: 'Nonfiction' };

      const { body } = await request(app.getHttpServer())
        .put(`/books/${jockId}`)
        .send(moved)
        .expect(200);

      expect(body).toEqual({ id: jockId, ...moved });
    });

    it('PUT /books/:id moves Lore of Running to Nonfiction', async () => {
      const moved = { ...lore, price: lorePrice, genre: 'Nonfiction' };

      const { body } = await request(app.getHttpServer())
        .put(`/books/${loreId}`)
        .send(moved)
        .expect(200);

      expect(body).toEqual({ id: loreId, ...moved });
    });

    it('GET /books?genre=Nonfiction lists both books', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/books')
        .query({ genre: 'Nonfiction' })
        .expect(200);

      expect(body).toEqual([
        { id: jockId, ...jock, genre: 'Nonfiction' },
        { id: loreId, ...lore, price: lorePrice, genre: 'Nonfiction' },
      ]);
    });

    it('the old genres no longer list any books', async () => {
      for (const genre of ['Adventure', 'Sport']) {
        const { body } = await request(app.getHttpServer())
          .get('/books')
          .query({ genre })
          .expect(200);
        expect(body).toEqual([]);
      }
    });

    it('GET /books/discounted-price sums both books in Nonfiction', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/books/discounted-price')
        .query({ genre: 'Nonfiction', discount: 10 })
        .expect(200);

      // (199.99 + 899.5) * 0.9 = 989.541 -> 989.54
      expect(body).toEqual({
        genre: 'Nonfiction',
        discounted_percentage: 10,
        total_discounted_price: 989.54,
      });
    });

    it('GET /books/discounted-price at 0% returns the full total', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/books/discounted-price')
        .query({ genre: 'nonfiction', discount: 0 })
        .expect(200);

      // 199.99 + 899.5 = 1099.49 (genre match is case-insensitive)
      expect(body.total_discounted_price).toBe(1099.49);
    });

    it('the emptied Sport genre now has a discounted total of 0', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/books/discounted-price')
        .query({ genre: 'Sport', discount: 10 })
        .expect(200);

      expect(body.total_discounted_price).toBe(0);
    });
  });

  describe('Delete', () => {
    it('DELETE /books/:id removes Lore of Running', async () => {
      await request(app.getHttpServer()).delete(`/books/${loreId}`).expect(204);

      await request(app.getHttpServer()).get(`/books/${loreId}`).expect(404);

      const { body } = await request(app.getHttpServer())
        .get('/books')
        .query({ genre: 'Nonfiction' })
        .expect(200);
      expect(body).toEqual([{ id: jockId, ...jock, genre: 'Nonfiction' }]);
    });

    it('DELETE /books/:id returns 404 when already deleted', async () => {
      await request(app.getHttpServer()).delete(`/books/${loreId}`).expect(404);
    });

    it('DELETE /books/:id removes Jock of the Bushveld', async () => {
      await request(app.getHttpServer()).delete(`/books/${jockId}`).expect(204);

      await request(app.getHttpServer()).get(`/books/${jockId}`).expect(404);
    });
  });
});
