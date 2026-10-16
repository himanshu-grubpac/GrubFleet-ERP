/**
 * Paginate a globally sorted merge of two ascending string-keyed lists without
 * loading full catalogs — fetches bounded slices from each source.
 */
export async function paginateTwoMergedSortedLists<T>(params: {
  page: number;
  pageSize: number;
  leftTotal: number;
  rightTotal: number;
  fetchLeft: (offset: number, limit: number) => Promise<T[]>;
  fetchRight: (offset: number, limit: number) => Promise<T[]>;
  sortKey: (item: T) => string;
}): Promise<{ items: T[]; total: number }> {
  const {
    page,
    pageSize,
    leftTotal,
    rightTotal,
    fetchLeft,
    fetchRight,
    sortKey,
  } = params;
  const total = leftTotal + rightTotal;
  const globalOffset = (page - 1) * pageSize;
  if (globalOffset >= total) {
    return { items: [], total };
  }
  const globalEnd = Math.min(globalOffset + pageSize, total);
  const targetLen = globalEnd;

  let leftOffset = 0;
  let rightOffset = 0;
  let leftBuffer: T[] = [];
  let rightBuffer: T[] = [];
  let leftBufIdx = 0;
  let rightBufIdx = 0;
  const chunkSize = Math.max(pageSize, 50);
  const merged: T[] = [];

  const hasLeftPending = () =>
    leftBufIdx < leftBuffer.length || leftOffset < leftTotal;
  const hasRightPending = () =>
    rightBufIdx < rightBuffer.length || rightOffset < rightTotal;

  while (merged.length < targetLen && (hasLeftPending() || hasRightPending())) {
    if (leftBufIdx >= leftBuffer.length && leftOffset < leftTotal) {
      const take = Math.min(chunkSize, leftTotal - leftOffset);
      leftBuffer = await fetchLeft(leftOffset, take);
      leftOffset += leftBuffer.length;
      leftBufIdx = 0;
      if (leftBuffer.length === 0) {
        leftOffset = leftTotal;
      }
    }
    if (rightBufIdx >= rightBuffer.length && rightOffset < rightTotal) {
      const take = Math.min(chunkSize, rightTotal - rightOffset);
      rightBuffer = await fetchRight(rightOffset, take);
      rightOffset += rightBuffer.length;
      rightBufIdx = 0;
      if (rightBuffer.length === 0) {
        rightOffset = rightTotal;
      }
    }

    const leftItem =
      leftBufIdx < leftBuffer.length ? leftBuffer[leftBufIdx] : null;
    const rightItem =
      rightBufIdx < rightBuffer.length ? rightBuffer[rightBufIdx] : null;

    if (!leftItem && !rightItem) {
      break;
    }

    if (
      leftItem &&
      (!rightItem || sortKey(leftItem).localeCompare(sortKey(rightItem)) <= 0)
    ) {
      merged.push(leftItem);
      leftBufIdx += 1;
    } else if (rightItem) {
      merged.push(rightItem);
      rightBufIdx += 1;
    }
  }

  return {
    items: merged.slice(globalOffset, globalEnd),
    total,
  };
}
