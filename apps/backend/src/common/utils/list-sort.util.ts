import { BadRequestException } from '@nestjs/common';
import { asc, desc, type SQL } from 'drizzle-orm';
import type { AnyColumn } from 'drizzle-orm';
import {
  DEFAULT_LIST_SORT_TIE_BREAKER_ORDER,
  type ListSortOrder,
} from '../constants/list-sort.constants';

export type { ListSortOrder };

export type ListSortQuery<T extends string = string> = {
  sortBy?: T;
  sortOrder?: ListSortOrder;
};

export type ResolvedListSort<T extends string> = {
  sortBy: T;
  sortOrder: ListSortOrder;
};

export function resolveListSort<T extends string>(
  allowed: readonly T[],
  query: ListSortQuery<T>,
  defaults: ResolvedListSort<T>,
): ResolvedListSort<T> {
  if (query.sortBy !== undefined && !allowed.includes(query.sortBy as T)) {
    throw new BadRequestException(
      `Invalid sortBy. Allowed values: ${allowed.join(', ')}`,
    );
  }
  const sortBy = (query.sortBy ?? defaults.sortBy) as T;
  const sortOrder =
    query.sortOrder ??
    (query.sortBy !== undefined ? 'asc' : defaults.sortOrder);
  return { sortBy, sortOrder };
}

export function buildListOrderBy<T extends string>(
  columnMap: Record<T, AnyColumn>,
  sort: ResolvedListSort<T>,
  tieBreaker: AnyColumn,
  tieBreakerOrder: ListSortOrder = DEFAULT_LIST_SORT_TIE_BREAKER_ORDER,
): SQL[] {
  const column = columnMap[sort.sortBy];
  if (!column) {
    throw new BadRequestException(`Invalid sortBy column mapping: ${sort.sortBy}`);
  }
  const primary = sort.sortOrder === 'asc' ? asc(column) : desc(column);
  const tie =
    tieBreakerOrder === 'asc' ? asc(tieBreaker) : desc(tieBreaker);
  return [primary, tie];
}
