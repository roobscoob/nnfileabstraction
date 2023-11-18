import { IdentifierType } from "../folder";

export class StringIdentifier extends IdentifierType {
  constructor(private readonly value: string) {
    super();
  }

  equals(other: StringIdentifier): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}