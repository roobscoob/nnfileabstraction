import { Endianness, StringEncoding } from "./enums";
import { Future } from "./util/future";
import { Option } from "./util/option";
import { Result } from "./util/result";
import { StringUtils } from "./util/stringUtils";

export abstract class OutOfBoundsError {
  constructor(
    public readonly offsetInSlice: number,
    public readonly sliceSize: number,
  ) {}
}

export class ReadOutOfBoundsError extends OutOfBoundsError {
  constructor(
    offsetInSlice: number,
    sliceSize: number,
    public readonly readLength: number,
  ) { super(offsetInSlice, sliceSize) }

  toString() {
    return `Attempted to read ${this.readLength} bytes at offset ${this.offsetInSlice}, but the file is only ${this.sliceSize} bytes long.`;
  }
}

export class SliceOutOfBoundsError extends OutOfBoundsError {
  toString() {
    return `Slice ${this.offsetInSlice} is out of bounds for a file of size ${this.sliceSize}.`;
  }
}

export class PointOutOfBoundsError extends SliceOutOfBoundsError {
  toString() {
    return `Pointer ${this.offsetInSlice} is out of bounds for a file of size ${this.sliceSize}.`;
  }
}

export type ReadableSpan<ReadError> = SyncReadableSpan<ReadError> | AsyncReadableSpan<ReadError>;
export type WritableSpan<ReadError, FlushError> = WritableSyncSpan<ReadError, FlushError> | WritableAsyncSpan<FlushError, ReadError>;
export type ResizableSpan<FlushError, ResizeError, ReadError> = ResizableSyncSpan<FlushError, ResizeError, ReadError> | ResizableAsyncSpan<FlushError, ResizeError, ReadError>;

export abstract class SyncReadableSpan<ReadError> {
  isAsync(): this is AsyncReadableSpan<never> { return false; }
  isSync(): this is SyncReadableSpan<ReadError> { return true; }

  private resolvePointer<T>(value: number, base: SyncReadableSpan<T>): Result<SyncReadableSpan<T>, PointOutOfBoundsError> {
    return base
      .slice(value)
      .mapErr(e => new PointOutOfBoundsError(e.offsetInSlice, e.sliceSize));
  }

  abstract getSize(): number;

  abstract getUInt8(offset: number): Result<number, ReadOutOfBoundsError | ReadError>;
  abstract getSInt8(offset: number): Result<number, ReadOutOfBoundsError | ReadError>;
  getUPtr8<T>(offset: number, base: SyncReadableSpan<T>) { return this.getUInt8(offset).map(v => this.resolvePointer(v, base)) }
  getSPtr8<T>(offset: number, base: SyncReadableSpan<T>) { return this.getSInt8(offset).map(v => this.resolvePointer(v, base)) }
  abstract getUInt16LE(offset: number): Result<number, ReadOutOfBoundsError | ReadError>;
  abstract getSInt16LE(offset: number): Result<number, ReadOutOfBoundsError | ReadError>;
  abstract getUInt16BE(offset: number): Result<number, ReadOutOfBoundsError | ReadError>;
  abstract getSInt16BE(offset: number): Result<number, ReadOutOfBoundsError | ReadError>;
  getUPtr16LE<T>(offset: number, base: SyncReadableSpan<T>) { return this.getUInt16LE(offset).map(v => this.resolvePointer(v, base ?? this)) }
  getSPtr16LE<T>(offset: number, base: SyncReadableSpan<T>) { return this.getSInt16LE(offset).map(v => this.resolvePointer(v, base ?? this)) }
  getUPtr16BE<T>(offset: number, base: SyncReadableSpan<T>) { return this.getUInt16BE(offset).map(v => this.resolvePointer(v, base ?? this)) }
  getSPtr16BE<T>(offset: number, base: SyncReadableSpan<T>) { return this.getSInt16BE(offset).map(v => this.resolvePointer(v, base ?? this)) }
  abstract getUInt32LE(offset: number): Result<number, ReadOutOfBoundsError | ReadError>;
  abstract getSInt32LE(offset: number): Result<number, ReadOutOfBoundsError | ReadError>;
  abstract getUInt32BE(offset: number): Result<number, ReadOutOfBoundsError | ReadError>;
  abstract getSInt32BE(offset: number): Result<number, ReadOutOfBoundsError | ReadError>;
  getUPtr32LE<T>(offset: number, base: SyncReadableSpan<T>) { return this.getUInt32LE(offset).map(v => this.resolvePointer(v, base ?? this)) }
  getSPtr32LE<T>(offset: number, base: SyncReadableSpan<T>) { return this.getSInt32LE(offset).map(v => this.resolvePointer(v, base ?? this)) }
  getUPtr32BE<T>(offset: number, base: SyncReadableSpan<T>) { return this.getUInt32BE(offset).map(v => this.resolvePointer(v, base ?? this)) }
  getSPtr32BE<T>(offset: number, base: SyncReadableSpan<T>) { return this.getSInt32BE(offset).map(v => this.resolvePointer(v, base ?? this)) }
  abstract getUInt64LE(offset: number): Result<number, ReadOutOfBoundsError | ReadError>;
  abstract getSInt64LE(offset: number): Result<number, ReadOutOfBoundsError | ReadError>;
  abstract getUInt64BE(offset: number): Result<number, ReadOutOfBoundsError | ReadError>;
  abstract getSInt64BE(offset: number): Result<number, ReadOutOfBoundsError | ReadError>;
  getUPtr64LE<T>(offset: number, base: SyncReadableSpan<T>) { return this.getUInt64LE(offset).map(v => this.resolvePointer(v, base ?? this)) }
  getSPtr64LE<T>(offset: number, base: SyncReadableSpan<T>) { return this.getSInt64LE(offset).map(v => this.resolvePointer(v, base ?? this)) }
  getUPtr64BE<T>(offset: number, base: SyncReadableSpan<T>) { return this.getUInt64BE(offset).map(v => this.resolvePointer(v, base ?? this)) }
  getSPtr64BE<T>(offset: number, base: SyncReadableSpan<T>) { return this.getSInt64BE(offset).map(v => this.resolvePointer(v, base ?? this)) }
  abstract getUBigInt64LE(offset: number): Result<bigint, ReadOutOfBoundsError | ReadError>;
  abstract getSBigInt64LE(offset: number): Result<bigint, ReadOutOfBoundsError | ReadError>;
  abstract getUBigInt64BE(offset: number): Result<bigint, ReadOutOfBoundsError | ReadError>;
  abstract getSBigInt64BE(offset: number): Result<bigint, ReadOutOfBoundsError | ReadError>;
  abstract getFloat32LE(offset: number): Result<number, ReadOutOfBoundsError | ReadError>;
  abstract getFloat32BE(offset: number): Result<number, ReadOutOfBoundsError | ReadError>;
  abstract getFloat64LE(offset: number): Result<number, ReadOutOfBoundsError | ReadError>;
  abstract getFloat64BE(offset: number): Result<number, ReadOutOfBoundsError | ReadError>;
  abstract getByteSlice(offset: number, length: number): Result<DataView, ReadOutOfBoundsError | ReadError>;
  abstract getByteSliceToEnd(offset: number): Result<DataView, ReadOutOfBoundsError | ReadError>;
  abstract getByteSliceToNull(offset: number): Result<DataView, ReadOutOfBoundsError | ReadError>;

  getString(offset: number, length: number, format: StringEncoding) {
    return this
      .getByteSlice(offset, length)
      .map(v => StringUtils.decode(v, format));
  }

  getStringToEnd(offset: number, format: StringEncoding) {
    return this
      .getByteSliceToEnd(offset)
      .map(v => StringUtils.decode(v, format));
  }

  getStringToNull(offset: number, format: StringEncoding) {
    return this
      .getByteSliceToNull(offset)
      .map(v => StringUtils.decode(v, format));
  }

  abstract slice(offset: number, length?: number): Result<SyncReadableSpan<ReadError>, SliceOutOfBoundsError>;
}

export abstract class AsyncReadableSpan<ReadError> {
  isAsync(): this is AsyncReadableSpan<ReadError> { return true; }
  isSync(): this is SyncReadableSpan<never> { return false; }

  private resolvePointer<T>(value: number, base: AsyncReadableSpan<T>): Result<AsyncReadableSpan<T>, PointOutOfBoundsError> {
    return base
      .slice(value)
      .mapErr(e => new PointOutOfBoundsError(e.offsetInSlice, e.sliceSize));
  }

  abstract getSize(): number;

  abstract getUInt8(offset: number): Future<number, ReadOutOfBoundsError | ReadError>;
  abstract getSInt8(offset: number): Future<number, ReadOutOfBoundsError | ReadError>;
  getUPtr8<T>(offset: number, base: AsyncReadableSpan<T>) { return this.getUInt8(offset).map(v => this.resolvePointer(v, base)) }
  getSPtr8<T>(offset: number, base: AsyncReadableSpan<T>) { return this.getSInt8(offset).map(v => this.resolvePointer(v, base)) }
  abstract getUInt16LE(offset: number): Future<number, ReadOutOfBoundsError | ReadError>;
  abstract getSInt16LE(offset: number): Future<number, ReadOutOfBoundsError | ReadError>;
  abstract getUInt16BE(offset: number): Future<number, ReadOutOfBoundsError | ReadError>;
  abstract getSInt16BE(offset: number): Future<number, ReadOutOfBoundsError | ReadError>;
  getUPtr16LE<T>(offset: number, base: AsyncReadableSpan<T>) { return this.getUInt16LE(offset).map(v => this.resolvePointer(v, base)) }
  getSPtr16LE<T>(offset: number, base: AsyncReadableSpan<T>) { return this.getSInt16LE(offset).map(v => this.resolvePointer(v, base)) }
  getUPtr16BE<T>(offset: number, base: AsyncReadableSpan<T>) { return this.getUInt16BE(offset).map(v => this.resolvePointer(v, base)) }
  getSPtr16BE<T>(offset: number, base: AsyncReadableSpan<T>) { return this.getSInt16BE(offset).map(v => this.resolvePointer(v, base)) }
  abstract getUInt32LE(offset: number): Future<number, ReadOutOfBoundsError | ReadError>;
  abstract getSInt32LE(offset: number): Future<number, ReadOutOfBoundsError | ReadError>;
  abstract getUInt32BE(offset: number): Future<number, ReadOutOfBoundsError | ReadError>;
  abstract getSInt32BE(offset: number): Future<number, ReadOutOfBoundsError | ReadError>;
  getUPtr32LE<T>(offset: number, base: AsyncReadableSpan<T>) { return this.getUInt32LE(offset).map(v => this.resolvePointer(v, base)) }
  getSPtr32LE<T>(offset: number, base: AsyncReadableSpan<T>) { return this.getSInt32LE(offset).map(v => this.resolvePointer(v, base)) }
  getUPtr32BE<T>(offset: number, base: AsyncReadableSpan<T>) { return this.getUInt32BE(offset).map(v => this.resolvePointer(v, base)) }
  getSPtr32BE<T>(offset: number, base: AsyncReadableSpan<T>) { return this.getSInt32BE(offset).map(v => this.resolvePointer(v, base)) }
  abstract getUInt64LE(offset: number): Future<number, ReadOutOfBoundsError | ReadError>;
  abstract getSInt64LE(offset: number): Future<number, ReadOutOfBoundsError | ReadError>;
  abstract getUInt64BE(offset: number): Future<number, ReadOutOfBoundsError | ReadError>;
  abstract getSInt64BE(offset: number): Future<number, ReadOutOfBoundsError | ReadError>;
  getUPtr64LE<T>(offset: number, base: AsyncReadableSpan<T>) { return this.getUInt64LE(offset).map(v => this.resolvePointer(v, base)) }
  getSPtr64LE<T>(offset: number, base: AsyncReadableSpan<T>) { return this.getSInt64LE(offset).map(v => this.resolvePointer(v, base)) }
  getUPtr64BE<T>(offset: number, base: AsyncReadableSpan<T>) { return this.getUInt64BE(offset).map(v => this.resolvePointer(v, base)) }
  getSPtr64BE<T>(offset: number, base: AsyncReadableSpan<T>) { return this.getSInt64BE(offset).map(v => this.resolvePointer(v, base)) }
  abstract getUBigInt64LE(offset: number): Future<bigint, ReadOutOfBoundsError | ReadError>;
  abstract getSBigInt64LE(offset: number): Future<bigint, ReadOutOfBoundsError | ReadError>;
  abstract getUBigInt64BE(offset: number): Future<bigint, ReadOutOfBoundsError | ReadError>;
  abstract getSBigInt64BE(offset: number): Future<bigint, ReadOutOfBoundsError | ReadError>;
  abstract getFloat32LE(offset: number): Future<number, ReadOutOfBoundsError | ReadError>;
  abstract getFloat32BE(offset: number): Future<number, ReadOutOfBoundsError | ReadError>;
  abstract getFloat64LE(offset: number): Future<number, ReadOutOfBoundsError | ReadError>;
  abstract getFloat64BE(offset: number): Future<number, ReadOutOfBoundsError | ReadError>;
  abstract getByteSlice(offset: number, length: number): Future<DataView, ReadOutOfBoundsError | ReadError>;
  abstract getByteSliceToEnd(offset: number): Future<DataView, ReadOutOfBoundsError | ReadError>;
  abstract getByteSliceToNull(offset: number): Future<DataView, ReadOutOfBoundsError | ReadError>;

  getString(offset: number, length: number, format: StringEncoding) {
    return this
      .getByteSlice(offset, length)
      .map(v => StringUtils.decode(v, format));
  }

  getStringToEnd(offset: number, format: StringEncoding) {
    return this
      .getByteSliceToEnd(offset)
      .map(v => StringUtils.decode(v, format));
  }

  getStringToNull(offset: number, format: StringEncoding) {
    return this
      .getByteSliceToNull(offset)
      .map(v => StringUtils.decode(v, format));
  }

  abstract slice(offset: number, length?: number): Result<AsyncReadableSpan<ReadError>, SliceOutOfBoundsError>;
}

export class WriteOutOfBoundsError extends Error {
  constructor(
    public readonly offset: number,
    public readonly length: number,
    public readonly size: number,
  ) {
    super(`Attempted to write ${length} bytes at offset ${offset}, but the file is only ${size} bytes long.`);
  }
}

export abstract class WritableSyncSpan<ReadError, FlushError> extends SyncReadableSpan<ReadError> {
  private resolveMutablePointer<T1, T2>(value: number, base: WritableSyncSpan<T1, T2>): Result<WritableSyncSpan<T1, T2>, PointOutOfBoundsError> {
    return base
      .sliceMut(value)
      .mapErr(e => new PointOutOfBoundsError(e.offsetInSlice, e.sliceSize));
  }

  isWritable<FlushError, ResizeError>(): this is WritableSyncSpan<ReadError, FlushError> | ResizableSyncSpan<FlushError, ResizeError, ReadError> { return true; }

  abstract setUInt8(offset: number, value: number): Result<void, WriteOutOfBoundsError>;
  abstract setSInt8(offset: number, value: number): Result<void, WriteOutOfBoundsError>;
  getUMutPtr8<T1, T2>(offset: number, base: WritableSyncSpan<T1, T2>) { return this.getUInt8(offset).map(v => this.resolveMutablePointer(v, base)) }
  getSMutPtr8<T1, T2>(offset: number, base: WritableSyncSpan<T1, T2>) { return this.getSInt8(offset).map(v => this.resolveMutablePointer(v, base)) }
  abstract setUInt16LE(offset: number, value: number): Result<void, WriteOutOfBoundsError>;
  abstract setSInt16LE(offset: number, value: number): Result<void, WriteOutOfBoundsError>;
  abstract setUInt16BE(offset: number, value: number): Result<void, WriteOutOfBoundsError>;
  abstract setSInt16BE(offset: number, value: number): Result<void, WriteOutOfBoundsError>;
  getUMutPtr16LE<T1, T2>(offset: number, base: WritableSyncSpan<T1, T2>) { return this.getUInt16LE(offset).map(v => this.resolveMutablePointer(v, base)) }
  getSMutPtr16LE<T1, T2>(offset: number, base: WritableSyncSpan<T1, T2>) { return this.getSInt16LE(offset).map(v => this.resolveMutablePointer(v, base)) }
  getUMutPtr16BE<T1, T2>(offset: number, base: WritableSyncSpan<T1, T2>) { return this.getUInt16BE(offset).map(v => this.resolveMutablePointer(v, base)) }
  getSMutPtr16BE<T1, T2>(offset: number, base: WritableSyncSpan<T1, T2>) { return this.getSInt16BE(offset).map(v => this.resolveMutablePointer(v, base)) }
  abstract setUInt32LE(offset: number, value: number): Result<void, WriteOutOfBoundsError>;
  abstract setSInt32LE(offset: number, value: number): Result<void, WriteOutOfBoundsError>;
  abstract setUInt32BE(offset: number, value: number): Result<void, WriteOutOfBoundsError>;
  abstract setSInt32BE(offset: number, value: number): Result<void, WriteOutOfBoundsError>;
  getUMutPtr32LE<T1, T2>(offset: number, base: WritableSyncSpan<T1, T2>) { return this.getUInt32LE(offset).map(v => this.resolveMutablePointer(v, base)) }
  getSMutPtr32LE<T1, T2>(offset: number, base: WritableSyncSpan<T1, T2>) { return this.getSInt32LE(offset).map(v => this.resolveMutablePointer(v, base)) }
  getUMutPtr32BE<T1, T2>(offset: number, base: WritableSyncSpan<T1, T2>) { return this.getUInt32BE(offset).map(v => this.resolveMutablePointer(v, base)) }
  getSMutPtr32BE<T1, T2>(offset: number, base: WritableSyncSpan<T1, T2>) { return this.getSInt32BE(offset).map(v => this.resolveMutablePointer(v, base)) }
  abstract setUInt64LE(offset: number, value: number): Result<void, WriteOutOfBoundsError>;
  abstract setSInt64LE(offset: number, value: number): Result<void, WriteOutOfBoundsError>;
  abstract setUInt64BE(offset: number, value: number): Result<void, WriteOutOfBoundsError>;
  abstract setSInt64BE(offset: number, value: number): Result<void, WriteOutOfBoundsError>;
  getUMutPtr64LE<T1, T2>(offset: number, base: WritableSyncSpan<T1, T2>) { return this.getUInt64LE(offset).map(v => this.resolveMutablePointer(v, base)) }
  getSMutPtr64LE<T1, T2>(offset: number, base: WritableSyncSpan<T1, T2>) { return this.getSInt64LE(offset).map(v => this.resolveMutablePointer(v, base)) }
  getUMutPtr64BE<T1, T2>(offset: number, base: WritableSyncSpan<T1, T2>) { return this.getUInt64BE(offset).map(v => this.resolveMutablePointer(v, base)) }
  getSMutPtr64BE<T1, T2>(offset: number, base: WritableSyncSpan<T1, T2>) { return this.getSInt64BE(offset).map(v => this.resolveMutablePointer(v, base)) }
  abstract setUBigInt64LE(offset: number, value: bigint): Result<void, WriteOutOfBoundsError>;
  abstract setSBigInt64LE(offset: number, value: bigint): Result<void, WriteOutOfBoundsError>;
  abstract setUBigInt64BE(offset: number, value: bigint): Result<void, WriteOutOfBoundsError>;
  abstract setSBigInt64BE(offset: number, value: bigint): Result<void, WriteOutOfBoundsError>;
  abstract setFloat32LE(offset: number, value: number): Result<void, WriteOutOfBoundsError>;
  abstract setFloat32BE(offset: number, value: number): Result<void, WriteOutOfBoundsError>;
  abstract setFloat64LE(offset: number, value: number): Result<void, WriteOutOfBoundsError>;
  abstract setFloat64BE(offset: number, value: number): Result<void, WriteOutOfBoundsError>;
  abstract setByteSlice(offset: number, value: ArrayBuffer): Result<void, WriteOutOfBoundsError>;
  abstract setString(offset: number, value: string, format: StringEncoding): Result<number, WriteOutOfBoundsError>;
  
  abstract sliceMut(offset: number, length?: number): Result<WritableSyncSpan<ReadError, FlushError>, SliceOutOfBoundsError>;

  abstract flush(): Future<void, FlushError>;
}

export abstract class WritableAsyncSpan<FlushError, ReadError> extends AsyncReadableSpan<ReadError> {
  private resolveMutablePointer<T1, T2>(value: number, base: WritableAsyncSpan<T1, T2>): Result<WritableAsyncSpan<T1, T2>, PointOutOfBoundsError> {
    return base
      .sliceMut(value)
      .mapErr(e => new PointOutOfBoundsError(e.offsetInSlice, e.sliceSize));
  }

  isWritable<FlushError, ResizeError>(): this is WritableAsyncSpan<FlushError, ReadError> | ResizableAsyncSpan<FlushError, ResizeError, ReadError> { return true; }

  abstract setUInt8(offset: number, value: number): Result<void, WriteOutOfBoundsError>;
  abstract setSInt8(offset: number, value: number): Result<void, WriteOutOfBoundsError>;
  getUMutPtr8<T1, T2>(offset: number, base: WritableAsyncSpan<T1, T2>) { return this.getUInt8(offset).map(v => this.resolveMutablePointer(v, base)) }
  getSMutPtr8<T1, T2>(offset: number, base: WritableAsyncSpan<T1, T2>) { return this.getSInt8(offset).map(v => this.resolveMutablePointer(v, base)) }
  abstract setUInt16LE(offset: number, value: number): Result<void, WriteOutOfBoundsError>;
  abstract setSInt16LE(offset: number, value: number): Result<void, WriteOutOfBoundsError>;
  abstract setUInt16BE(offset: number, value: number): Result<void, WriteOutOfBoundsError>;
  abstract setSInt16BE(offset: number, value: number): Result<void, WriteOutOfBoundsError>;
  getUMutPtr16LE<T1, T2>(offset: number, base: WritableAsyncSpan<T1, T2>) { return this.getUInt16LE(offset).map(v => this.resolveMutablePointer(v, base)) }
  getSMutPtr16LE<T1, T2>(offset: number, base: WritableAsyncSpan<T1, T2>) { return this.getSInt16LE(offset).map(v => this.resolveMutablePointer(v, base)) }
  getUMutPtr16BE<T1, T2>(offset: number, base: WritableAsyncSpan<T1, T2>) { return this.getUInt16BE(offset).map(v => this.resolveMutablePointer(v, base)) }
  getSMutPtr16BE<T1, T2>(offset: number, base: WritableAsyncSpan<T1, T2>) { return this.getSInt16BE(offset).map(v => this.resolveMutablePointer(v, base)) }
  abstract setUInt32LE(offset: number, value: number): Result<void, WriteOutOfBoundsError>;
  abstract setSInt32LE(offset: number, value: number): Result<void, WriteOutOfBoundsError>;
  abstract setUInt32BE(offset: number, value: number): Result<void, WriteOutOfBoundsError>;
  abstract setSInt32BE(offset: number, value: number): Result<void, WriteOutOfBoundsError>;
  getUMutPtr32LE<T1, T2>(offset: number, base: WritableAsyncSpan<T1, T2>) { return this.getUInt32LE(offset).map(v => this.resolveMutablePointer(v, base)) }
  getSMutPtr32LE<T1, T2>(offset: number, base: WritableAsyncSpan<T1, T2>) { return this.getSInt32LE(offset).map(v => this.resolveMutablePointer(v, base)) }
  getUMutPtr32BE<T1, T2>(offset: number, base: WritableAsyncSpan<T1, T2>) { return this.getUInt32BE(offset).map(v => this.resolveMutablePointer(v, base)) }
  getSMutPtr32BE<T1, T2>(offset: number, base: WritableAsyncSpan<T1, T2>) { return this.getSInt32BE(offset).map(v => this.resolveMutablePointer(v, base)) }
  abstract setUInt64LE(offset: number, value: number): Result<void, WriteOutOfBoundsError>;
  abstract setSInt64LE(offset: number, value: number): Result<void, WriteOutOfBoundsError>;
  abstract setUInt64BE(offset: number, value: number): Result<void, WriteOutOfBoundsError>;
  abstract setSInt64BE(offset: number, value: number): Result<void, WriteOutOfBoundsError>;
  getUMutPtr64LE<T1, T2>(offset: number, base: WritableAsyncSpan<T1, T2>) { return this.getUInt64LE(offset).map(v => this.resolveMutablePointer(v, base)) }
  getSMutPtr64LE<T1, T2>(offset: number, base: WritableAsyncSpan<T1, T2>) { return this.getSInt64LE(offset).map(v => this.resolveMutablePointer(v, base)) }
  getUMutPtr64BE<T1, T2>(offset: number, base: WritableAsyncSpan<T1, T2>) { return this.getUInt64BE(offset).map(v => this.resolveMutablePointer(v, base)) }
  getSMutPtr64BE<T1, T2>(offset: number, base: WritableAsyncSpan<T1, T2>) { return this.getSInt64BE(offset).map(v => this.resolveMutablePointer(v, base)) }
  abstract setUBigInt64LE(offset: number, value: bigint): Result<void, WriteOutOfBoundsError>;
  abstract setSBigInt64LE(offset: number, value: bigint): Result<void, WriteOutOfBoundsError>;
  abstract setUBigInt64BE(offset: number, value: bigint): Result<void, WriteOutOfBoundsError>;
  abstract setSBigInt64BE(offset: number, value: bigint): Result<void, WriteOutOfBoundsError>;
  abstract setFloat32LE(offset: number, value: number): Result<void, WriteOutOfBoundsError>;
  abstract setFloat32BE(offset: number, value: number): Result<void, WriteOutOfBoundsError>;
  abstract setFloat64LE(offset: number, value: number): Result<void, WriteOutOfBoundsError>;
  abstract setFloat64BE(offset: number, value: number): Result<void, WriteOutOfBoundsError>;
  abstract setByteSlice(offset: number, value: ArrayBuffer): Result<void, WriteOutOfBoundsError>;
  abstract setString(offset: number, value: string, format: StringEncoding): Result<number, WriteOutOfBoundsError>;
  
  abstract sliceMut(offset: number, length?: number): Result<WritableAsyncSpan<FlushError, ReadError>, SliceOutOfBoundsError>;

  abstract flush(): Future<void, FlushError>;
}

export abstract class ResizableSyncSpan<FlushError, ResizeError, ReadError> extends SyncReadableSpan<ReadError> {
  private resolveResizablePointer<T1, T2, T3>(value: number, base: ResizableSyncSpan<T1, T2, T3>): Result<ResizableSyncSpan<T1, T2, T3>, PointOutOfBoundsError> {
    return base
      .sliceResizable(value)
      .mapErr(e => new PointOutOfBoundsError(e.offsetInSlice, e.sliceSize));
  }

  abstract setSize(size: number): Result<void, ResizeError>;

  abstract setUInt8(offset: number, value: number): Result<void, ResizeError>;
  abstract setSInt8(offset: number, value: number): Result<void, ResizeError>;
  getUResizablePtr8<T1, T2, T3>(offset: number, base: ResizableSyncSpan<T1, T2, T3>) { return this.getUInt8(offset).map(v => this.resolveResizablePointer<T1, T2, T3>(v, base)) }
  getSResizablePtr8<T1, T2, T3>(offset: number, base: ResizableSyncSpan<T1, T2, T3>) { return this.getSInt8(offset).map(v => this.resolveResizablePointer<T1, T2, T3>(v, base)) }
  abstract setUInt16LE(offset: number, value: number): Result<void, ResizeError>;
  abstract setSInt16LE(offset: number, value: number): Result<void, ResizeError>;
  abstract setUInt16BE(offset: number, value: number): Result<void, ResizeError>;
  abstract setSInt16BE(offset: number, value: number): Result<void, ResizeError>;
  getUResizablePtr16LE<T1, T2, T3>(offset: number, base: ResizableSyncSpan<T1, T2, T3>) { return this.getUInt16LE(offset).map(v => this.resolveResizablePointer<T1, T2, T3>(v, base)) }
  getSResizablePtr16LE<T1, T2, T3>(offset: number, base: ResizableSyncSpan<T1, T2, T3>) { return this.getSInt16LE(offset).map(v => this.resolveResizablePointer<T1, T2, T3>(v, base)) }
  getUResizablePtr16BE<T1, T2, T3>(offset: number, base: ResizableSyncSpan<T1, T2, T3>) { return this.getUInt16BE(offset).map(v => this.resolveResizablePointer<T1, T2, T3>(v, base)) }
  getSResizablePtr16BE<T1, T2, T3>(offset: number, base: ResizableSyncSpan<T1, T2, T3>) { return this.getSInt16BE(offset).map(v => this.resolveResizablePointer<T1, T2, T3>(v, base)) }
  abstract setUInt32LE(offset: number, value: number): Result<void, ResizeError>;
  abstract setSInt32LE(offset: number, value: number): Result<void, ResizeError>;
  abstract setUInt32BE(offset: number, value: number): Result<void, ResizeError>;
  abstract setSInt32BE(offset: number, value: number): Result<void, ResizeError>;
  getUResizablePtr32LE<T1, T2, T3>(offset: number, base: ResizableSyncSpan<T1, T2, T3>) { return this.getUInt32LE(offset).map(v => this.resolveResizablePointer<T1, T2, T3>(v, base)) }
  getSResizablePtr32LE<T1, T2, T3>(offset: number, base: ResizableSyncSpan<T1, T2, T3>) { return this.getSInt32LE(offset).map(v => this.resolveResizablePointer<T1, T2, T3>(v, base)) }
  getUResizablePtr32BE<T1, T2, T3>(offset: number, base: ResizableSyncSpan<T1, T2, T3>) { return this.getUInt32BE(offset).map(v => this.resolveResizablePointer<T1, T2, T3>(v, base)) }
  getSResizablePtr32BE<T1, T2, T3>(offset: number, base: ResizableSyncSpan<T1, T2, T3>) { return this.getSInt32BE(offset).map(v => this.resolveResizablePointer<T1, T2, T3>(v, base)) }
  abstract setUInt64LE(offset: number, value: number): Result<void, ResizeError>;
  abstract setSInt64LE(offset: number, value: number): Result<void, ResizeError>;
  abstract setUInt64BE(offset: number, value: number): Result<void, ResizeError>;
  abstract setSInt64BE(offset: number, value: number): Result<void, ResizeError>;
  getUResizablePtr64LE<T1, T2, T3>(offset: number, base: ResizableSyncSpan<T1, T2, T3>) { return this.getUInt64LE(offset).map(v => this.resolveResizablePointer<T1, T2, T3>(v, base)) }
  getSResizablePtr64LE<T1, T2, T3>(offset: number, base: ResizableSyncSpan<T1, T2, T3>) { return this.getSInt64LE(offset).map(v => this.resolveResizablePointer<T1, T2, T3>(v, base)) }
  getUResizablePtr64BE<T1, T2, T3>(offset: number, base: ResizableSyncSpan<T1, T2, T3>) { return this.getUInt64BE(offset).map(v => this.resolveResizablePointer<T1, T2, T3>(v, base)) }
  getSResizablePtr64BE<T1, T2, T3>(offset: number, base: ResizableSyncSpan<T1, T2, T3>) { return this.getSInt64BE(offset).map(v => this.resolveResizablePointer<T1, T2, T3>(v, base)) }
  abstract setUBigInt64LE(offset: number, value: bigint): Result<void, ResizeError>;
  abstract setSBigInt64LE(offset: number, value: bigint): Result<void, ResizeError>;
  abstract setUBigInt64BE(offset: number, value: bigint): Result<void, ResizeError>;
  abstract setSBigInt64BE(offset: number, value: bigint): Result<void, ResizeError>;
  abstract setFloat32LE(offset: number, value: number): Result<void, ResizeError>;
  abstract setFloat32BE(offset: number, value: number): Result<void, ResizeError>;
  abstract setFloat64LE(offset: number, value: number): Result<void, ResizeError>;
  abstract setFloat64BE(offset: number, value: number): Result<void, ResizeError>;
  abstract setByteSlice(offset: number, value: ArrayBuffer): Result<void, ResizeError>;
  abstract setString(offset: number, value: string, format: StringEncoding): Result<number, ResizeError>;

  abstract sliceMut(offset: number, length?: number): Result<WritableSyncSpan<ReadError, FlushError>, SliceOutOfBoundsError>;
  abstract sliceResizable(offset: number, length?: number): Result<ResizableSyncSpan<FlushError, ResizeError, ReadError>, SliceOutOfBoundsError>;

  abstract flush(): Future<void, FlushError>;
}

export abstract class ResizableAsyncSpan<FlushError, ResizeError, ReadError> extends AsyncReadableSpan<ReadError> {
  private resolveResizablePointer<T1, T2, T3>(value: number, base: ResizableSyncSpan<T1, T2, T3>): Result<ResizableSyncSpan<T1, T2, T3>, PointOutOfBoundsError> {
    return base
      .sliceResizable(value)
      .mapErr(e => new PointOutOfBoundsError(e.offsetInSlice, e.sliceSize));
  }

  abstract setSize(size: number): Future<void, ResizeError>;

  abstract setUInt8(offset: number, value: number): Result<void, ResizeError>;
  abstract setSInt8(offset: number, value: number): Result<void, ResizeError>;
  getUResizablePtr8<T1, T2, T3>(offset: number, base: ResizableSyncSpan<T1, T2, T3>) { return this.getUInt8(offset).map(v => this.resolveResizablePointer<T1, T2, T3>(v, base)) }
  getSResizablePtr8<T1, T2, T3>(offset: number, base: ResizableSyncSpan<T1, T2, T3>) { return this.getSInt8(offset).map(v => this.resolveResizablePointer<T1, T2, T3>(v, base)) }
  abstract setUInt16LE(offset: number, value: number): Result<void, ResizeError>;
  abstract setSInt16LE(offset: number, value: number): Result<void, ResizeError>;
  abstract setUInt16BE(offset: number, value: number): Result<void, ResizeError>;
  abstract setSInt16BE(offset: number, value: number): Result<void, ResizeError>;
  getUResizablePtr16LE<T1, T2, T3>(offset: number, base: ResizableSyncSpan<T1, T2, T3>) { return this.getUInt16LE(offset).map(v => this.resolveResizablePointer<T1, T2, T3>(v, base)) }
  getSResizablePtr16LE<T1, T2, T3>(offset: number, base: ResizableSyncSpan<T1, T2, T3>) { return this.getSInt16LE(offset).map(v => this.resolveResizablePointer<T1, T2, T3>(v, base)) }
  getUResizablePtr16BE<T1, T2, T3>(offset: number, base: ResizableSyncSpan<T1, T2, T3>) { return this.getUInt16BE(offset).map(v => this.resolveResizablePointer<T1, T2, T3>(v, base)) }
  getSResizablePtr16BE<T1, T2, T3>(offset: number, base: ResizableSyncSpan<T1, T2, T3>) { return this.getSInt16BE(offset).map(v => this.resolveResizablePointer<T1, T2, T3>(v, base)) }
  abstract setUInt32LE(offset: number, value: number): Result<void, ResizeError>;
  abstract setSInt32LE(offset: number, value: number): Result<void, ResizeError>;
  abstract setUInt32BE(offset: number, value: number): Result<void, ResizeError>;
  abstract setSInt32BE(offset: number, value: number): Result<void, ResizeError>;
  getUResizablePtr32LE<T1, T2, T3>(offset: number, base: ResizableSyncSpan<T1, T2, T3>) { return this.getUInt32LE(offset).map(v => this.resolveResizablePointer<T1, T2, T3>(v, base)) }
  getSResizablePtr32LE<T1, T2, T3>(offset: number, base: ResizableSyncSpan<T1, T2, T3>) { return this.getSInt32LE(offset).map(v => this.resolveResizablePointer<T1, T2, T3>(v, base)) }
  getUResizablePtr32BE<T1, T2, T3>(offset: number, base: ResizableSyncSpan<T1, T2, T3>) { return this.getUInt32BE(offset).map(v => this.resolveResizablePointer<T1, T2, T3>(v, base)) }
  getSResizablePtr32BE<T1, T2, T3>(offset: number, base: ResizableSyncSpan<T1, T2, T3>) { return this.getSInt32BE(offset).map(v => this.resolveResizablePointer<T1, T2, T3>(v, base)) }
  abstract setUInt64LE(offset: number, value: number): Result<void, ResizeError>;
  abstract setSInt64LE(offset: number, value: number): Result<void, ResizeError>;
  abstract setUInt64BE(offset: number, value: number): Result<void, ResizeError>;
  abstract setSInt64BE(offset: number, value: number): Result<void, ResizeError>;
  getUResizablePtr64LE<T1, T2, T3>(offset: number, base: ResizableSyncSpan<T1, T2, T3>) { return this.getUInt64LE(offset).map(v => this.resolveResizablePointer<T1, T2, T3>(v, base)) }
  getSResizablePtr64LE<T1, T2, T3>(offset: number, base: ResizableSyncSpan<T1, T2, T3>) { return this.getSInt64LE(offset).map(v => this.resolveResizablePointer<T1, T2, T3>(v, base)) }
  getUResizablePtr64BE<T1, T2, T3>(offset: number, base: ResizableSyncSpan<T1, T2, T3>) { return this.getUInt64BE(offset).map(v => this.resolveResizablePointer<T1, T2, T3>(v, base)) }
  getSResizablePtr64BE<T1, T2, T3>(offset: number, base: ResizableSyncSpan<T1, T2, T3>) { return this.getSInt64BE(offset).map(v => this.resolveResizablePointer<T1, T2, T3>(v, base)) }
  abstract setUBigInt64LE(offset: number, value: bigint): Result<void, ResizeError>;
  abstract setSBigInt64LE(offset: number, value: bigint): Result<void, ResizeError>;
  abstract setUBigInt64BE(offset: number, value: bigint): Result<void, ResizeError>;
  abstract setSBigInt64BE(offset: number, value: bigint): Result<void, ResizeError>;
  abstract setFloat32LE(offset: number, value: number): Result<void, ResizeError>;
  abstract setFloat32BE(offset: number, value: number): Result<void, ResizeError>;
  abstract setFloat64LE(offset: number, value: number): Result<void, ResizeError>;
  abstract setFloat64BE(offset: number, value: number): Result<void, ResizeError>;
  abstract setByteSlice(offset: number, value: ArrayBuffer): Result<void, ResizeError>;
  abstract setString(offset: number, value: string, format: StringEncoding): Result<number, ResizeError>;

  abstract sliceMut(offset: number, length?: number): Result<WritableSyncSpan<ReadError, FlushError>, SliceOutOfBoundsError>;
  abstract sliceResizable(offset: number, length?: number): Result<ResizableSyncSpan<FlushError, ResizeError, ReadError>, SliceOutOfBoundsError>;

  abstract flush(): Future<void, FlushError>;
}