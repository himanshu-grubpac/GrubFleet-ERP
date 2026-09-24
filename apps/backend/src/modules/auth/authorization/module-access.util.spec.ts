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

    it('expands FULL to view and manage', () => {
      expect(
        expandModuleAccess([
          { moduleId: 'fleet_leasing', accessLevel: 'FULL' },
        ]),
      ).toEqual(['fleet_leasing.manage', 'fleet_leasing.view']);
    });

    it('dashboard FULL is view-only (no manage seed)', () => {
      expect(
        expandModuleAccess([{ moduleId: 'dashboard', accessLevel: 'FULL' }]),
      ).toEqual(['dashboard.view']);
    });
  });

  describe('deriveModuleAccessFromKeys', () => {
    it('derives FULL when view and manage present', () => {
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
    const actorAdmin = [
      'administration.view',
      'administration.manage',
      'fleet_leasing.view',
    ];

    it('allows VIEW when actor has VIEW', () => {
      const result = assertModuleAccessDelegatable(actorAdmin, [
        { moduleId: 'fleet_leasing', accessLevel: 'VIEW' },
      ]);
      expect(result.ok).toBe(true);
    });

    it('denies FULL when actor only has VIEW', () => {
      const result = assertModuleAccessDelegatable(actorAdmin, [
        { moduleId: 'fleet_leasing', accessLevel: 'FULL' },
      ]);
      expect(result.ok).toBe(false);
    });

    it('resolveModuleAccessLevel matches keys', () => {
      expect(resolveModuleAccessLevel(actorAdmin, 'fleet_leasing')).toBe(
        'VIEW',
      );
      expect(resolveModuleAccessLevel(actorAdmin, 'administration')).toBe(
        'FULL',
      );
    });
  });
});
