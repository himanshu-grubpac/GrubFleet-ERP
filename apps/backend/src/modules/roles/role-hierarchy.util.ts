export type RoleParentLink = {
  id: string;
  parentRoleId: string | null;
};

/** Role id plus all descendants in the parent_role_id tree. */
export function collectRoleSubtree(
  rootRoleIds: string[],
  links: RoleParentLink[],
): Set<string> {
  const childrenByParent = new Map<string, string[]>();
  for (const link of links) {
    if (link.parentRoleId) {
      const siblings = childrenByParent.get(link.parentRoleId) ?? [];
      siblings.push(link.id);
      childrenByParent.set(link.parentRoleId, siblings);
    }
  }

  const visible = new Set<string>();
  const queue = [...rootRoleIds];
  while (queue.length > 0) {
    const id = queue.shift();
    if (!id || visible.has(id)) {
      continue;
    }
    visible.add(id);
    for (const childId of childrenByParent.get(id) ?? []) {
      queue.push(childId);
    }
  }
  return visible;
}

/** True when newParentId is the role itself or a descendant of roleId. */
export function wouldCreateRoleHierarchyCycle(
  roleId: string,
  newParentId: string,
  links: RoleParentLink[],
): boolean {
  if (roleId === newParentId) {
    return true;
  }
  const subtree = collectRoleSubtree([roleId], links);
  return subtree.has(newParentId);
}
