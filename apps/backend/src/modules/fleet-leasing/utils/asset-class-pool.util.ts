/**
 * Effective lease pool: physical register units minus unallocated commitments
 * on other in-flight contracts (draft through active / awaiting assets).
 */
export function computePoolAvailableNow(
  physicalAvailable: number,
  reservedUnallocatedOnOtherContracts: number,
): number {
  const reserved = Math.max(0, reservedUnallocatedOnOtherContracts);
  return Math.max(0, physicalAvailable - reserved);
}

/**
 * Edit / exclude-contract preview: register units already assigned to this
 * contract are not in the physical "available" pool but still cover its lines.
 */
export function computeEffectivePoolAvailableNow(
  physicalAvailable: number,
  reservedUnallocatedOnOtherContracts: number,
  ownContractAllocatedOnClass: number,
): number {
  const base = computePoolAvailableNow(
    physicalAvailable,
    reservedUnallocatedOnOtherContracts,
  );
  return base + Math.max(0, ownContractAllocatedOnClass);
}
