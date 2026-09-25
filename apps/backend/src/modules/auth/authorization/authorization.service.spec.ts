import { AuthorizationRepository } from './authorization.repository';
import { AuthorizationService } from './authorization.service';
import { PermissionCacheService } from './permission-cache.service';

describe('AuthorizationService permission cache', () => {
  const organizationId = 'org-11111111-1111-4111-8111-111111111111';
  const userId = 'user-22222222-2222-4222-8222-222222222222';
  const otherUserId = 'user-33333333-3333-4333-8333-333333333333';

  let authorizationRepository: jest.Mocked<
    Pick<AuthorizationRepository, 'loadEffectivePermissionKeys'>
  >;
  let permissionCache: jest.Mocked<
    Pick<
      PermissionCacheService,
      | 'getOrgRevision'
      | 'getCachedPermissionKeys'
      | 'setCachedPermissionKeys'
      | 'bumpOrgRevision'
      | 'invalidateCachedPermissionKeysForUsers'
    >
  >;
  let service: AuthorizationService;

  beforeEach(() => {
    authorizationRepository = {
      loadEffectivePermissionKeys: jest.fn(),
    };
    permissionCache = {
      getOrgRevision: jest.fn(),
      getCachedPermissionKeys: jest.fn(),
      setCachedPermissionKeys: jest.fn(),
      bumpOrgRevision: jest.fn(),
      invalidateCachedPermissionKeysForUsers: jest.fn(),
    };
    service = new AuthorizationService(
      authorizationRepository as unknown as AuthorizationRepository,
      permissionCache as unknown as PermissionCacheService,
    );
  });

  it('returns cached keys only for the current org revision', async () => {
    permissionCache.getOrgRevision.mockResolvedValue(3);
    permissionCache.getCachedPermissionKeys.mockResolvedValue([
      'administration.view',
    ]);

    const keys = await service.getEffectivePermissionKeys(
      userId,
      organizationId,
    );

    expect(keys).toEqual(['administration.view']);
    expect(permissionCache.getCachedPermissionKeys).toHaveBeenCalledWith(
      userId,
      organizationId,
      3,
    );
    expect(
      authorizationRepository.loadEffectivePermissionKeys,
    ).not.toHaveBeenCalled();
  });

  it('reloads from DB after invalidate bumps revision and clears user cache', async () => {
    permissionCache.getOrgRevision
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(2);
    permissionCache.getCachedPermissionKeys
      .mockResolvedValueOnce(['administration.view'])
      .mockResolvedValueOnce(null);
    authorizationRepository.loadEffectivePermissionKeys.mockResolvedValue([
      'fleet_leasing.view',
    ]);
    permissionCache.bumpOrgRevision.mockResolvedValue(2);

    const before = await service.getEffectivePermissionKeys(
      userId,
      organizationId,
    );
    expect(before).toEqual(['administration.view']);

    await service.invalidateOrganizationPermissions(organizationId, [userId]);

    expect(permissionCache.bumpOrgRevision).toHaveBeenCalledWith(
      organizationId,
    );
    expect(
      permissionCache.invalidateCachedPermissionKeysForUsers,
    ).toHaveBeenCalledWith([userId], organizationId);

    const after = await service.getEffectivePermissionKeys(
      userId,
      organizationId,
    );
    expect(after).toEqual(['fleet_leasing.view']);
    expect(
      authorizationRepository.loadEffectivePermissionKeys,
    ).toHaveBeenCalledTimes(1);
  });

  it('does not write cache when revision changes during DB load', async () => {
    permissionCache.getOrgRevision
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(6);
    permissionCache.getCachedPermissionKeys.mockResolvedValue(null);
    authorizationRepository.loadEffectivePermissionKeys.mockResolvedValue([
      'administration.view',
    ]);

    const keys = await service.getEffectivePermissionKeys(
      userId,
      organizationId,
    );

    expect(keys).toEqual(['administration.view']);
    expect(permissionCache.setCachedPermissionKeys).not.toHaveBeenCalled();
  });

  it('invalidateOrganizationPermissions without user ids only bumps revision', async () => {
    await service.invalidateOrganizationPermissions(organizationId);
    expect(permissionCache.bumpOrgRevision).toHaveBeenCalledWith(
      organizationId,
    );
    expect(
      permissionCache.invalidateCachedPermissionKeysForUsers,
    ).not.toHaveBeenCalled();

    await service.invalidateOrganizationPermissions(organizationId, [
      userId,
      otherUserId,
    ]);
    expect(
      permissionCache.invalidateCachedPermissionKeysForUsers,
    ).toHaveBeenCalledWith([userId, otherUserId], organizationId);
  });
});
