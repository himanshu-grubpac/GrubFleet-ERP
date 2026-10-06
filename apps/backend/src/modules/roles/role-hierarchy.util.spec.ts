import {
  collectRoleSubtree,
  wouldCreateRoleHierarchyCycle,
} from './role-hierarchy.util';

describe('role-hierarchy.util', () => {
  const links = [
    { id: 'root', parentRoleId: null },
    { id: 'mid', parentRoleId: 'root' },
    { id: 'leaf', parentRoleId: 'mid' },
  ];

  it('collectRoleSubtree includes descendants only', () => {
    const fromMid = collectRoleSubtree(['mid'], links);
    expect([...fromMid].sort()).toEqual(['leaf', 'mid']);
    const fromRoot = collectRoleSubtree(['root'], links);
    expect([...fromRoot].sort()).toEqual(['leaf', 'mid', 'root']);
  });

  it('wouldCreateRoleHierarchyCycle detects self and descendant parent', () => {
    expect(wouldCreateRoleHierarchyCycle('mid', 'mid', links)).toBe(true);
    expect(wouldCreateRoleHierarchyCycle('mid', 'leaf', links)).toBe(true);
    expect(wouldCreateRoleHierarchyCycle('mid', 'root', links)).toBe(false);
  });
});
