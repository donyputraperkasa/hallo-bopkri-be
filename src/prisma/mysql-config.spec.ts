import { parseMysqlUrl } from './mysql-config';

describe('parseMysqlUrl', () => {
  it('parses a MySQL connection URL for the Prisma MariaDB adapter', () => {
    expect(
      parseMysqlUrl('mysql://user:p%40ss@localhost:3307/hallo_bopkri'),
    ).toEqual({
      host: 'localhost',
      port: 3307,
      user: 'user',
      password: 'p@ss',
      database: 'hallo_bopkri',
      connectionLimit: 5,
    });
  });
});
