import { Menu } from "@/types/menu";
import { COMPONENT_PERMISSIONS } from "@/lib/routePermissions";

/**
 * Filter functional submenus and clean up empty dividers (sections without accessible items).
 */
export function filterAccessibleSubmenus(
  submenus: Menu[] | undefined,
  can: (perm: string) => boolean,
  isForecastEnabled: boolean = true,
  isReceiptByScheduleEnabled: boolean = true
): Menu[] {
  if (!submenus || submenus.length === 0) return [];

  // 1. Identify all functional items that the user can access
  const accessibleItemsMap = new Map<number | string, Menu>();

  for (const item of submenus) {
    if (item.is_divider) continue;
    if (item.name === "Forecast" && !isForecastEnabled) continue;
    if (
      (item.name === "Penerimaan by Schedule" ||
        item.name === "Penerimaan dari Schedule") &&
      !isReceiptByScheduleEnabled
    ) {
      continue;
    }

    const perm = COMPONENT_PERMISSIONS[item.name];
    if (perm && !can(perm)) continue;

    accessibleItemsMap.set(
      item.id,
      item.name === "Forecast" ? { ...item, is_active: isForecastEnabled } : item
    );
  }

  // 2. Reconstruct submenus, keeping dividers ONLY if they have at least 1 accessible functional item
  const result: Menu[] = [];
  let currentDivider: Menu | null = null;
  let itemsInCurrentSection: Menu[] = [];

  for (const item of submenus) {
    if (item.is_divider) {
      // Commit preceding divider if it had items
      if (currentDivider && itemsInCurrentSection.length > 0) {
        result.push(currentDivider);
        result.push(...itemsInCurrentSection);
      }
      currentDivider = item;
      itemsInCurrentSection = [];
    } else {
      if (accessibleItemsMap.has(item.id)) {
        itemsInCurrentSection.push(accessibleItemsMap.get(item.id)!);
      }
    }
  }

  // Flush last section
  if (currentDivider && itemsInCurrentSection.length > 0) {
    result.push(currentDivider);
    result.push(...itemsInCurrentSection);
  } else if (!currentDivider && itemsInCurrentSection.length > 0) {
    result.push(...itemsInCurrentSection);
  }

  return result;
}

/**
 * Filter whole menu hierarchy based on user permissions.
 */
export function filterAccessibleMenus(
  menus: Menu[],
  can: (perm: string) => boolean,
  isForecastEnabled: boolean = true,
  isReceiptByScheduleEnabled: boolean = true
): Menu[] {
  return menus
    .filter((menu) => !menu.hidden)
    .map((menu) => {
      // Check parent module permission if defined
      const parentPerm = COMPONENT_PERMISSIONS[menu.name];
      if (parentPerm && !can(parentPerm)) {
        return null;
      }

      if (menu.submenus && menu.submenus.length > 0) {
        const filteredSubs = filterAccessibleSubmenus(
          menu.submenus,
          can,
          isForecastEnabled,
          isReceiptByScheduleEnabled
        );

        const functionalCount = filteredSubs.filter((s) => !s.is_divider).length;
        if (functionalCount === 0) {
          return null;
        }

        return { ...menu, submenus: filteredSubs };
      } else {
        // Leaf menu
        const perm = COMPONENT_PERMISSIONS[menu.name];
        if (perm && !can(perm)) {
          return null;
        }
        return menu;
      }
    })
    .filter(Boolean) as Menu[];
}

