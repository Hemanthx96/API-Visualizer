/**
 * JSON diff utility for comparing two JSON responses.
 * Recursively compares structures and identifies added, removed, and changed fields.
 */

export type DiffStatus = "added" | "removed" | "changed" | "unchanged";

export interface DiffNode {
  status: DiffStatus;
  oldValue?: unknown;
  newValue?: unknown;
  children?: Record<string, DiffNode>;
  arrayItems?: DiffNode[];
}

/**
 * Deep equality check for two values.
 * Handles primitives, objects, arrays, and null/undefined.
 */
const deepEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, idx) => deepEqual(item, b[idx]));
  }

  if (typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) => deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
  }

  return false;
};

/**
 * Checks if two values have different types (excluding null/undefined).
 */
const hasTypeChange = (a: unknown, b: unknown): boolean => {
  if (a == null && b == null) return false;
  if (a == null || b == null) return true;
  if (Array.isArray(a) !== Array.isArray(b)) return true;
  if (typeof a !== typeof b) return true;
  return false;
};

/**
 * Compares two JSON values and returns a diff node.
 * Handles objects, arrays, and primitives recursively.
 */
const compareValues = (oldVal: unknown, newVal: unknown): DiffNode => {
  // Both are arrays: compare by index
  if (Array.isArray(oldVal) && Array.isArray(newVal)) {
    const maxLength = Math.max(oldVal.length, newVal.length);
    const arrayItems: DiffNode[] = [];

    for (let i = 0; i < maxLength; i++) {
      const oldItem = oldVal[i];
      const newItem = newVal[i];

      if (i >= oldVal.length) {
        // Item added
        arrayItems.push({
          status: "added",
          newValue: newItem,
        });
      } else if (i >= newVal.length) {
        // Item removed
        arrayItems.push({
          status: "removed",
          oldValue: oldItem,
        });
      } else {
        // Item exists in both: recurse
        const itemDiff = compareValues(oldItem, newItem);
        arrayItems.push(itemDiff);
      }
    }

    // Check if array itself changed (length or content)
    const hasChanges = arrayItems.some((item) => item.status !== "unchanged");
    const status: DiffStatus = hasChanges ? "changed" : "unchanged";

    return {
      status,
      oldValue: oldVal,
      newValue: newVal,
      arrayItems,
    };
  }

  // Both are objects: compare fields recursively
  if (
    typeof oldVal === "object" &&
    oldVal !== null &&
    !Array.isArray(oldVal) &&
    typeof newVal === "object" &&
    newVal !== null &&
    !Array.isArray(newVal)
  ) {
    const oldObj = oldVal as Record<string, unknown>;
    const newObj = newVal as Record<string, unknown>;
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
    const children: Record<string, DiffNode> = {};

    for (const key of allKeys) {
      const oldField = oldObj[key];
      const newField = newObj[key];

      if (!(key in oldObj)) {
        // Field added
        children[key] = {
          status: "added",
          newValue: newField,
        };
      } else if (!(key in newObj)) {
        // Field removed
        children[key] = {
          status: "removed",
          oldValue: oldField,
        };
      } else {
        // Field exists in both: recurse
        children[key] = compareValues(oldField, newField);
      }
    }

    // Check if object itself changed
    const hasChanges = Object.values(children).some((child) => child.status !== "unchanged");
    const status: DiffStatus = hasChanges ? "changed" : "unchanged";

    return {
      status,
      oldValue: oldVal,
      newValue: newVal,
      children,
    };
  }

  // Primitives or type mismatch: direct comparison
  if (deepEqual(oldVal, newVal)) {
    return {
      status: "unchanged",
      oldValue: oldVal,
      newValue: newVal,
    };
  }

  // Values differ or type changed
  return {
    status: hasTypeChange(oldVal, newVal) ? "changed" : "changed",
    oldValue: oldVal,
    newValue: newVal,
  };
};

/**
 * Compares two JSON responses and returns a structured diff.
 *
 * @param oldJson - The previous/old JSON response
 * @param newJson - The current/new JSON response
 * @returns A DiffNode representing the differences
 *
 * @example
 * ```ts
 * const diff = diffJson({ name: "John" }, { name: "Jane", age: 30 });
 * // Returns: { status: "changed", children: { name: { status: "changed", ... }, age: { status: "added", ... } } }
 * ```
 */
export const diffJson = (oldJson: unknown, newJson: unknown): DiffNode => {
  return compareValues(oldJson, newJson);
};

