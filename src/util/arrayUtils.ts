export class ArrayUtils {
  pushImmutable<T>(array: readonly T[], value: T): T[] {
    return [...array, value];
  }
}