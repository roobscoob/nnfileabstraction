import { StringIdentifier } from "../../fileHandleImplementations/stringIdentifier";

export class OffsetArgumentInvalidError extends Error {
  constructor(
    public offset: number,
    public availableSize: number,
  ) {
    super("Offset argument invalid. Provided offset: " + offset + ", however only " + availableSize + " bytes are available.");
  }
}

export class NotEnoughBytesAvailableError extends Error {
  constructor(
    public role: string,
    public expectedSize: number,
    public availableSize: number,
  ) {
    super("Not enough bytes available for " + role + ". Expected: " + expectedSize + ", available: " + availableSize);
  }
}

export class InvalidMagicError extends Error {
  constructor(
    public expectedMagic: string,
  ) {
    super("Invalid magic. Expected: " + expectedMagic);
  }
}

export class InvalidFileEntryNameError extends Error {
  constructor() {
    super("Invalid file entry name. The name pointer pointed out of bounds of the string table.");
  }
}

export class InvalidFileEntryDataError extends Error {
  constructor() {
    super("Invalid file entry data. The data pointer pointed out of bounds of the file data, or the data size was out of bounds of the file data.");
  }
}

export class PartitionFileSystemEntryNotFoundError extends Error {
  constructor(public readonly entry: StringIdentifier) {
    super(`Entry "${entry}" not found`);
  }
}