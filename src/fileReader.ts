import { Endianness, StringEncoding } from "./enums";
import { SyncReadableSpan } from "./span";
import { Option } from "./util/option";
import { Result } from "./util/result";

export class FileOutOfBoundsReadError extends Error {
  constructor(
    public datatype: string,
    public offset: number,
    public size?: number,
  ) {
    super(Option.fromNullable(size)
      .map(size => `Attempted to read ${datatype} of size ${size} at offset ${offset}, but the file is not large enough.`)
      .unwrapOr(`Attempted to read ${datatype} at offset ${offset}, but the file is not large enough.`)
    )
  }
}

export class FileReader {
  constructor(
    private file: SyncReadableSpan,
  ) { }

  private offset: number = 0;

  private growOffset(size: number) {
    const offset = this.offset;
    this.offset += size;
    return offset;
  }

  private isBigEndian: boolean = false;
  private encoding: StringEncoding = StringEncoding.UTF8;

  private inBounds(size: number) {
    return this.offset + size <= this.file.getSize();
  }

  setEndianness(endianness: Endianness) {
    this.isBigEndian = endianness === Endianness.BigEndian;
  }

  setEncoding(encoding: StringEncoding) {
    this.encoding = encoding;
  }

  getUInt8(): Result<number, FileOutOfBoundsReadError> {
    if (!this.inBounds(1))
      return Result.err(new FileOutOfBoundsReadError("UInt8", this.offset, 1));

    return Result.ok(this.file.getUInt8(this.growOffset(1)));
  }

  getSInt8(): Result<number, FileOutOfBoundsReadError> {
    if (!this.inBounds(1))
      return Result.err(new FileOutOfBoundsReadError("SInt8", this.offset, 1));

    return Result.ok(this.file.getSInt8(this.growOffset(1)));
  }

  getUInt16(): Result<number, FileOutOfBoundsReadError> {
    if (!this.inBounds(2))
      return Result.err(new FileOutOfBoundsReadError("UInt16", this.offset, 2));

    return Result.ok(this.isBigEndian
      ? this.file.getUInt16BE(this.growOffset(2))
      : this.file.getUInt16LE(this.growOffset(2))
    );
  }

  getSInt16(): Result<number, FileOutOfBoundsReadError> {
    if (!this.inBounds(2))
      return Result.err(new FileOutOfBoundsReadError("SInt16", this.offset, 2));

    return Result.ok(this.isBigEndian
      ? this.file.getSInt16BE(this.growOffset(2))
      : this.file.getSInt16LE(this.growOffset(2))
    );
  }

  getUInt32(): Result<number, FileOutOfBoundsReadError> {
    if (!this.inBounds(4))
      return Result.err(new FileOutOfBoundsReadError("UInt32", this.offset, 4));

    return Result.ok(this.isBigEndian
      ? this.file.getUInt32BE(this.growOffset(4))
      : this.file.getUInt32LE(this.growOffset(4))
    );
  }

  getSInt32(): Result<number, FileOutOfBoundsReadError> {
    if (!this.inBounds(4))
      return Result.err(new FileOutOfBoundsReadError("SInt32", this.offset, 4));

    return Result.ok(this.isBigEndian
      ? this.file.getSInt32BE(this.growOffset(4))
      : this.file.getSInt32LE(this.growOffset(4))
    );
  }

  getUInt64(): Result<number, FileOutOfBoundsReadError> {
    if (!this.inBounds(8))
      return Result.err(new FileOutOfBoundsReadError("UInt64", this.offset, 8));

    return Result.ok(this.isBigEndian
      ? this.file.getUInt64BE(this.growOffset(8))
      : this.file.getUInt64LE(this.growOffset(8))
    );
  }

  getSInt64(): Result<number, FileOutOfBoundsReadError> {
    if (!this.inBounds(8))
      return Result.err(new FileOutOfBoundsReadError("SInt64", this.offset, 8));

    return Result.ok(this.isBigEndian
      ? this.file.getSInt64BE(this.growOffset(8))
      : this.file.getSInt64LE(this.growOffset(8))
    );
  }

  getUBigInt64(): Result<bigint, FileOutOfBoundsReadError> {
    if (!this.inBounds(8))
      return Result.err(new FileOutOfBoundsReadError("UBigInt64", this.offset, 8));

    return Result.ok(this.isBigEndian
      ? this.file.getUBigInt64BE(this.growOffset(8))
      : this.file.getUBigInt64LE(this.growOffset(8))
    );
  }

  getSBigInt64(): Result<bigint, FileOutOfBoundsReadError> {
    if (!this.inBounds(8))
      return Result.err(new FileOutOfBoundsReadError("SBigInt64", this.offset, 8));

    return Result.ok(this.isBigEndian
      ? this.file.getSBigInt64BE(this.growOffset(8))
      : this.file.getSBigInt64LE(this.growOffset(8))
    );
  }

  getFloat32(): Result<number, FileOutOfBoundsReadError> {
    if (!this.inBounds(4))
      return Result.err(new FileOutOfBoundsReadError("Float32", this.offset, 4));

    return Result.ok(this.isBigEndian
      ? this.file.getFloat32BE(this.growOffset(4))
      : this.file.getFloat32LE(this.growOffset(4))
    );
  }

  getFloat64(): Result<number, FileOutOfBoundsReadError> {
    if (!this.inBounds(8))
      return Result.err(new FileOutOfBoundsReadError("Float64", this.offset, 8));

    return Result.ok(this.isBigEndian
      ? this.file.getFloat64BE(this.growOffset(8))
      : this.file.getFloat64LE(this.growOffset(8))
    );
  }

  getArrayBuffer(length: number): Result<ArrayBuffer, FileOutOfBoundsReadError> {
    if (!this.inBounds(length))
      return Result.err(new FileOutOfBoundsReadError("ArrayBuffer", this.offset, length));

    return Result.ok(this.file.getByteSlice(this.growOffset(length), length));
  }

  getArrayBufferToEnd(): ArrayBuffer {
    return this.file.getByteSliceToEnd(this.growOffset(this.file.getSize() - this.offset));
  }

  getArrayBufferToNull(): ArrayBuffer {
    return this.file.getByteSliceToNull(this.growOffset(this.file.getSize() - this.offset));
  }

  getArrayBufferToEOF(): ArrayBuffer {
    return this.file.getByteSliceToEOF(this.growOffset(this.file.getSize() - this.offset));
  }

  getString(length: number, encoding?: StringEncoding): Result<string, FileOutOfBoundsReadError> {
    if (!this.inBounds(length))
      return Result.err(new FileOutOfBoundsReadError("String", this.offset, length));

    return Result.ok(this.file.getString(this.growOffset(length), length, encoding ?? this.encoding).value);
  }

  getStringToEnd(encoding?: StringEncoding): string {
    const { value, size } = this.file.getStringToEnd(this.offset, encoding ?? this.encoding);

    this.offset += size;

    return value;
  }

  getStringToNull(encoding?: StringEncoding): string {
    const { value, size } = this.file.getStringToNull(this.offset, encoding ?? this.encoding);

    this.offset += size;

    return value;
  }

  getStringToEOF(encoding?: StringEncoding): string {
    const { value, size } = this.file.getStringToEOF(this.offset, encoding ?? this.encoding);

    this.offset += size;

    return value;
  }
}