import { Endianness, StringEncoding } from "./enums";
import { Option } from "./util/option";
import { Result } from "./util/result";

export abstract class FileHandle {
  abstract length(): number;
  abstract getUInt8(offset: number): number;
  abstract getSInt8(offset: number): number;
  abstract getUInt16LE(offset: number): number;
  abstract getSInt16LE(offset: number): number;
  abstract getUInt16BE(offset: number): number;
  abstract getSInt16BE(offset: number): number;
  abstract getUInt32LE(offset: number): number;
  abstract getSInt32LE(offset: number): number;
  abstract getUInt32BE(offset: number): number;
  abstract getSInt32BE(offset: number): number;
  abstract getUInt64LE(offset: number): number;
  abstract getSInt64LE(offset: number): number;
  abstract getUInt64BE(offset: number): number;
  abstract getSInt64BE(offset: number): number;
  abstract getUBigInt64LE(offset: number): bigint;
  abstract getSBigInt64LE(offset: number): bigint;
  abstract getUBigInt64BE(offset: number): bigint;
  abstract getSBigInt64BE(offset: number): bigint;
  abstract getFloat32LE(offset: number): number;
  abstract getFloat32BE(offset: number): number;
  abstract getFloat64LE(offset: number): number;
  abstract getFloat64BE(offset: number): number;
  abstract getByteSlice(offset: number, length: number): ArrayBuffer;
  abstract getByteSliceToEnd(offset: number): ArrayBuffer;
  abstract getByteSliceToNull(offset: number): ArrayBuffer;
  abstract getByteSliceToEOF(offset: number): ArrayBuffer;
  abstract getString(offset: number, length: number, format: StringEncoding): { value: string, size: number };
  abstract getStringToEnd(offset: number, format: StringEncoding): { value: string, size: number };
  abstract getStringToNull(offset: number, format: StringEncoding): { value: string, size: number };
  abstract getStringToEOF(offset: number, format: StringEncoding): { value: string, size: number };
}

export class WriteableFileOverflowError extends Error {
  constructor(
    public readonly offset: number,
    public readonly length: number,
  ) {
    super(`Attempted to write ${length} bytes at offset ${offset}, but the file is not large enough.`);
  }
}

export abstract class WritableFileHandle extends FileHandle {
  abstract setUInt8(offset: number, value: number): Result<void, WriteableFileOverflowError>;
  abstract setSInt8(offset: number, value: number): Result<void, WriteableFileOverflowError>;
  abstract setUInt16LE(offset: number, value: number): Result<void, WriteableFileOverflowError>;
  abstract setSInt16LE(offset: number, value: number): Result<void, WriteableFileOverflowError>;
  abstract setUInt16BE(offset: number, value: number): Result<void, WriteableFileOverflowError>;
  abstract setSInt16BE(offset: number, value: number): Result<void, WriteableFileOverflowError>;
  abstract setUInt32LE(offset: number, value: number): Result<void, WriteableFileOverflowError>;
  abstract setSInt32LE(offset: number, value: number): Result<void, WriteableFileOverflowError>;
  abstract setUInt32BE(offset: number, value: number): Result<void, WriteableFileOverflowError>;
  abstract setSInt32BE(offset: number, value: number): Result<void, WriteableFileOverflowError>;
  abstract setUInt64LE(offset: number, value: number): Result<void, WriteableFileOverflowError>;
  abstract setSInt64LE(offset: number, value: number): Result<void, WriteableFileOverflowError>;
  abstract setUInt64BE(offset: number, value: number): Result<void, WriteableFileOverflowError>;
  abstract setSInt64BE(offset: number, value: number): Result<void, WriteableFileOverflowError>;
  abstract setUBigInt64LE(offset: number, value: bigint): Result<void, WriteableFileOverflowError>;
  abstract setSBigInt64LE(offset: number, value: bigint): Result<void, WriteableFileOverflowError>;
  abstract setUBigInt64BE(offset: number, value: bigint): Result<void, WriteableFileOverflowError>;
  abstract setSBigInt64BE(offset: number, value: bigint): Result<void, WriteableFileOverflowError>;
  abstract setFloat32LE(offset: number, value: number): Result<void, WriteableFileOverflowError>;
  abstract setFloat32BE(offset: number, value: number): Result<void, WriteableFileOverflowError>;
  abstract setFloat64LE(offset: number, value: number): Result<void, WriteableFileOverflowError>;
  abstract setFloat64BE(offset: number, value: number): Result<void, WriteableFileOverflowError>;
  abstract setByteSlice(offset: number, value: ArrayBuffer): Result<void, WriteableFileOverflowError>;
  abstract setString(offset: number, value: string, format: StringEncoding): Result<number, WriteableFileOverflowError>;
}

export abstract class GrowableFileHandle extends FileHandle {
  abstract setUInt8(offset: number, value: number): void;
  abstract setSInt8(offset: number, value: number): void;
  abstract setUInt16LE(offset: number, value: number): void;
  abstract setSInt16LE(offset: number, value: number): void;
  abstract setUInt16BE(offset: number, value: number): void;
  abstract setSInt16BE(offset: number, value: number): void;
  abstract setUInt32LE(offset: number, value: number): void;
  abstract setSInt32LE(offset: number, value: number): void;
  abstract setUInt32BE(offset: number, value: number): void;
  abstract setSInt32BE(offset: number, value: number): void;
  abstract setUInt64LE(offset: number, value: number): void;
  abstract setSInt64LE(offset: number, value: number): void;
  abstract setUInt64BE(offset: number, value: number): void;
  abstract setSInt64BE(offset: number, value: number): void;
  abstract setUBigInt64LE(offset: number, value: bigint): void;
  abstract setSBigInt64LE(offset: number, value: bigint): void;
  abstract setUBigInt64BE(offset: number, value: bigint): void;
  abstract setSBigInt64BE(offset: number, value: bigint): void;
  abstract setFloat32LE(offset: number, value: number): void;
  abstract setFloat32BE(offset: number, value: number): void;
  abstract setFloat64LE(offset: number, value: number): void;
  abstract setFloat64BE(offset: number, value: number): void;
  abstract setByteSlice(offset: number, value: ArrayBuffer): void;
  abstract setString(offset: number, value: string, format: StringEncoding): number;
}