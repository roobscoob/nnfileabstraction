export abstract class CorruptedStructError<T> extends Error {
  constructor(
    public structName: string,
    reason: string,
  ) {
    super(`Struct ${structName} is corrupted. ${reason}`);
  }
}

export class CorruptedStructFieldNotEqualError<T, K extends keyof T> extends CorruptedStructError<T> {
  constructor(
    structName: string,
    public fieldName: K,
    public expected: T[K],
    public actual: T[K],
  ) {
    super(structName, "Expected " + String(fieldName) + " to be " + expected + ", but was " + actual);
  }
}

export class CorruptedStructFieldNotGreaterThanError<T, K extends keyof T> extends CorruptedStructError<T> {
  constructor(
    structName: string,
    public fieldName: K,
    public minimum: T[K],
    public actual: T[K],
  ) {
    super(structName, "Expected " + String(fieldName) + " to be greater than " + minimum + ", but was " + actual);
  }
}
