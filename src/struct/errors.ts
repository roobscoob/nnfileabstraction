export class CorruptedStruct<T> extends Error {
  constructor(
      public field: string,
      public structName: string,
      public assertedValue: T,
      public actualValue: T,
  ) {
    super(`Struct ${structName} is likely corrupt. Field ${field} has value ${actualValue}, when ${assertedValue} was expected.`);
  }
}
