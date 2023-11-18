import { StringEncoding } from "./enums";
import { ArrayBufferUtils } from "./util/arrayBufferUtils";
import { Future } from "./util/future";
import { StringUtils } from "./util/stringUtils";

export abstract class OutOfBoundsError extends Error {
  constructor(
    public readonly offsetInSlice: number,
    public readonly sliceSize: number,
  ) { super(); this.message = this.toString(); }
}

export class ReadOutOfBoundsError extends OutOfBoundsError {
  constructor(
    offsetInSlice: number,
    sliceSize: number,
    public readonly readLength: number,
  ) { super(offsetInSlice, sliceSize); this.message = this.toString(); }

  toString() {
    return `Attempted to read ${this.readLength} bytes at offset ${this.offsetInSlice}, but the file is only ${this.sliceSize} bytes long.`;
  }
}

export class SliceOutOfBoundsError extends OutOfBoundsError {
  constructor(
    offsetInSlice: number,
    sliceSize: number,
    public readonly offsetEndsInSlice?: number,
  ) { super(offsetInSlice, sliceSize); this.message = this.toString(); }

  toString() {
    return `Slice [${this.offsetInSlice} -> ${this.offsetEndsInSlice ?? "..."})s is out of bounds for a file of size ${this.sliceSize}.`;
  }
}

export class PointOutOfBoundsError extends SliceOutOfBoundsError {
  toString() {
    if (this.offsetEndsInSlice === undefined)
      return `Pointer ${this.offsetInSlice} is out of bounds for a file of size ${this.sliceSize}.`;
    else
      return `Sized pointer ${this.offsetInSlice} -> ${this.offsetEndsInSlice} is out of bounds for a file of size ${this.sliceSize}.`;
  }
}

export abstract class ReadableSpan<ReadError> {
  private resolvePointer<T>(value: number, base: ReadableSpan<T>, length?: number): Future<ReadableSpan<T>, PointOutOfBoundsError> {
    return base
      .slice(value, length)
      .mapErr(e => new PointOutOfBoundsError(e.offsetInSlice, e.sliceSize, e.offsetEndsInSlice));
  }

  getUPtr8<T>(offset: number, base: ReadableSpan<T>, length?: number): Future<ReadableSpan<T>, ReadError | ReadOutOfBoundsError | PointOutOfBoundsError> { return this.getUInt8(offset).map(v => this.resolvePointer(v, base, length)) }
  getSPtr8<T>(offset: number, base: ReadableSpan<T>, length?: number): Future<ReadableSpan<T>, ReadError | ReadOutOfBoundsError | PointOutOfBoundsError> { return this.getSInt8(offset).map(v => this.resolvePointer(v, base, length)) }
  getUPtr16LE<T>(offset: number, base: ReadableSpan<T>, length?: number): Future<ReadableSpan<T>, ReadError | ReadOutOfBoundsError | PointOutOfBoundsError> { return this.getUInt16LE(offset).map(v => this.resolvePointer(v, base, length)) }
  getSPtr16LE<T>(offset: number, base: ReadableSpan<T>, length?: number): Future<ReadableSpan<T>, ReadError | ReadOutOfBoundsError | PointOutOfBoundsError> { return this.getSInt16LE(offset).map(v => this.resolvePointer(v, base, length)) }
  getUPtr16BE<T>(offset: number, base: ReadableSpan<T>, length?: number): Future<ReadableSpan<T>, ReadError | ReadOutOfBoundsError | PointOutOfBoundsError> { return this.getUInt16BE(offset).map(v => this.resolvePointer(v, base, length)) }
  getSPtr16BE<T>(offset: number, base: ReadableSpan<T>, length?: number): Future<ReadableSpan<T>, ReadError | ReadOutOfBoundsError | PointOutOfBoundsError> { return this.getSInt16BE(offset).map(v => this.resolvePointer(v, base, length)) }
  getUPtr32LE<T>(offset: number, base: ReadableSpan<T>, length?: number): Future<ReadableSpan<T>, ReadError | ReadOutOfBoundsError | PointOutOfBoundsError> { return this.getUInt32LE(offset).map(v => this.resolvePointer(v, base, length)) }
  getSPtr32LE<T>(offset: number, base: ReadableSpan<T>, length?: number): Future<ReadableSpan<T>, ReadError | ReadOutOfBoundsError | PointOutOfBoundsError> { return this.getSInt32LE(offset).map(v => this.resolvePointer(v, base, length)) }
  getUPtr32BE<T>(offset: number, base: ReadableSpan<T>, length?: number): Future<ReadableSpan<T>, ReadError | ReadOutOfBoundsError | PointOutOfBoundsError> { return this.getUInt32BE(offset).map(v => this.resolvePointer(v, base, length)) }
  getSPtr32BE<T>(offset: number, base: ReadableSpan<T>, length?: number): Future<ReadableSpan<T>, ReadError | ReadOutOfBoundsError | PointOutOfBoundsError> { return this.getSInt32BE(offset).map(v => this.resolvePointer(v, base, length)) }
  getUPtr64LE<T>(offset: number, base: ReadableSpan<T>, length?: number): Future<ReadableSpan<T>, ReadError | ReadOutOfBoundsError | PointOutOfBoundsError> { return this.getUInt64LE(offset).map(v => this.resolvePointer(v, base, length)) }
  getSPtr64LE<T>(offset: number, base: ReadableSpan<T>, length?: number): Future<ReadableSpan<T>, ReadError | ReadOutOfBoundsError | PointOutOfBoundsError> { return this.getSInt64LE(offset).map(v => this.resolvePointer(v, base, length)) }
  getUPtr64BE<T>(offset: number, base: ReadableSpan<T>, length?: number): Future<ReadableSpan<T>, ReadError | ReadOutOfBoundsError | PointOutOfBoundsError> { return this.getUInt64BE(offset).map(v => this.resolvePointer(v, base, length)) }
  getSPtr64BE<T>(offset: number, base: ReadableSpan<T>, length?: number): Future<ReadableSpan<T>, ReadError | ReadOutOfBoundsError | PointOutOfBoundsError> { return this.getSInt64BE(offset).map(v => this.resolvePointer(v, base, length)) }

  abstract getSize(): number;

  abstract getUInt8(offset: number): Future<number, ReadOutOfBoundsError | ReadError>;
  abstract getSInt8(offset: number): Future<number, ReadOutOfBoundsError | ReadError>;
  abstract getUInt16LE(offset: number): Future<number, ReadOutOfBoundsError | ReadError>;
  abstract getSInt16LE(offset: number): Future<number, ReadOutOfBoundsError | ReadError>;
  abstract getUInt16BE(offset: number): Future<number, ReadOutOfBoundsError | ReadError>;
  abstract getSInt16BE(offset: number): Future<number, ReadOutOfBoundsError | ReadError>;
  abstract getUInt32LE(offset: number): Future<number, ReadOutOfBoundsError | ReadError>;
  abstract getSInt32LE(offset: number): Future<number, ReadOutOfBoundsError | ReadError>;
  abstract getUInt32BE(offset: number): Future<number, ReadOutOfBoundsError | ReadError>;
  abstract getSInt32BE(offset: number): Future<number, ReadOutOfBoundsError | ReadError>;
  abstract getUInt64LE(offset: number): Future<number, ReadOutOfBoundsError | ReadError>;
  abstract getSInt64LE(offset: number): Future<number, ReadOutOfBoundsError | ReadError>;
  abstract getUInt64BE(offset: number): Future<number, ReadOutOfBoundsError | ReadError>;
  abstract getSInt64BE(offset: number): Future<number, ReadOutOfBoundsError | ReadError>;
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
      .map(v => {
        const str = StringUtils.decode(v, format);
        return str.map(s => ({ value: s, bytesRead: v.byteLength }))
      });
  }

  abstract slice(offset: number, length?: number): Future<ReadableSpan<ReadError>, SliceOutOfBoundsError>;
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

export abstract class WritableSpan<FlushError, ReadError, WriteError> extends ReadableSpan<ReadError> {
  private resolveMutablePointer<T1, T2, T3>(value: number, base: WritableSpan<T1, T2, T3>, length?: number): Future<WritableSpan<T1, T2, T3>, PointOutOfBoundsError> {
    return base
      .sliceMut(value, length)
      .mapErr(e => new PointOutOfBoundsError(e.offsetInSlice, e.sliceSize, e.offsetEndsInSlice));
  }

  getUMutPtr8<T1, T2, T3>(offset: number, base: WritableSpan<T1, T2, T3>, length?: number) { return this.getUInt8(offset).map(v => this.resolveMutablePointer(v, base, length)) }
  getSMutPtr8<T1, T2, T3>(offset: number, base: WritableSpan<T1, T2, T3>, length?: number) { return this.getSInt8(offset).map(v => this.resolveMutablePointer(v, base, length)) }
  getUMutPtr16LE<T1, T2, T3>(offset: number, base: WritableSpan<T1, T2, T3>, length?: number) { return this.getUInt16LE(offset).map(v => this.resolveMutablePointer(v, base, length)) }
  getSMutPtr16LE<T1, T2, T3>(offset: number, base: WritableSpan<T1, T2, T3>, length?: number) { return this.getSInt16LE(offset).map(v => this.resolveMutablePointer(v, base, length)) }
  getUMutPtr16BE<T1, T2, T3>(offset: number, base: WritableSpan<T1, T2, T3>, length?: number) { return this.getUInt16BE(offset).map(v => this.resolveMutablePointer(v, base, length)) }
  getSMutPtr16BE<T1, T2, T3>(offset: number, base: WritableSpan<T1, T2, T3>, length?: number) { return this.getSInt16BE(offset).map(v => this.resolveMutablePointer(v, base, length)) }
  getUMutPtr32LE<T1, T2, T3>(offset: number, base: WritableSpan<T1, T2, T3>, length?: number) { return this.getUInt32LE(offset).map(v => this.resolveMutablePointer(v, base, length)) }
  getSMutPtr32LE<T1, T2, T3>(offset: number, base: WritableSpan<T1, T2, T3>, length?: number) { return this.getSInt32LE(offset).map(v => this.resolveMutablePointer(v, base, length)) }
  getUMutPtr32BE<T1, T2, T3>(offset: number, base: WritableSpan<T1, T2, T3>, length?: number) { return this.getUInt32BE(offset).map(v => this.resolveMutablePointer(v, base, length)) }
  getSMutPtr32BE<T1, T2, T3>(offset: number, base: WritableSpan<T1, T2, T3>, length?: number) { return this.getSInt32BE(offset).map(v => this.resolveMutablePointer(v, base, length)) }
  getUMutPtr64LE<T1, T2, T3>(offset: number, base: WritableSpan<T1, T2, T3>, length?: number) { return this.getUInt64LE(offset).map(v => this.resolveMutablePointer(v, base, length)) }
  getSMutPtr64LE<T1, T2, T3>(offset: number, base: WritableSpan<T1, T2, T3>, length?: number) { return this.getSInt64LE(offset).map(v => this.resolveMutablePointer(v, base, length)) }
  getUMutPtr64BE<T1, T2, T3>(offset: number, base: WritableSpan<T1, T2, T3>, length?: number) { return this.getUInt64BE(offset).map(v => this.resolveMutablePointer(v, base, length)) }
  getSMutPtr64BE<T1, T2, T3>(offset: number, base: WritableSpan<T1, T2, T3>, length?: number) { return this.getSInt64BE(offset).map(v => this.resolveMutablePointer(v, base, length)) }

  abstract setUInt8(offset: number, value: number): Future<void, WriteOutOfBoundsError | WriteError>;
  abstract setSInt8(offset: number, value: number): Future<void, WriteOutOfBoundsError | WriteError>;
  abstract setUInt16LE(offset: number, value: number): Future<void, WriteOutOfBoundsError | WriteError>;
  abstract setSInt16LE(offset: number, value: number): Future<void, WriteOutOfBoundsError | WriteError>;
  abstract setUInt16BE(offset: number, value: number): Future<void, WriteOutOfBoundsError | WriteError>;
  abstract setSInt16BE(offset: number, value: number): Future<void, WriteOutOfBoundsError | WriteError>;
  abstract setUInt32LE(offset: number, value: number): Future<void, WriteOutOfBoundsError | WriteError>;
  abstract setSInt32LE(offset: number, value: number): Future<void, WriteOutOfBoundsError | WriteError>;
  abstract setUInt32BE(offset: number, value: number): Future<void, WriteOutOfBoundsError | WriteError>;
  abstract setSInt32BE(offset: number, value: number): Future<void, WriteOutOfBoundsError | WriteError>;
  abstract setUInt64LE(offset: number, value: number): Future<void, WriteOutOfBoundsError | WriteError>;
  abstract setSInt64LE(offset: number, value: number): Future<void, WriteOutOfBoundsError | WriteError>;
  abstract setUInt64BE(offset: number, value: number): Future<void, WriteOutOfBoundsError | WriteError>;
  abstract setSInt64BE(offset: number, value: number): Future<void, WriteOutOfBoundsError | WriteError>;
  abstract setUBigInt64LE(offset: number, value: bigint): Future<void, WriteOutOfBoundsError | WriteError>;
  abstract setSBigInt64LE(offset: number, value: bigint): Future<void, WriteOutOfBoundsError | WriteError>;
  abstract setUBigInt64BE(offset: number, value: bigint): Future<void, WriteOutOfBoundsError | WriteError>;
  abstract setSBigInt64BE(offset: number, value: bigint): Future<void, WriteOutOfBoundsError | WriteError>;
  abstract setFloat32LE(offset: number, value: number): Future<void, WriteOutOfBoundsError | WriteError>;
  abstract setFloat32BE(offset: number, value: number): Future<void, WriteOutOfBoundsError | WriteError>;
  abstract setFloat64LE(offset: number, value: number): Future<void, WriteOutOfBoundsError | WriteError>;
  abstract setFloat64BE(offset: number, value: number): Future<void, WriteOutOfBoundsError | WriteError>;
  abstract setByteSlice(offset: number, value: DataView): Future<void, WriteOutOfBoundsError | WriteError>;

  setString(offset: number, value: string, format: StringEncoding): Future<number, WriteOutOfBoundsError | WriteError> {
    const encoded = StringUtils.encode(value, format);

    return this
      .setByteSlice(offset, encoded)
      .map(() => encoded.byteLength);
  }
  
  abstract sliceMut(offset: number, length?: number): Future<WritableSpan<FlushError, ReadError, WriteError>, SliceOutOfBoundsError>;

  abstract flush(): Future<void, FlushError>;
}

export abstract class ResizableSpan<FlushError, ResizeError, ReadError, WriteError> extends ReadableSpan<ReadError> {
  abstract setSize(size: number): Future<void, ResizeError>;

  abstract setUInt8(offset: number, value: number): Future<void, ResizeError | WriteError>;
  abstract setSInt8(offset: number, value: number): Future<void, ResizeError | WriteError>;
  abstract setUInt16LE(offset: number, value: number): Future<void, ResizeError | WriteError>;
  abstract setSInt16LE(offset: number, value: number): Future<void, ResizeError | WriteError>;
  abstract setUInt16BE(offset: number, value: number): Future<void, ResizeError | WriteError>;
  abstract setSInt16BE(offset: number, value: number): Future<void, ResizeError | WriteError>;
  abstract setUInt32LE(offset: number, value: number): Future<void, ResizeError | WriteError>;
  abstract setSInt32LE(offset: number, value: number): Future<void, ResizeError | WriteError>;
  abstract setUInt32BE(offset: number, value: number): Future<void, ResizeError | WriteError>;
  abstract setSInt32BE(offset: number, value: number): Future<void, ResizeError | WriteError>;
  abstract setUInt64LE(offset: number, value: number): Future<void, ResizeError | WriteError>;
  abstract setSInt64LE(offset: number, value: number): Future<void, ResizeError | WriteError>;
  abstract setUInt64BE(offset: number, value: number): Future<void, ResizeError | WriteError>;
  abstract setSInt64BE(offset: number, value: number): Future<void, ResizeError | WriteError>;
  abstract setUBigInt64LE(offset: number, value: bigint): Future<void, ResizeError | WriteError>;
  abstract setSBigInt64LE(offset: number, value: bigint): Future<void, ResizeError | WriteError>;
  abstract setUBigInt64BE(offset: number, value: bigint): Future<void, ResizeError | WriteError>;
  abstract setSBigInt64BE(offset: number, value: bigint): Future<void, ResizeError | WriteError>;
  abstract setFloat32LE(offset: number, value: number): Future<void, ResizeError | WriteError>;
  abstract setFloat32BE(offset: number, value: number): Future<void, ResizeError | WriteError>;
  abstract setFloat64LE(offset: number, value: number): Future<void, ResizeError | WriteError>;
  abstract setFloat64BE(offset: number, value: number): Future<void, ResizeError | WriteError>;
  abstract setByteSlice(offset: number, value: DataView): Future<void, ResizeError | WriteError>;

  setString(offset: number, value: string, format: StringEncoding): Future<number, ResizeError | WriteError> {
    const encoded = StringUtils.encode(value, format);

    return this
      .setByteSlice(offset, encoded)
      .map(() => encoded.byteLength);
  }

  abstract sliceMut(offset: number, length?: number): Future<WritableSpan<ReadError, FlushError, ResizeError | WriteError>, SliceOutOfBoundsError>;

  abstract flush(): Future<void, FlushError>;
}