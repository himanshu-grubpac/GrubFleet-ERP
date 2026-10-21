import { BadRequestException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import {
  buildListOrderBy,
  resolveListSort,
} from './list-sort.util';

const allowed = ['createdAt', 'name'] as const;
const defaults = { sortBy: 'createdAt' as const, sortOrder: 'desc' as const };

describe('resolveListSort', () => {
  it('uses defaults when sort params omitted', () => {
    expect(resolveListSort(allowed, {}, defaults)).toEqual(defaults);
  });

  it('applies asc when sortBy set without sortOrder', () => {
    expect(resolveListSort(allowed, { sortBy: 'name' }, defaults)).toEqual({
      sortBy: 'name',
      sortOrder: 'asc',
    });
  });

  it('honors explicit sortOrder', () => {
    expect(
      resolveListSort(
        allowed,
        { sortBy: 'name', sortOrder: 'desc' },
        defaults,
      ),
    ).toEqual({ sortBy: 'name', sortOrder: 'desc' });
  });

  it('throws on disallowed sortBy', () => {
    expect(() =>
      resolveListSort(allowed, { sortBy: 'bad' as 'name' }, defaults),
    ).toThrow(BadRequestException);
  });
});

describe('buildListOrderBy', () => {
  const colA = sql`a`;
  const colB = sql`b`;
  const map = { createdAt: colA, name: colB } as const;

  it('returns primary and tie-breaker clauses', () => {
    const clauses = buildListOrderBy(
      map,
      { sortBy: 'name', sortOrder: 'asc' },
      colA,
      'desc',
    );
    expect(clauses).toHaveLength(2);
  });
});
