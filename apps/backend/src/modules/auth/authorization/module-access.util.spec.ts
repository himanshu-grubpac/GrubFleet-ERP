import {
  assertModuleAccessDelegatable,
  deriveModuleAccessFromKeys,
  expandModuleAccess,
  resolveModuleAccessLevel,
} from './module-access.util';

describe('module-access.util', () => {
  describe('expandModuleAccess', () => {
    it('expands VIEW to module.view only', () => {
      expect(
        expandModuleAccess([
          { moduleId: 'fleet_leasing', accessLevel: 'VIEW' },
        ]),
      ).toEqual(['fleet_leasing.view']);
    });

    it('expands MANAGE to view and CRUD keys', () => {
      expect(
        expandModuleAccess([
          { moduleId: 'fleet_leasing', accessLevel: 'MANAGE' },
        ]).sort(),
      ).toEqual(
        [
          'fleet_leasing.create',
          'fleet_leasing.delete',
          'fleet_leasing.update',
          'fleet_leasing.view',
        ].sort(),
      );
    });

    it('expands FULL to view, CRUD, and manage', () => {
      expect(
        expandModuleAccess([
          { moduleId: 'fleet_leasing', accessLevel: 'FULL' },
        ]).sort(),
      ).toEqual(
        [
          'fleet_leasing.create',
          'fleet_leasing.delete',
          'fleet_leasing.manage',
          'fleet_leasing.update',
          'fleet_leasing.view',
        ].sort(),
      );
    });

    it('dashboard MANAGE/FULL is view-only (no manage seed)', () => {
      expect(
        expandModuleAccess([{ moduleId: 'dashboard', accessLevel: 'MANAGE' }]),
      ).toEqual(['dashboard.view']);
      expect(
        expandModuleAccess([{ moduleId: 'dashboard', accessLevel: 'FULL' }]),
      ).toEqual(['dashboard.view']);
    });
  });

  describe('deriveModuleAccessFromKeys', () => {
    it('derives MANAGE when view and CRUD present without manage', () => {
      const rows = deriveModuleAccessFromKeys([
        'administration.view',
        'administration.create',
        'administration.update',
        'administration.delete',
      ]);
      expect(rows).toContainEqual({
        moduleId: 'administration',
        accessLevel: 'MANAGE',
      });
    });

    it('derives FULL when view, CRUD, and manage present', () => {
      const rows = deriveModuleAccessFromKeys([
        'administration.view',
        'administration.create',
        'administration.update',
        'administration.delete',
        'administration.manage',
      ]);
      expect(rows).toContainEqual({
        moduleId: 'administration',
        accessLevel: 'FULL',
      });
    });

    it('derives FULL for legacy view + manage only', () => {
      const rows = deriveModuleAccessFromKeys([
        'administration.view',
        'administration.manage',
      ]);
      expect(rows).toContainEqual({
        moduleId: 'administration',
        accessLevel: 'FULL',
      });
    });
  });

  describe('delegation', () => {
    const actorManage = [
      'administration.view',
      'administration.create',
      'administration.update',
      'administration.delete',
    ];

    it('allows VIEW when actor has VIEW', () => {
      const result = assertModuleAccessDelegatable(
        ['fleet_leasing.view'],
        [{ moduleId: 'fleet_leasing', accessLevel: 'VIEW' }],
      );
      expect(result.ok).toBe(true);
    });

    it('denies FULL when actor only has MANAGE (no manage key)', () => {
      const result = assertModuleAccessDelegatable(actorManage, [
        { moduleId: 'administration', accessLevel: 'FULL' },
      ]);
      expect(result.ok).toBe(false);
    });

    it('resolveModuleAccessLevel matches keys', () => {
      expect(resolveModuleAccessLevel(actorManage, 'administration')).toBe(
        'MANAGE',
      );
      expect(
        resolveModuleAccessLevel(
          [...actorManage, 'administration.manage'],
          'administration',
        ),
      ).toBe('FULL');
    });
  });
});
